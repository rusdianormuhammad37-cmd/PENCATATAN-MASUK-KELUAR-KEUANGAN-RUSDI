const supabaseUrl = 'https://onssvkrjtoqxzdvjbeob.supabase.co';
const supabaseKey = 'sb_publishable_YXYOrvgDRHCxKJ1eorzmjg_1dcrPMmi';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let transactions = []; let categories = []; let budgets = []; let savingsGoals = [];
let charityRecords = []; let debts = []; let wallets = [];
let currentUser = null; let editingTransactionId = null; let dashboardChart = null; 
let isBalanceHidden = false; let userProfileData = { full_name: '', phone: '', job: '', address: '', avatar_url: '' };
let currentRekapTab = 'daily';

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const icon = document.querySelector('#themeToggleBtn i');
    if (icon) icon.className = isDark ? 'fa-solid fa-sun text-lg text-amber-400' : 'fa-solid fa-moon text-lg';
}

function checkVvipStatus() { if (localStorage.getItem('is_vvip_unlocked') === 'true') document.body.classList.add('is-vvip'); }

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
        const icon = document.querySelector('#themeToggleBtn i');
        if(icon) icon.className = 'fa-solid fa-sun text-lg text-amber-400';
    }
    if (window.innerWidth >= 1024) document.getElementById('sidebar').classList.remove('-translate-x-full');
    checkVvipStatus();
});

async function activateVvipCode() {
    if (localStorage.getItem('is_vvip_unlocked') === 'true') return await showCustomModal({ title: "Sudah Terbuka", message: "Akses VVIP Anda sudah aktif. Nikmati fitur eksklusifnya!" });
    const inputCode = await showCustomModal({ title: "Akses Eksklusif VVIP", message: "Masukkan kode rahasia VVIP untuk membuka tampilan elit dan fitur eksklusif:", isPrompt: true, placeholder: "Ketik kode di sini..." });
    if (!inputCode) return;
    if (inputCode.trim().toUpperCase() === "RUSDIPINTAR") {
        localStorage.setItem('is_vvip_unlocked', 'true'); document.body.classList.add('is-vvip');
        await showCustomModal({ title: "Akses Diberikan!", message: "Selamat! Anda sekarang resmi menjadi member VVIP NgaturDuit." });
        switchPage('home');
    } else { await showCustomModal({ title: "Kode Salah", message: "Kode akses yang Anda masukkan tidak valid." }); }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar'); 
    const overlay = document.getElementById('mobileSidebarOverlay');
    const isDesktop = window.innerWidth >= 1024;

    if (isDesktop) {
        // Transisi halus untuk Desktop (Collapse/Expand)
        sidebar.classList.toggle('lg:-translate-x-full');
        sidebar.classList.toggle('lg:opacity-0');
    } else {
        // Transisi halus untuk Mobile (Slide in/out)
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full'); 
            overlay.classList.remove('hidden'); 
            setTimeout(() => overlay.classList.add('opacity-100'), 10);
        } else {
            sidebar.classList.add('-translate-x-full'); 
            overlay.classList.remove('opacity-100'); 
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }
}
db.auth.onAuthStateChange((event, session) => {
    if (session) { currentUser = session.user; document.getElementById('authContainer').classList.add('hidden'); document.getElementById('mainApp').classList.remove('hidden'); init(); } else { currentUser = null; document.getElementById('authContainer').classList.remove('hidden'); document.getElementById('mainApp').classList.add('hidden'); transactions = []; categories = []; budgets = []; savingsGoals = []; charityRecords = []; debts = []; wallets = []; }
});

async function handleAuth(actionType) {
    const email = document.getElementById('authEmail').value; const password = document.getElementById('authPassword').value;
    if (!email || !password) return alert("Harap isi email dan password!");
    const btn = document.querySelector(`button[onclick="handleAuth('${actionType}')"]`); const originalText = btn.innerText; btn.innerText = "Memproses...";
    try { if (actionType === 'login') await db.auth.signInWithPassword({ email, password }); else if (actionType === 'register') await db.auth.signUp({ email, password }); } catch (err) { alert("Gagal memproses otentikasi."); } finally { btn.innerText = originalText; }
}
async function handleLogout() { await db.auth.signOut(); }

function switchPage(page) {
    if (['debt', 'savings', 'charity'].includes(page) && localStorage.getItem('is_vvip_unlocked') !== 'true') return showCustomModal({title: "Akses Terkunci", message: "Fitur ini khusus member VVIP. Buka kuncinya di menu Profil."});
    const pages = ['home', 'category', 'masterCategory', 'report', 'charity', 'savings', 'profile', 'debt'];
    const pageTitles = { home: "Dashboard Finansial", category: "Statistik & Rekap", masterCategory: "Master Kategori", report: "Laporan Laba Rugi", charity: "Catatan Sedekah", savings: "Target Impian", profile: "Profil Akses", debt: "Utang & Piutang" };
    pages.forEach(p => { const el = document.getElementById(`page-${p}`); if (el) { el.classList.add('hidden'); el.classList.remove('flex'); } });
    const activeEl = document.getElementById(`page-${page}`); if (activeEl) { activeEl.classList.remove('hidden'); activeEl.classList.add('flex'); }
    document.getElementById('pageTitleHeader').innerText = pageTitles[page] || "Dashboard";
    pages.forEach(p => { const sideEl = document.getElementById(`side-${p}`); if (sideEl) { sideEl.className = p === page ? "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left font-bold text-sm transition-all sidebar-active" : "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left font-bold text-sm transition-all sidebar-inactive"; if(p === 'debt') sideEl.innerHTML = `<i class="fa-solid fa-handshake w-5 text-center text-lg"></i> Utang & Piutang <span class="absolute right-3 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">!</span>`; } });
    if(window.innerWidth < 1024) { document.getElementById('sidebar').classList.add('-translate-x-full'); document.getElementById('mobileSidebarOverlay').classList.remove('opacity-100'); setTimeout(() => document.getElementById('mobileSidebarOverlay').classList.add('hidden'), 300); }
    if (page === 'profile') updateProfilePage(); if (page === 'savings') renderSavingsPage(); if (page === 'charity') renderCharityPage(); if (page === 'debt') { renderDebtPage(); const dd = document.getElementById('debtDueDate'); if (dd && !dd.value) dd.valueAsDate = new Date(); }
}

function openModalWithParam(type) { document.querySelector(`input[name="type"][value="${type}"]`).checked = true; updateCategoryOptions(); openModal(); }
function formatRupiah(number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number); }
function parseRupiah(str) { return parseInt(str.replace(/[^,\d]/g, ''), 10) || 0; }
function formatRupiahInput(input) { let val = input.value.replace(/[^,\d]/g, ''); if (val) input.value = new Intl.NumberFormat('id-ID').format(parseInt(val, 10)); else input.value = ''; }
function getCategoryName(categoryId) { if (!categoryId) return 'Tanpa Kategori'; const cat = categories.find(c => c.id === categoryId); return cat ? cat.name : 'Terhapus'; }

// SISTEM WARNA KATEGORI BERAGAM
function getCategoryStyle(catName) {
    const name = (catName || '').toLowerCase();
    if (name.includes('makan') || name.includes('minum') || name.includes('jajan')) return { i: 'fa-utensils', c: 'text-orange-500', b: 'bg-orange-100 dark:bg-orange-900/30' };
    if (name.includes('transport') || name.includes('bensin') || name.includes('tol')) return { i: 'fa-car-side', c: 'text-blue-500', b: 'bg-blue-100 dark:bg-blue-900/30' };
    if (name.includes('gaji') || name.includes('pemasukan') || name.includes('bonus')) return { i: 'fa-money-bill-wave', c: 'text-emerald-500', b: 'bg-emerald-100 dark:bg-emerald-900/30' };
    if (name.includes('listrik') || name.includes('tagihan') || name.includes('air') || name.includes('internet')) return { i: 'fa-bolt', c: 'text-yellow-500', b: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (name.includes('belanja') || name.includes('baju') || name.includes('skincare')) return { i: 'fa-bag-shopping', c: 'text-pink-500', b: 'bg-pink-100 dark:bg-pink-900/30' };
    if (name.includes('sehat') || name.includes('obat') || name.includes('dokter')) return { i: 'fa-notes-medical', c: 'text-red-500', b: 'bg-red-100 dark:bg-red-900/30' };
    if (name.includes('hiburan') || name.includes('main') || name.includes('nonton') || name.includes('game')) return { i: 'fa-gamepad', c: 'text-purple-500', b: 'bg-purple-100 dark:bg-purple-900/30' };
    if (name.includes('sedekah') || name.includes('amal') || name.includes('zakat')) return { i: 'fa-hand-holding-heart', c: 'text-teal-500', b: 'bg-teal-100 dark:bg-teal-900/30' };
    return { i: 'fa-tag', c: 'text-indigo-500', b: 'bg-indigo-100 dark:bg-indigo-900/30' }; 
}

function toggleBalanceVisibility() { isBalanceHidden = !isBalanceHidden; const eyeIcon = document.getElementById('toggleEyeIcon'); if (isBalanceHidden) { eyeIcon.classList.replace('fa-eye', 'fa-eye-slash'); } else { eyeIcon.classList.replace('fa-eye-slash', 'fa-eye'); } applyFilter(); }

async function init() {
    if (!currentUser) return;
    const dateInput = document.getElementById('date'); if (dateInput) dateInput.valueAsDate = new Date();
    const filterMonth = document.getElementById('filterMonth'); if(filterMonth) { const today = new Date(); filterMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; }
    try {
        await fetchUserProfile();
        const catRes = await db.from('categories').select('*').eq('user_id', currentUser.id);
        if (catRes.data && catRes.data.length > 0) { categories = catRes.data; } else {
            const defaultCats = [ { name: 'Gaji Bulanan', type: 'income', user_id: currentUser.id }, { name: 'Makan & Minum', type: 'expense', user_id: currentUser.id } ];
            const insertDefault = await db.from('categories').insert(defaultCats).select(); if (insertDefault.data) categories = insertDefault.data;
        }
        const txRes = await db.from('transactions').select('*').eq('user_id', currentUser.id); if (txRes.data) transactions = txRes.data;
        const budgetRes = await db.from('budgets').select('*').eq('user_id', currentUser.id); if (budgetRes.data) budgets = budgetRes.data;
        const savingsRes = await db.from('savings_goals').select('*').eq('user_id', currentUser.id); if (savingsRes.data) savingsGoals = savingsRes.data;
        const charityRes = await db.from('charity_records').select('*').eq('user_id', currentUser.id); if (charityRes.data) charityRecords = charityRes.data;
        const debtRes = await db.from('debts').select('*').eq('user_id', currentUser.id); if (debtRes.data) debts = debtRes.data;
        const walletRes = await db.from('wallets').select('*').eq('user_id', currentUser.id); if (walletRes.data) wallets = walletRes.data;
        renderWalletCards(); updateWalletOptions();
    } catch (err) { console.error("Error init:", err); }
    updateCategoryOptions(); renderMasterCategories(); applyFilter();
}

async function fetchUserProfile() {
    if (!currentUser) return;
    try {
        const { data } = await db.from('profiles').select('*').eq('user_id', currentUser.id).single();
        if (data) { userProfileData = data; document.getElementById('profileFullName').value = data.full_name || ''; document.getElementById('profilePhone').value = data.phone || ''; document.getElementById('profileJob').value = data.job || ''; document.getElementById('profileAddress').value = data.address || ''; updateHeaderDisplay(data.full_name, data.avatar_url); } else { updateHeaderDisplay('', ''); }
    } catch (err) { updateHeaderDisplay('', ''); }
}

function updateHeaderDisplay(fullName, avatarUrl) {
    const displayName = fullName && fullName.trim() !== '' ? fullName : currentUser.email.split('@')[0];
    const displayAvatar = avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.email)}`;
    document.getElementById('headerName').innerText = displayName; document.getElementById('sidebarName').innerText = displayName;
    document.getElementById('profileHeaderName').innerText = displayName; document.getElementById('headerAvatar').src = displayAvatar;
    document.getElementById('sidebarAvatar').src = displayAvatar; document.getElementById('profileAvatarLarge').src = displayAvatar;
}

let cropperImage = new Image(); let currentZoom = 1; let imageOffsetX = 0; let imageOffsetY = 0; let isDragging = false; let startX, startY;
function initImageCropper(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            cropperImage.src = e.target.result;
            cropperImage.onload = function() {
                const canvas = document.getElementById('cropCanvas'); const size = canvas.width;
                const scaleX = size / cropperImage.width; const scaleY = size / cropperImage.height;
                const baseZoom = Math.max(scaleX, scaleY);
                currentZoom = baseZoom; imageOffsetX = 0; imageOffsetY = 0;
                const zoomSlider = document.getElementById('zoomRange'); if (zoomSlider) { zoomSlider.min = baseZoom * 0.5; zoomSlider.max = baseZoom * 3; zoomSlider.value = baseZoom; }
                document.getElementById('cropContainer').classList.remove('hidden'); drawCroppedCanvas();
            }
        }; reader.readAsDataURL(input.files[0]);
    }
}
function drawCroppedCanvas() {
    const canvas = document.getElementById('cropCanvas'); if (!canvas) return; const ctx = canvas.getContext('2d'); const size = canvas.width;
    ctx.clearRect(0, 0, size, size); ctx.save(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    const scaledWidth = cropperImage.width * currentZoom; const scaledHeight = cropperImage.height * currentZoom;
    const x = (size - scaledWidth) / 2 + imageOffsetX; const y = (size - scaledHeight) / 2 + imageOffsetY;
    ctx.drawImage(cropperImage, x, y, scaledWidth, scaledHeight); ctx.restore();
    const finalBase64 = canvas.toDataURL('image/jpeg', 0.9);
    document.getElementById('profileAvatarLarge').src = finalBase64; document.getElementById('headerAvatar').src = finalBase64; document.getElementById('sidebarAvatar').src = finalBase64;
}
function adjustZoom(val) { currentZoom = parseFloat(val); drawCroppedCanvas(); }
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('cropCanvas');
    if (canvas) { canvas.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - imageOffsetX; startY = e.clientY - imageOffsetY; }); window.addEventListener('mousemove', (e) => { if (!isDragging) return; imageOffsetX = e.clientX - startX; imageOffsetY = e.clientY - startY; drawCroppedCanvas(); }); window.addEventListener('mouseup', () => { isDragging = false; }); }
});
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return;
        try {
            const full_name = document.getElementById('profileFullName').value.trim(); const phone = document.getElementById('profilePhone').value.trim(); const job = document.getElementById('profileJob').value.trim(); const address = document.getElementById('profileAddress').value.trim();
            let avatar_url = userProfileData.avatar_url || ''; const fileInput = document.getElementById('profileImageFile');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0]; const fileName = `${currentUser.id}_${Math.random()}.${file.name.split('.').pop()}`;
                const { error: uploadError } = await db.storage.from('avatars').upload(fileName, file, { upsert: true }); if (uploadError) throw uploadError;
                const { data: publicUrlData } = db.storage.from('avatars').getPublicUrl(fileName); if (publicUrlData) avatar_url = publicUrlData.publicUrl;
            }
            const payload = { user_id: currentUser.id, full_name, avatar_url, phone, job, address, updated_at: new Date() };
            const { data: existing } = await db.from('profiles').select('id').eq('user_id', currentUser.id).single();
            if (existing) { const { error } = await db.from('profiles').update(payload).eq('user_id', currentUser.id); if (error) throw error; } else { const { error } = await db.from('profiles').insert([payload]); if (error) throw error; }
            userProfileData = payload; updateHeaderDisplay(full_name, avatar_url); const cropContainer = document.getElementById('cropContainer'); if(cropContainer) cropContainer.classList.add('hidden');
            await showCustomModal({ title: "Profil Berhasil Diperbarui", message: "Perubahan data profil dan foto Anda telah disimpan." });
        } catch (err) { await showCustomModal({ title: "Gagal Menyimpan", message: err.message }); }
    });
}
function updateProfilePage() { if (!currentUser) return; document.getElementById('profileEmailSubtitle').innerText = currentUser.email; }

function renderMasterCategories() {
    const listEl = document.getElementById('masterCategoryList'); if (!listEl) return; listEl.innerHTML = '';
    const searchVal = (document.getElementById('searchMasterCategory')?.value || '').toLowerCase();
    
    // 1. Cari kategori yang cocok dengan kata kunci
    const filteredCats = categories.filter(c => c.name.toLowerCase().includes(searchVal));
    const matchedCategoryIds = filteredCats.map(c => c.id);

    // 2. Cari transaksi yang deskripsinya atau kategorinya cocok dengan kata kunci pencarian
    const matchedTransactions = transactions.filter(t => {
        const catName = getCategoryName(t.category_id).toLowerCase();
        const desc = (t.description || '').toLowerCase();
        return catName.includes(searchVal) || desc.includes(searchVal);
    });

    if (matchedTransactions.length > 0 && searchVal.trim() !== '') {
        // Jika ada transaksi yang cocok (misal: mengetik "makan", muncul catatan "Nasi Padang", "Bakso", dll)
        listEl.innerHTML += `<tr class="bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30"><td colspan="3" class="px-5 py-3 text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase"><i class="fa-solid fa-receipt mr-1"></i> Riwayat Transaksi / Catatan untuk "${searchVal}"</td></tr>`;
        
        matchedTransactions.forEach(t => {
            const catName = getCategoryName(t.category_id);
            const style = getCategoryStyle(catName);
            const badgeColor = t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600';
            
            listEl.innerHTML += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td class="px-5 py-3 font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${style.b} ${style.c} flex items-center justify-center shrink-0">
                            <i class="fa-solid ${style.i} text-xs"></i>
                        </div>
                        <div>
                            <span class="text-xs text-slate-400 block">${catName}</span>
                            <span class="text-sm font-extrabold text-slate-800 dark:text-white">${t.description || 'Tanpa Catatan'}</span>
                        </div>
                    </td>
                    <td class="px-5 py-3">
                        <span class="px-2.5 py-1 ${badgeColor} text-[10px] rounded-md font-bold">${formatRupiah(t.amount)}</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                        <button onclick="editTx('${t.id}')" class="text-slate-400 hover:text-indigo-500 p-2"><i class="fa-solid fa-pen-to-square"></i></button>
                    </td>
                </tr>`;
        });
    } else {
        // Tampilan standar pengelompokan kategori jika tidak sedang mencari spesifik catatan
        const incCats = filteredCats.filter(c => c.type === 'income');
        const expCats = filteredCats.filter(c => c.type === 'expense');

        if (incCats.length > 0) {
            listEl.innerHTML += `<tr class="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30"><td colspan="3" class="px-5 py-3 text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase"><i class="fa-solid fa-arrow-trend-up mr-1"></i> Kelompok Pemasukan</td></tr>`;
            incCats.forEach(cat => {
                const style = getCategoryStyle(cat.name);
                listEl.innerHTML += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><td class="px-5 py-3 font-bold text-slate-800 dark:text-white flex items-center gap-3"><div class="w-8 h-8 rounded-full ${style.b} ${style.c} flex items-center justify-center"><i class="fa-solid ${style.i} text-xs"></i></div>${cat.name}</td><td class="px-5 py-3"><span class="px-2 py-1 bg-emerald-100 text-emerald-600 text-[10px] rounded-md font-bold">Pemasukan</span></td><td class="px-5 py-3 text-center"><button onclick="deleteCategory('${cat.id}')" class="text-slate-400 hover:text-red-500 p-2"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
            });
        }

        if (expCats.length > 0) {
            listEl.innerHTML += `<tr class="bg-rose-50/50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/30"><td colspan="3" class="px-5 py-3 text-[10px] font-black tracking-widest text-rose-600 dark:text-rose-400 uppercase"><i class="fa-solid fa-arrow-trend-down mr-1"></i> Kelompok Pengeluaran</td></tr>`;
            expCats.forEach(cat => {
                const style = getCategoryStyle(cat.name);
                listEl.innerHTML += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><td class="px-5 py-3 font-bold text-slate-800 dark:text-white flex items-center gap-3"><div class="w-8 h-8 rounded-full ${style.b} ${style.c} flex items-center justify-center"><i class="fa-solid ${style.i} text-xs"></i></div>${cat.name}</td><td class="px-5 py-3"><span class="px-2 py-1 bg-rose-100 text-rose-600 text-[10px] rounded-md font-bold">Pengeluaran</span></td><td class="px-5 py-3 text-center"><button onclick="deleteCategory('${cat.id}')" class="text-slate-400 hover:text-red-500 p-2"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
            });
        }
    }

    if (filteredCats.length === 0 && matchedTransactions.length === 0) {
        listEl.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-xs text-slate-400">Data tidak ditemukan.</td></tr>`;
    }
}

const categoryForm = document.getElementById('categoryForm');
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const name = document.getElementById('newCategoryName').value.trim(); const type = document.getElementById('newCategoryType').value;
        const { data, error } = await db.from('categories').insert([{ name, type, user_id: currentUser.id }]).select();
        if (data) { categories.push(data[0]); document.getElementById('newCategoryName').value = ''; renderMasterCategories(); updateCategoryOptions(); applyFilter(); }
    });
}
async function deleteCategory(id) {
    if (transactions.some(t => t.category_id === id)) { await showCustomModal({ title: "Perhatian", message: "Kategori sedang digunakan oleh transaksi." }); return; }
    const confirmed = await showCustomModal({ title: "Hapus Kategori", message: "Hapus kategori ini dari master data?" });
    if (confirmed) { await db.from('categories').delete().eq('id', id); categories = categories.filter(c => c.id !== id); renderMasterCategories(); updateCategoryOptions(); }
}
function updateCategoryOptions() {
    const typeEl = document.querySelector('input[name="type"]:checked'); if (!typeEl) return;
    const catSelect = document.getElementById('category'); if (!catSelect) return; catSelect.innerHTML = '';
    categories.filter(c => c.type === typeEl.value).forEach(cat => catSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`);
}

function updateWalletOptions() {
    const select = document.getElementById('walletSelect'); if (!select) return; select.innerHTML = '';
    if (wallets.length === 0) { select.innerHTML = `<option value="">Belum ada dompet</option>`; return; }
    wallets.forEach(w => { select.innerHTML += `<option value="${w.id}">${w.name} (${formatRupiah(w.balance)})</option>`; });
}
function renderWalletCards() {
    const container = document.getElementById('walletCardList'); if (!container) return; container.innerHTML = '';
    if (wallets.length === 0) { container.innerHTML = `<p class="text-xs text-slate-400 col-span-full py-6 text-center">Belum ada dompet terdaftar.</p>`; return; }
    wallets.forEach(w => {
        container.innerHTML += `<div class="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] border border-slate-700/80 p-6 rounded-[1.5rem] flex flex-col justify-between shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] relative overflow-hidden group hover:scale-[1.02] transition-all"><div class="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500 rounded-full blur-[50px] opacity-25 pointer-events-none"></div><div class="absolute right-6 top-6 text-amber-400/20 text-3xl pointer-events-none"><i class="fa-solid fa-microchip"></i></div><div class="relative z-10 flex justify-between items-start"><div><span class="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-md vvip-feature vvip-feature-inline">VVIP Card</span><h4 class="font-extrabold text-white text-lg mt-3 tracking-wide">${w.name}</h4></div><button onclick="deleteWallet('${w.id}')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 flex items-center justify-center transition-colors" title="Hapus Dompet"><i class="fa-solid fa-trash-can text-xs"></i></button></div><div class="mt-8 pt-4 border-t border-slate-700/60 relative z-10 flex justify-between items-end"><div><span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Saldo Tersedia</span><span class="font-black text-amber-300 text-xl tracking-tight">${formatRupiah(w.balance)}</span></div><div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70"><i class="fa-solid fa-wallet text-xs"></i></div></div></div>`;
    });
}
function openWalletModal() { const m = document.getElementById('walletModal'); m.classList.remove('hidden'); setTimeout(() => { m.classList.add('opacity-100'); document.getElementById('walletModalContent').classList.replace('scale-95', 'scale-100'); }, 10); }
function closeWalletModal() { const m = document.getElementById('walletModal'); m.classList.remove('opacity-100'); document.getElementById('walletModalContent').classList.replace('scale-100', 'scale-95'); setTimeout(() => m.classList.add('hidden'), 300); }
async function submitWalletForm() {
    if (!currentUser) return;
    const name = document.getElementById('walletNameInput').value.trim(); const balance = parseRupiah(document.getElementById('walletBalanceInput').value);
    if (!name) return alert("Nama dompet harus diisi!");
    const { data, error } = await db.from('wallets').insert([{ name, balance, user_id: currentUser.id }]).select();
    if (data && data.length > 0) { wallets.push(data[0]); renderWalletCards(); updateWalletOptions(); closeWalletModal(); applyFilter(); }
}
async function deleteWallet(id) { const confirmed = await showCustomModal({ title: "Hapus Dompet", message: "Hapus dompet ini?" }); if (confirmed) { await db.from('wallets').delete().eq('id', id); wallets = wallets.filter(w => w.id !== id); renderWalletCards(); updateWalletOptions(); applyFilter(); } }

function updateSummary(filtered) {
    let totalBalance = 0; wallets.forEach(w => totalBalance += Number(w.balance));
    let inc = 0; let exp = 0; filtered.forEach(t => { if (t.type === 'income') inc += Number(t.amount); else exp += Number(t.amount); });

    let totalPiutang = 0; let piutangUnpaid = 0; let piutangOverdue = 0;
    let totalUtang = 0; let utangUnpaid = 0; let utangOverdue = 0; const today = new Date();
    
    let latestPiutangText = "Belum ada piutang aktif."; let latestUtangText = "Belum ada utang aktif.";

    debts.forEach(d => {
        if(d.status === 'unpaid') {
            const isOverdue = new Date(d.due_date) < today;
            const formattedDate = new Date(d.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const infoText = `<span class="font-bold text-slate-700 dark:text-slate-300">${d.person_name}</span> (${formatRupiah(d.amount)})<br><span class="text-[10px] text-slate-400">Tempo: ${formattedDate}</span>`;
            if(d.type === 'receivable') { totalPiutang += Number(d.amount); piutangUnpaid++; if(isOverdue) piutangOverdue++; latestPiutangText = infoText; } 
            else { totalUtang += Number(d.amount); utangUnpaid++; if(isOverdue) utangOverdue++; latestUtangText = infoText; }
        }
    });

    if (isBalanceHidden) {
        document.getElementById('dashTotalBalance').innerText = 'Rp ••••••••'; document.getElementById('dashTotalPiutang').innerText = 'Rp ••••••'; document.getElementById('dashTotalUtang').innerText = 'Rp ••••••';
        if(document.getElementById('dashTotalIncome')) document.getElementById('dashTotalIncome').innerText = 'Rp ••••••';
        if(document.getElementById('dashTotalExpense')) document.getElementById('dashTotalExpense').innerText = 'Rp ••••••';
    } else {
        document.getElementById('dashTotalBalance').innerText = formatRupiah(totalBalance); document.getElementById('dashTotalPiutang').innerText = formatRupiah(totalPiutang); document.getElementById('dashTotalUtang').innerText = formatRupiah(totalUtang);
        if(document.getElementById('dashTotalIncome')) document.getElementById('dashTotalIncome').innerText = formatRupiah(inc);
        if(document.getElementById('dashTotalExpense')) document.getElementById('dashTotalExpense').innerText = formatRupiah(exp);
    }
    
    document.getElementById('dashPiutangDetail').innerHTML = latestPiutangText; document.getElementById('dashUtangDetail').innerHTML = latestUtangText;
    document.getElementById('dashPiutangUnpaid').innerText = `${piutangUnpaid} Belum Lunas`; document.getElementById('dashPiutangOverdue').innerText = `${piutangOverdue} Lewat Tempo`;
    document.getElementById('dashUtangUnpaid').innerText = `${utangUnpaid} Belum Lunas`; document.getElementById('dashUtangOverdue').innerText = `${utangOverdue} Lewat Tempo`;
}

function updateDashboardLists(filtered) {
    const listIn = document.getElementById('listPemasukanDashboard'); const listOut = document.getElementById('listPengeluaranDashboard');
    if (!listIn || !listOut) return; listIn.innerHTML = ''; listOut.innerHTML = '';
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    let inCount = 0; let outCount = 0;
    
    sorted.forEach(t => {
        const catName = getCategoryName(t.category_id);
        const style = getCategoryStyle(catName); // Ambil gaya/warna unik
        
        // Buat badge oval (pill) untuk catatan
        const descText = t.description ? t.description : catName;
        const pillBadge = `<span class="inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold ${style.b} ${style.c} border border-white/50 dark:border-slate-800/50">${descText}</span>`;

        const row = `<div class="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border-b border-slate-50 dark:border-slate-700/30 transition-colors group"><div class="flex items-start gap-3"><div class="w-10 h-10 rounded-full ${style.b} ${style.c} flex items-center justify-center shrink-0 mt-0.5"><i class="fa-solid ${style.i}"></i></div><div><h4 class="text-xs font-bold text-slate-800 dark:text-white">${catName}</h4><p class="text-[10px] text-slate-400 font-medium mb-0.5">${new Date(t.date).toLocaleDateString('id-ID')}</p>${pillBadge}</div></div><div class="flex flex-col items-end gap-2"><div class="text-right"><p class="text-sm font-black ${t.type === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}">${formatRupiah(t.amount)}</p></div><div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onclick="editTx('${t.id}')" class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-colors"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button><button onclick="deleteTx('${t.id}')" class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><i class="fa-solid fa-trash-can text-[10px]"></i></button></div></div></div>`;
        
        if(t.type === 'income') { listIn.innerHTML += row; inCount++; } else { listOut.innerHTML += row; outCount++; }
    });
    if(inCount === 0) listIn.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Tidak ada pemasukan.</div>`;
    if(outCount === 0) listOut.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Tidak ada pengeluaran.</div>`;
}

function switchRekapTab(tab) {
    currentRekapTab = tab;
    ['daily', 'monthly', 'yearly'].forEach(t => { const btn = document.getElementById(`rekapBtn-${t}`); if(btn) btn.className = t === tab ? "px-4 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300 transition-all" : "px-4 py-2 text-xs font-bold rounded-lg text-slate-500 dark:text-slate-400 transition-all"; });
    renderRekapTable();
}

function renderRekapTable() {
    const tbody = document.getElementById('rekapTableBody'); const headerPeriode = document.getElementById('rekapHeaderPeriode');
    if(!tbody) return; tbody.innerHTML = ''; headerPeriode.innerText = currentRekapTab === 'daily' ? 'Tanggal' : currentRekapTab === 'monthly' ? 'Bulan' : 'Tahun';
    const groupMap = {};
    transactions.forEach(t => {
        const d = new Date(t.date); let key = '';
        if(currentRekapTab === 'daily') key = t.date; else if(currentRekapTab === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; else key = `${d.getFullYear()}`;
        if(!groupMap[key]) groupMap[key] = { income: 0, expense: 0 };
        if(t.type === 'income') groupMap[key].income += Number(t.amount); else groupMap[key].expense += Number(t.amount);
    });
    const keys = Object.keys(groupMap).sort((a,b) => b.localeCompare(a));
    if(keys.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="px-5 py-6 text-center text-slate-400">Belum ada data rekap.</td></tr>`; return; }
    keys.forEach(k => {
        const data = groupMap[k]; const net = data.income - data.expense; let displayLabel = k;
        if(currentRekapTab === 'daily') displayLabel = new Date(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); else if(currentRekapTab === 'monthly') { const [y, m] = k.split('-'); displayLabel = new Date(y, m-1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); }
        tbody.innerHTML += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><td class="px-5 py-4 text-slate-800 dark:text-white">${displayLabel}</td><td class="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400">+ ${formatRupiah(data.income)}</td><td class="px-5 py-4 text-right text-red-500 dark:text-red-400">- ${formatRupiah(data.expense)}</td><td class="px-5 py-4 text-right font-black ${net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}">${formatRupiah(net)}</td></tr>`;
    });
}

function applyFilter() {
    let filtered = [...transactions];
    const monthVal = document.getElementById('filterMonth').value; if (monthVal) { const [yyyy, mm] = monthVal.split('-'); filtered = filtered.filter(t => { const d = new Date(t.date); return d.getFullYear() === parseInt(yyyy) && (d.getMonth()+1) === parseInt(mm); }); }
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim(); if (search) filtered = filtered.filter(t => (t.description || '').toLowerCase().includes(search) || getCategoryName(t.category_id).toLowerCase().includes(search));
    updateSummary(filtered); updateDashboardLists(filtered); updateDashboardChart(filtered); updateCategoryPage(filtered); updateAccountingReports(filtered); renderRekapTable();
}

function updateAccountingReports(filtered) {
    const incRowsEl = document.getElementById('reportIncomeRows'); const expRowsEl = document.getElementById('reportExpenseRows'); const ledgerContainer = document.getElementById('generalLedgerContainer');
    if (!incRowsEl || !ledgerContainer) return;
    incRowsEl.innerHTML = ''; expRowsEl.innerHTML = ''; ledgerContainer.innerHTML = '';
    let totalInc = 0; let totalExp = 0; const catMap = {};
    filtered.forEach(t => { const catName = getCategoryName(t.category_id); if (!catMap[catName]) catMap[catName] = { type: t.type, items: [], total: 0 }; catMap[catName].items.push(t); catMap[catName].total += Number(t.amount); if (t.type === 'income') totalInc += Number(t.amount); else totalExp += Number(t.amount); });
    
    Object.keys(catMap).filter(cat => catMap[cat].type === 'income').forEach(cat => { const style=getCategoryStyle(cat); incRowsEl.innerHTML += `<div class="flex justify-between items-center"><span class="text-slate-600 dark:text-slate-300 flex items-center gap-2"><i class="fa-solid ${style.i} ${style.c} w-4 text-center"></i> ${cat}</span><span class="font-bold dark:text-white">${formatRupiah(catMap[cat].total)}</span></div>`; });
    document.getElementById('reportTotalIncome').innerText = formatRupiah(totalInc);
    
    Object.keys(catMap).filter(cat => catMap[cat].type === 'expense').forEach(cat => { const style=getCategoryStyle(cat); expRowsEl.innerHTML += `<div class="flex justify-between items-center"><span class="text-slate-600 dark:text-slate-300 flex items-center gap-2"><i class="fa-solid ${style.i} ${style.c} w-4 text-center"></i> ${cat}</span><span class="font-bold dark:text-white">${formatRupiah(catMap[cat].total)}</span></div>`; });
    document.getElementById('reportTotalExpense').innerText = formatRupiah(totalExp); document.getElementById('netProfitLabel').innerText = "Laba / Rugi Bersih"; document.getElementById('reportNetProfit').innerText = formatRupiah(totalInc - totalExp);
    
    if (Object.keys(catMap).length === 0) { ledgerContainer.innerHTML = `<div class="text-center py-8 text-slate-400">Belum ada data transaksi.</div>`; return; }
    Object.keys(catMap).forEach(cat => {
        const data = catMap[cat]; let tableRows = '';
        data.items.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(item => { tableRows += `<tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><td class="px-6 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 w-36">${new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td><td class="px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-white">${item.description || '-'}</td><td class="px-6 py-3.5 text-sm text-right font-black w-44 ${data.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${formatRupiah(item.amount)}</td></tr>`; });
        const badgeColor = data.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400';
        const style = getCategoryStyle(cat);
        ledgerContainer.innerHTML += `<div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden mb-6 shadow-sm bg-white dark:bg-slate-800"><div class="bg-slate-50 dark:bg-slate-700/30 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"><h5 class="font-extrabold text-slate-800 dark:text-white flex items-center gap-3"><div class="w-9 h-9 rounded-xl ${badgeColor} flex items-center justify-center"><i class="fa-solid ${style.i}"></i></div> <span class="text-base">${cat}</span></h5><span class="text-xs font-extrabold ${data.type === 'income' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800/50' : 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-800/50'} px-3.5 py-1.5 rounded-xl">Total: ${formatRupiah(data.total)}</span></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50/60 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase text-slate-400 font-extrabold tracking-wider"><th class="px-6 py-3 w-36">Tanggal</th><th class="px-6 py-3">Keterangan Transaksi</th><th class="px-6 py-3 text-right w-44">Nominal</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    });
}

function updateDashboardChart(filtered) {
    const ctx = document.getElementById('dashboardChart'); if (!ctx) return; if (dashboardChart) dashboardChart.destroy();
    const dateMap = {}; [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => { const d = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); if (!dateMap[d]) dateMap[d] = { income: 0, expense: 0 }; if (t.type === 'income') dateMap[d].income += Number(t.amount); else dateMap[d].expense += Number(t.amount); });
    const labels = Object.keys(dateMap);
    dashboardChart = new Chart(ctx, { type: 'bar', data: { labels: labels.length ? labels : ['Belum ada data'], datasets: [ { label: 'Pemasukan', data: labels.map(l => dateMap[l].income), backgroundColor: '#10b981', borderRadius: 6 }, { label: 'Pengeluaran', data: labels.map(l => dateMap[l].expense), backgroundColor: '#ef4444', borderRadius: 6 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top', labels: { color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b' } } } } });
}
function updateCategoryPage(filtered) {
    const incList = document.getElementById('incomeCategoryList'); const expList = document.getElementById('expenseCategoryList');
    if (!incList || !expList) return; incList.innerHTML = ''; expList.innerHTML = '';
    const catTotals = { income: {}, expense: {} }; let totalInc = 0; let totalExp = 0;
    filtered.forEach(t => { const catName = getCategoryName(t.category_id); if (t.type === 'income') { catTotals.income[catName] = (catTotals.income[catName] || 0) + Number(t.amount); totalInc += Number(t.amount); } else { catTotals.expense[catName] = (catTotals.expense[catName] || 0) + Number(t.amount); totalExp += Number(t.amount); } });
    for (const [cat, amt] of Object.entries(catTotals.expense).sort((a, b) => b[1] - a[1])) { const percent = totalExp > 0 ? ((amt / totalExp) * 100).toFixed(1) : 0; const style=getCategoryStyle(cat); expList.innerHTML += `<div><div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-slate-700 dark:text-slate-200 flex items-center gap-2"><i class="fa-solid ${style.i} ${style.c} w-4 text-center"></i> ${cat}</span><span class="text-slate-600 dark:text-slate-300">${formatRupiah(amt)} <span class="text-[10px] text-slate-400 ml-1">(${percent}%)</span></span></div><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden"><div class="bg-red-500 h-2.5 rounded-full" style="width: ${percent}%"></div></div></div>`; }
    for (const [cat, amt] of Object.entries(catTotals.income).sort((a, b) => b[1] - a[1])) { const percent = totalInc > 0 ? ((amt / totalInc) * 100).toFixed(1) : 0; const style=getCategoryStyle(cat); incList.innerHTML += `<div><div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-slate-700 dark:text-slate-200 flex items-center gap-2"><i class="fa-solid ${style.i} ${style.c} w-4 text-center"></i> ${cat}</span><span class="text-slate-600 dark:text-slate-300">${formatRupiah(amt)} <span class="text-[10px] text-slate-400 ml-1">(${percent}%)</span></span></div><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden"><div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${percent}%"></div></div></div>`; }
}
function updateClock() { const timeEl = document.getElementById('liveTime'); if (!timeEl) return; const now = new Date(); timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> <span>${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} • ${now.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'][now.getMonth()]}</span>`; } setInterval(updateClock, 1000); updateClock();

function openModal() { updateCategoryOptions(); updateWalletOptions(); const m = document.getElementById('transactionModal'); m.classList.remove('hidden'); setTimeout(() => m.classList.add('opacity-100'), 10); }
function closeModal() { const m = document.getElementById('transactionModal'); m.classList.remove('opacity-100'); setTimeout(() => { m.classList.add('hidden'); document.getElementById('transactionForm').reset(); document.getElementById('date').valueAsDate = new Date(); editingTransactionId = null; }, 300); }
function editTx(id) {
    const t = transactions.find(x => x.id === id); if (!t) return; editingTransactionId = id; document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
    updateCategoryOptions(); updateWalletOptions(); document.getElementById('category').value = t.category_id || '';
    if (t.wallet_id) document.getElementById('walletSelect').value = t.wallet_id;
    document.getElementById('amount').value = new Intl.NumberFormat('id-ID').format(t.amount); document.getElementById('description').value = t.description; document.getElementById('date').value = t.date; openModal();
}
const txForm = document.getElementById('transactionForm');
if (txForm) {
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return alert("Silakan login terlebih dahulu!");
        try {
            const type = document.querySelector('input[name="type"]:checked').value; const category_id = document.getElementById('category').value; 
            const wallet_id = document.getElementById('walletSelect').value || null; const amount = parseRupiah(document.getElementById('amount').value); 
            const description = document.getElementById('description').value; const date = document.getElementById('date').value; 
            if (!wallet_id) throw new Error("Pilih dompet terlebih dahulu!");
            const txData = { type, category_id, wallet_id, amount, description, date, user_id: currentUser.id };
            
            if (editingTransactionId) {
                const oldTx = transactions.find(t => t.id === editingTransactionId); const oldWallet = wallets.find(w => w.id === oldTx.wallet_id);
                if(oldWallet) { if(oldTx.type === 'income') oldWallet.balance -= Number(oldTx.amount); else oldWallet.balance += Number(oldTx.amount); }
                const newWallet = wallets.find(w => w.id === wallet_id);
                if(newWallet) { if(type === 'income') newWallet.balance += amount; else newWallet.balance -= amount; await db.from('wallets').update({ balance: newWallet.balance }).eq('id', wallet_id); }
                if(oldWallet && oldWallet.id !== wallet_id) { await db.from('wallets').update({ balance: oldWallet.balance }).eq('id', oldWallet.id); }
                const { error } = await db.from('transactions').update(txData).eq('id', editingTransactionId); if (error) throw error;
                const idx = transactions.findIndex(t => t.id === editingTransactionId); if (idx !== -1) transactions[idx] = { id: editingTransactionId, ...txData };
            } else {
                const { data, error } = await db.from('transactions').insert([txData]).select(); if (error) throw error; if (data) transactions.push(data[0]);
                const targetWallet = wallets.find(w => w.id === wallet_id);
                if (targetWallet) {
                    let currentBalance = Number(targetWallet.balance); if (type === 'income') currentBalance += amount; else currentBalance -= amount;
                    await db.from('wallets').update({ balance: currentBalance }).eq('id', wallet_id); targetWallet.balance = currentBalance;
                }
            }
            renderWalletCards(); updateWalletOptions(); applyFilter(); closeModal();
        } catch (err) { await showCustomModal({ title: "Gagal Menyimpan", message: err.message }); }
    });
}
async function deleteTx(id) { 
    const confirmed = await showCustomModal({ title: "Hapus Transaksi", message: "Hapus transaksi ini? Saldo dompet akan dikembalikan." }); if (!confirmed) return;
    try {
        const txToDelete = transactions.find(t => t.id === id); if (!txToDelete) return;
        await db.from('transactions').delete().eq('id', id);
        if (txToDelete.wallet_id) {
            const targetWallet = wallets.find(w => w.id === txToDelete.wallet_id);
            if (targetWallet) {
                let currentBalance = Number(targetWallet.balance); if (txToDelete.type === 'income') currentBalance -= Number(txToDelete.amount); else currentBalance += Number(txToDelete.amount);
                await db.from('wallets').update({ balance: currentBalance }).eq('id', txToDelete.wallet_id); targetWallet.balance = currentBalance;
            }
        }
        transactions = transactions.filter(t => t.id !== id); renderWalletCards(); updateWalletOptions(); applyFilter();
    } catch (err) { await showCustomModal({ title: "Gagal Menghapus", message: err.message }); }
}

async function toggleDebtStatus(id, newStatus) {
    if (!currentUser) return; const debt = debts.find(d => d.id === id); if (!debt) return;
    if (newStatus === 'paid' && debt.status === 'unpaid') {
        if (wallets.length === 0) { await showCustomModal({ title: "Perhatian", message: "Tidak ada dompet terdaftar! Tambahkan dompet terlebih dahulu." }); return; }
        const isPayable = debt.type === 'payable'; const actionText = isPayable ? 'Bayar pakai:' : 'Terima dana ke:'; const modalTitle = isPayable ? 'Pelunasan Utang' : 'Penerimaan Piutang'; const btnText = isPayable ? 'Bayar Utang' : 'Terima Dana';

        const selectedWalletId = await new Promise((resolve) => {
            const overlay = document.createElement('div'); overlay.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex justify-center items-center p-4 transition-opacity opacity-0";
            let options = wallets.map(w => `<option value="${w.id}">${w.name} (${formatRupiah(w.balance)})</option>`).join('');
            overlay.innerHTML = `<div class="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden transform transition-transform scale-95 border border-slate-100 dark:border-slate-700 p-6 text-center"><div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl shadow-inner"><i class="fa-solid fa-wallet"></i></div><h3 class="text-lg font-extrabold text-slate-800 dark:text-white mb-2">${modalTitle}</h3><p class="text-xs text-slate-500 dark:text-slate-300 mb-4">${actionText} <span class="font-bold ${isPayable ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}">${formatRupiah(debt.amount)}</span></p><select id="tempWalletSelect" class="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-vvip text-slate-800 dark:text-white mb-6 text-left">${options}</select><div class="flex gap-3"><button id="cancelWalletBtn" class="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition-all">Batal</button><button id="confirmWalletBtn" class="flex-1 bg-vvip hover:bg-slate-900 text-amber-400 font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md">${btnText}</button></div></div>`;
            document.body.appendChild(overlay); setTimeout(() => { overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100'); overlay.querySelector('div').classList.replace('scale-95', 'scale-100'); }, 10);
            const close = (res) => { overlay.classList.remove('opacity-100'); overlay.querySelector('div').classList.replace('scale-100', 'scale-95'); setTimeout(() => { overlay.remove(); resolve(res); }, 200); };
            overlay.querySelector('#cancelWalletBtn').onclick = () => close(null); overlay.querySelector('#confirmWalletBtn').onclick = () => close(overlay.querySelector('#tempWalletSelect').value);
        });

        if (!selectedWalletId) return; 
        const targetWallet = wallets.find(w => w.id === selectedWalletId);
        if (isPayable && Number(targetWallet.balance) < Number(debt.amount)) { await showCustomModal({ title: "Saldo Tidak Cukup", message: `Saldo dompet ${targetWallet.name} tidak mencukupi untuk pelunasan ini.` }); return; }

        try {
            const newBalance = isPayable ? (Number(targetWallet.balance) - Number(debt.amount)) : (Number(targetWallet.balance) + Number(debt.amount));
            await db.from('wallets').update({ balance: newBalance }).eq('id', targetWallet.id); targetWallet.balance = newBalance;

            let category_id;
            if (isPayable) { let otherCat = categories.find(c => c.name.toLowerCase().includes('lain') && c.type === 'expense'); category_id = otherCat ? otherCat.id : (categories.find(c => c.type === 'expense')?.id || categories[0].id); } else { let otherCat = categories.find(c => c.name.toLowerCase().includes('lain') && c.type === 'income'); category_id = otherCat ? otherCat.id : (categories.find(c => c.type === 'income')?.id || categories[0].id); }
            const txType = isPayable ? 'expense' : 'income'; const txDesc = isPayable ? `UTANG LUNAS - ${debt.person_name}` : `PIUTANG LUNAS - ${debt.person_name}`;
            const txData = { type: txType, category_id, wallet_id: targetWallet.id, amount: Number(debt.amount), description: txDesc, date: new Date().toISOString().split('T')[0], user_id: currentUser.id };
            const { data: txRes, error: txErr } = await db.from('transactions').insert([txData]).select(); if (txErr) throw txErr; if (txRes) transactions.push(txRes[0]);
        } catch (err) { await showCustomModal({ title: "Gagal Memproses", message: err.message }); return; }
    }
    await db.from('debts').update({ status: newStatus }).eq('id', id); debt.status = newStatus; renderWalletCards(); updateWalletOptions(); renderDebtPage(); applyFilter();
}

const charityForm = document.getElementById('charityForm');
if (charityForm) {
    charityForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return;
        try {
            const type = document.getElementById('charityType').value; const amount = parseRupiah(document.getElementById('charityAmount').value);
            if (amount <= 0) throw new Error("Nominal tidak valid!"); if (wallets.length === 0) throw new Error("Tambahkan dompet terlebih dahulu!");
            const targetWallet = wallets[0]; if (Number(targetWallet.balance) < amount) throw new Error(`Saldo dompet ${targetWallet.name} tidak cukup.`);
            const newBalance = Number(targetWallet.balance) - amount; await db.from('wallets').update({ balance: newBalance }).eq('id', targetWallet.id); targetWallet.balance = newBalance;
            let charityCat = categories.find(c => c.name.toLowerCase().includes('sedekah') && c.type === 'expense'); let category_id;
            if (!charityCat) { const { data: newCat, error: catErr } = await db.from('categories').insert([{ name: 'Sedekah', type: 'expense', user_id: currentUser.id }]).select(); if (catErr) throw catErr; if (newCat) { categories.push(newCat[0]); category_id = newCat[0].id; } } else { category_id = charityCat.id; }
            const { data: charityRes, error: charityErr } = await db.from('charity_records').insert([{ type, amount, date: new Date().toISOString().split('T')[0], user_id: currentUser.id }]).select(); if (charityErr) throw charityErr; if (charityRes) charityRecords.push(charityRes[0]);
            const txData = { type: 'expense', category_id, wallet_id: targetWallet.id, amount, description: `SEDEKAH - ${type}`, date: new Date().toISOString().split('T')[0], user_id: currentUser.id };
            const { data: txRes, error: txErr } = await db.from('transactions').insert([txData]).select(); if (txErr) throw txErr; if (txRes) transactions.push(txRes[0]);
            document.getElementById('charityForm').reset(); renderCharityPage(); renderWalletCards(); updateWalletOptions(); applyFilter(); await showCustomModal({ title: "Berhasil", message: "Sedekah dicatat dan saldo utama telah dipotong." });
        } catch (err) { await showCustomModal({ title: "Gagal", message: err.message }); }
    });
}

const savingsForm = document.getElementById('savingsForm');
if (savingsForm) {
    savingsForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return;
        try {
            const title = document.getElementById('savingsTitle').value.trim(); const target_amount = parseRupiah(document.getElementById('savingsTargetAmount').value);
            const { data, error } = await db.from('savings_goals').insert([{ title, target_amount, current_amount: 0, user_id: currentUser.id }]).select();
            if (error) throw error; if (data) { savingsGoals.push(data[0]); document.getElementById('savingsForm').reset(); renderSavingsPage(); }
        } catch (err) { await showCustomModal({ title: "Gagal", message: err.message }); }
    });
}
function renderSavingsPage() {
    const grid = document.getElementById('savingsGrid'); if (!grid) return; grid.innerHTML = '';
    if (savingsGoals.length === 0) return grid.innerHTML = `<div class="col-span-2 py-8 text-center text-slate-400">Belum ada target tabungan.</div>`;
    savingsGoals.forEach(g => {
        const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0;
        grid.innerHTML += `<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between transition-colors"><div><div class="flex justify-between items-start"><h4 class="font-extrabold text-slate-800 dark:text-white text-lg">${g.title}</h4><button onclick="deleteSavings('${g.id}')" class="text-slate-300 dark:text-slate-500 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></div><div class="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mt-4 mb-2"><span>Terkumpul: ${formatRupiah(g.current_amount)}</span><span>Target: ${formatRupiah(g.target_amount)}</span></div><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5"><div class="bg-vvip h-2.5 rounded-full" style="width: ${pct}%"></div></div></div><button onclick="addSavingsProgress('${g.id}')" class="mt-5 w-full bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 py-2.5 text-xs font-bold rounded-xl transition-colors">+ Setor Tabungan</button></div>`;
    });
}
async function addSavingsProgress(id) {
    const val = await showCustomModal({ title: "Setor Tabungan", message: "Masukkan nominal setoran (Rp):", isPrompt: true, placeholder: "50.000" });
    if (!val) return; const amt = parseRupiah(val); if (amt <= 0) return;
    try { const goal = savingsGoals.find(g => g.id === id); const newCurrent = Number(goal.current_amount) + amt; await db.from('savings_goals').update({ current_amount: newCurrent }).eq('id', id); goal.current_amount = newCurrent; renderSavingsPage(); } catch (err) { await showCustomModal({ title: "Gagal", message: err.message }); }
}
async function deleteSavings(id) { const confirmed = await showCustomModal({ title: "Hapus Target", message: "Hapus impian ini?" }); if (confirmed) { await db.from('savings_goals').delete().eq('id', id); savingsGoals = savingsGoals.filter(g => g.id !== id); renderSavingsPage(); } }

function renderCharityPage() {
    const listEl = document.getElementById('charityTableList'); const totalEl = document.getElementById('totalCharityAmount');
    if (!listEl) return; listEl.innerHTML = ''; let total = 0;
    if (charityRecords.length === 0) { listEl.innerHTML = `<tr><td colspan="4" class="px-5 py-8 text-center text-slate-400">Belum ada histori.</td></tr>`; if(totalEl) totalEl.innerText = formatRupiah(0); return; }
    [...charityRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(c => {
        total += Number(c.amount);
        listEl.innerHTML += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 transition-colors"><td class="px-5 py-4 text-xs font-bold text-slate-400">${new Date(c.date).toLocaleDateString('id-ID')}</td><td class="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">${c.type}</td><td class="px-5 py-4 text-right font-black text-emerald-500 dark:text-emerald-400">+ ${formatRupiah(c.amount)}</td><td class="px-5 py-4 text-center"><button onclick="deleteCharity('${c.id}')" class="text-slate-300 dark:text-slate-500 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    });
    if (totalEl) totalEl.innerText = formatRupiah(total);
}
async function deleteCharity(id) { const confirmed = await showCustomModal({ title: "Hapus Catatan", message: "Hapus sedekah ini?" }); if (confirmed) { await db.from('charity_records').delete().eq('id', id); charityRecords = charityRecords.filter(c => c.id !== id); renderCharityPage(); } }

async function submitDebtForm() {
    if (!currentUser) return;
    const person_name = document.getElementById('debtPerson').value.trim(); const type = document.getElementById('debtType').value; const amount = parseRupiah(document.getElementById('debtAmount').value); const due_date = document.getElementById('debtDueDate').value;
    if(!person_name || amount <= 0 || !due_date) return await showCustomModal({ title: "Perhatian", message: "Harap isi semua kolom!" });
    const { data, error } = await db.from('debts').insert([{ user_id: currentUser.id, person_name, type, amount, due_date, status: 'unpaid' }]).select();
    if (data && data.length > 0) { debts.push(data[0]); document.getElementById('debtForm').reset(); const dd = document.getElementById('debtDueDate'); if(dd) dd.valueAsDate = new Date(); renderDebtPage(); applyFilter(); } else { await showCustomModal({ title: "Error", message: error.message }); }
}
function renderDebtPage() {
    const listEl = document.getElementById('debtTableList'); if(!listEl) return; listEl.innerHTML = '';
    if(debts.length === 0) { listEl.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">Belum ada catatan.</td></tr>`; return; }
    [...debts].sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).forEach(d => {
        const isPayable = d.type === 'payable';
        const typeBadge = isPayable ? `<span class="px-2 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] rounded-md font-bold uppercase">Saya Ngutang</span>` : `<span class="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-md font-bold uppercase">Orang Ngutang</span>`;
        const statusBadge = d.status === 'paid' ? `<span class="text-xs font-bold text-slate-400 dark:text-slate-500"><i class="fa-solid fa-check-circle text-emerald-400"></i> Lunas</span>` : `<button onclick="toggleDebtStatus('${d.id}', 'paid')" class="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg transition-colors">Tandai Lunas</button>`;
        listEl.innerHTML += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 ${d.status === 'paid' ? 'opacity-60' : ''} transition-colors"><td class="px-5 py-4 font-bold text-slate-800 dark:text-white">${d.person_name}</td><td class="px-5 py-4">${typeBadge}</td><td class="px-5 py-4 text-right font-black ${isPayable ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}">${formatRupiah(d.amount)}</td><td class="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">${new Date(d.due_date).toLocaleDateString('id-ID')}</td><td class="px-5 py-4 text-center">${statusBadge}</td><td class="px-5 py-4 text-center">${d.status === 'paid' ? `<button onclick="toggleDebtStatus('${d.id}', 'unpaid')" class="text-slate-400 hover:text-indigo-500 p-2 mr-1"><i class="fa-solid fa-rotate-left"></i></button>` : ''}<button onclick="deleteDebt('${d.id}')" class="text-slate-300 dark:text-slate-500 hover:text-red-500 p-2"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    });
}
async function deleteDebt(id) { const confirmed = await showCustomModal({ title: "Hapus", message: "Hapus catatan ini?" }); if (confirmed) { await db.from('debts').delete().eq('id', id); debts = debts.filter(d => d.id !== id); renderDebtPage(); applyFilter(); } }

let customModalCallback = null;
function showCustomModal({ title, message, isPrompt = false, placeholder = '', inputType = 'text', defaultValue = '' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal'); const content = document.getElementById('customConfirmContent');
        document.getElementById('confirmTitle').innerText = title; document.getElementById('confirmMessage').innerText = message;
        const inputWrapper = document.getElementById('confirmInputWrapper'); const inputEl = document.getElementById('customPromptInput');
        if (isPrompt) { inputWrapper.classList.remove('hidden'); inputEl.type = inputType; inputEl.placeholder = placeholder; inputEl.value = defaultValue; setTimeout(() => inputEl.focus(), 100); } else { inputWrapper.classList.add('hidden'); inputEl.value = ''; }
        modal.classList.remove('hidden'); setTimeout(() => { modal.classList.add('opacity-100'); content.classList.replace('scale-95', 'scale-100'); }, 10);
        customModalCallback = (result) => { modal.classList.remove('opacity-100'); content.classList.replace('scale-100', 'scale-95'); setTimeout(() => { modal.classList.add('hidden'); resolve(isPrompt && result ? inputEl.value : result); }, 200); };
    });
}
function closeCustomModal(result) { if (customModalCallback) { customModalCallback(result); customModalCallback = null; } }

async function exportDataJSON() {
    if (!currentUser) { await showCustomModal({ title: "Akses Ditolak", message: "Masuk terlebih dahulu!" }); return; }
    const confirmed = await showCustomModal({ title: "Backup Data Keuangan", message: "Apakah Anda ingin mengunduh file cadangan (backup) seluruh data VVIP NgaturDuit Anda sekarang?" }); if (!confirmed) return;
    try {
        const backupData = { version: "1.8", exportDate: new Date().toISOString(), user_email: currentUser.email, transactions, categories, budgets, savingsGoals, charityRecords, debts, wallets, profile: userProfileData };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a'); downloadAnchor.setAttribute("href", dataStr); downloadAnchor.setAttribute("download", `backup_ngaturduit_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
        await showCustomModal({ title: "Backup Berhasil", message: "File cadangan data keuangan berhasil diunduh ke perangkat Anda." });
    } catch (err) { await showCustomModal({ title: "Gagal Backup", message: err.message }); }
}

async function importDataJSON(input) {
    if (!currentUser) return await showCustomModal({ title: "Akses Ditolak", message: "Masuk terlebih dahulu!" });
    const file = input.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            const confirmed = await showCustomModal({ title: "Restore Data", message: "Masukkan data cadangan?" }); if (!confirmed) { input.value = ''; return; }
            if (parsedData.categories?.length) await db.from('categories').insert(parsedData.categories.map(c => ({ name: c.name, type: c.type, user_id: currentUser.id })));
            if (parsedData.wallets?.length) await db.from('wallets').insert(parsedData.wallets.map(w => ({ name: w.name, balance: w.balance, user_id: currentUser.id })));
            if (parsedData.transactions?.length) await db.from('transactions').insert(parsedData.transactions.map(t => ({ type: t.type, category_id: t.category_id, amount: t.amount, description: t.description, date: t.date, user_id: currentUser.id })));
            await showCustomModal({ title: "Berhasil", message: "Data dipulihkan!" }); location.reload();
        } catch (err) { await showCustomModal({ title: "Gagal", message: err.message }); } finally { input.value = ''; }
    }; reader.readAsText(file);
}