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

function checkVvipStatus() { 
    const card = document.getElementById('mainBalanceCard');
    const boxInc = document.getElementById('boxInc');
    const boxExp = document.getElementById('boxExp');
    const title = document.getElementById('dashTotalTitle');
    const infoText = document.getElementById('dashInfoText');
    const footer = document.getElementById('dashFooter');
    
    if (localStorage.getItem('is_vvip_unlocked') === 'true') {
        document.body.classList.add('is-vvip');
        if(card) {
            card.style.background = 'linear-gradient(to bottom right, #020617, #0f172a, #090d16)';
            card.style.borderColor = 'rgba(245, 158, 11, 0.4)';
            card.style.color = '#ffffff';
        }
        if(boxInc) {
            boxInc.style.background = 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.8))';
            boxInc.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        }
        if(boxExp) {
            boxExp.style.background = 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.8))';
            boxExp.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        }
        if(title) title.style.color = '#e2e8f0';
        if(infoText) infoText.style.color = '#94a3b8';
        if(footer) footer.style.borderColor = 'rgba(245, 158, 11, 0.2)';
    } else {
        document.body.classList.remove('is-vvip');
        if(card) {
            card.style.background = '';
            card.style.borderColor = '';
            card.style.color = '';
        }
        if(boxInc) {
            boxInc.style.background = '';
            boxInc.style.borderColor = '';
        }
        if(boxExp) {
            boxExp.style.background = '';
            boxExp.style.borderColor = '';
        }
        if(title) title.style.color = '';
        if(infoText) infoText.style.color = '';
        if(footer) footer.style.borderColor = '';
    }
}

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
    if (localStorage.getItem('is_vvip_unlocked') === 'true') return await showCustomModal({ title: "Sudah VVIP", message: "Akses VVIP Anda sudah aktif!" });
    const inputCode = await showCustomModal({ title: "Akses Eksklusif VVIP", message: "Masukkan kode rahasia VVIP untuk membuka tampilan elit dan fitur eksklusif:", isPrompt: true, placeholder: "Ketik kode di sini..." });
    if (!inputCode) return;
    if (inputCode.trim().toUpperCase() === "RUSDIPINTAR") {
        localStorage.setItem('is_vvip_unlocked', 'true'); 
        checkVvipStatus();
        await showCustomModal({ title: "Akses Diberikan!", message: "Selamat! Anda sekarang resmi menjadi member VVIP NgaturDuit." });
        switchPage('home');
    } else { 
        await showCustomModal({ title: "Kode Salah", message: "Kode akses yang Anda masukkan tidak valid." }); 
    }
}

async function deactivateVvip() {
    const confirmed = await showCustomModal({ 
        title: "Batalkan Akses VVIP?", 
        message: "Yakin ingin kembali ke mode standar? Fitur khusus VVIP akan disembunyikan dan tema kembali menjadi biru." 
    });
    
    if (confirmed) {
        localStorage.removeItem('is_vvip_unlocked');
        checkVvipStatus();
        await showCustomModal({ title: "Mode Standar Aktif", message: "Akses VVIP telah dimatikan. Aplikasi kembali ke mode standar." });
        switchPage('home');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar'); 
    const overlay = document.getElementById('mobileSidebarOverlay'); 
    const isDesktop = window.innerWidth >= 1024;
    
    if (isDesktop) {
        sidebar.classList.toggle('lg:-translate-x-full');
        sidebar.classList.toggle('border-r'); // Menghilangkan sisa garis pinggir 1px
        sidebar.style.width = sidebar.classList.contains('lg:-translate-x-full') ? '0px' : '260px';
    } else {
        if (sidebar.classList.contains('-translate-x-full')) { 
            sidebar.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.add('opacity-100'), 10); 
        } else { 
            sidebar.classList.add('-translate-x-full'); overlay.classList.remove('opacity-100'); setTimeout(() => overlay.classList.add('hidden'), 300); 
        }
    }
}

db.auth.onAuthStateChange((event, session) => {
    if (session) { currentUser = session.user; document.getElementById('authContainer').classList.add('hidden'); document.getElementById('mainApp').classList.remove('hidden'); init(); } 
    else { currentUser = null; document.getElementById('authContainer').classList.remove('hidden'); document.getElementById('mainApp').classList.add('hidden'); transactions = []; categories = []; wallets = []; }
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
    pages.forEach(p => {
    const sideEl = document.getElementById(`side-${p}`);
    if (sideEl) {
        if (p === 'debt') {
            // Khusus menu utang, kita gunakan 'justify-between' agar tanda seru berada di ujung kanan
            sideEl.className = p === page ? "w-full flex items-center justify-between px-4 py-3 rounded-xl text-left font-bold text-sm transition-all sidebar-active" : "w-full flex items-center justify-between px-4 py-3 rounded-xl text-left font-bold text-sm transition-all sidebar-inactive";
            
            // Cek apakah ada utang/piutang dengan status 'unpaid' (belum lunas)
            const hasUnpaid = debts.some(d => d.status === 'unpaid');
            sideEl.innerHTML = `<div class="flex items-center gap-3.5"><i class="fa-solid fa-handshake w-5 text-center text-lg"></i> <span>Utang & Piutang</span></div>${hasUnpaid ? '<span class="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">!</span>' : ''}`;
        } else {
            // Menu lainnya
            sideEl.className = p === page ? "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left font-bold text-sm transition-all sidebar-active" : "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left font-bold text-sm transition-all sidebar-inactive";
        }
    }
});
    if(window.innerWidth < 1024) { document.getElementById('sidebar').classList.add('-translate-x-full'); document.getElementById('mobileSidebarOverlay').classList.remove('opacity-100'); setTimeout(() => document.getElementById('mobileSidebarOverlay').classList.add('hidden'), 300); }
    if (page === 'profile') updateProfilePage(); if (page === 'savings') renderSavingsPage(); if (page === 'charity') { renderCharityPage(); updateSpecificWalletOptions(); } if (page === 'debt') { renderDebtPage(); const dd = document.getElementById('debtDueDate'); if (dd && !dd.value) dd.valueAsDate = new Date(); }
    checkVvipStatus();
}

function openModalWithParam(type) { document.querySelector(`input[name="type"][value="${type}"]`).checked = true; updateCategoryOptions(); openModal(); }
function formatRupiah(number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number); }
function parseRupiah(str) { return parseInt(str.replace(/[^,\d]/g, ''), 10) || 0; }
function formatRupiahInput(input) { let val = input.value.replace(/[^,\d]/g, ''); if (val) input.value = new Intl.NumberFormat('id-ID').format(parseInt(val, 10)); else input.value = ''; }
function getCategoryName(categoryId) { if (!categoryId) return 'Tanpa Kategori'; const cat = categories.find(c => c.id === categoryId); return cat ? cat.name : 'Terhapus'; }

function getCategoryStyle(catName) {
    const name = (catName || '').toLowerCase();
    if (name.includes('makan') || name.includes('minum') || name.includes('jajan')) 
        return { i: 'fa-utensils', c: 'text-orange-600 dark:text-orange-400', b: 'bg-orange-100 dark:bg-orange-900/30' };
    if (name.includes('transport') || name.includes('bensin') || name.includes('tol') || name.includes('parkir')) 
        return { i: 'fa-car-side', c: 'text-blue-600 dark:text-blue-400', b: 'bg-blue-100 dark:bg-blue-900/30' };
    if (name.includes('gaji') || name.includes('pemasukan') || name.includes('bonus') || name.includes('profit')) 
        return { i: 'fa-money-bill-wave', c: 'text-emerald-600 dark:text-emerald-400', b: 'bg-emerald-100 dark:bg-emerald-900/30' };
    if (name.includes('listrik') || name.includes('tagihan') || name.includes('air') || name.includes('internet')) 
        return { i: 'fa-bolt', c: 'text-cyan-600 dark:text-cyan-400', b: 'bg-cyan-100 dark:bg-cyan-900/30' };
    if (name.includes('belanja') || name.includes('baju') || name.includes('skincare')) 
        return { i: 'fa-bag-shopping', c: 'text-rose-600 dark:text-rose-400', b: 'bg-rose-100 dark:bg-rose-900/30' };
    if (name.includes('sembako') || name.includes('kebutuhan')) 
        return { i: 'fa-basket-shopping', c: 'text-teal-600 dark:text-teal-400', b: 'bg-teal-100 dark:bg-teal-900/30' };
    if (name.includes('sehat') || name.includes('obat') || name.includes('dokter')) 
        return { i: 'fa-notes-medical', c: 'text-red-600 dark:text-red-400', b: 'bg-red-100 dark:bg-red-900/30' };
    if (name.includes('hiburan') || name.includes('game') || name.includes('hobi')) 
        return { i: 'fa-gamepad', c: 'text-violet-600 dark:text-violet-400', b: 'bg-violet-100 dark:bg-violet-900/30' };
    if (name.includes('sedekah') || name.includes('amal') || name.includes('zakat')) 
        return { i: 'fa-hand-holding-heart', c: 'text-indigo-600 dark:text-indigo-400', b: 'bg-indigo-100 dark:bg-indigo-900/30' };
    return { i: 'fa-tag', c: 'text-slate-600 dark:text-slate-400', b: 'bg-slate-200 dark:bg-slate-700/50' }; 
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
        renderWalletCards(); updateSpecificWalletOptions(); 
    } catch (err) { console.error("Error init:", err); }
    updateCategoryOptions(); renderMasterCategories(); applyFilter(); checkVvipStatus();
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
                currentZoom = Math.max(scaleX, scaleY); imageOffsetX = 0; imageOffsetY = 0;
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
            if (existing) { await db.from('profiles').update(payload).eq('user_id', currentUser.id); } else { await db.from('profiles').insert([payload]); }
            userProfileData = payload; updateHeaderDisplay(full_name, avatar_url); document.getElementById('cropContainer').classList.add('hidden');
            await showCustomModal({ title: "Profil Berhasil Diperbarui", message: "Perubahan data profil dan foto Anda telah disimpan." });
        } catch (err) { await showCustomModal({ title: "Gagal Menyimpan", message: err.message }); }
    });
}
function updateProfilePage() { if (!currentUser) return; document.getElementById('profileEmailSubtitle').innerText = currentUser.email; }

function renderMasterCategories() {
    const listEl = document.getElementById('masterCategoryList'); 
    if (!listEl) return; 
    listEl.innerHTML = '';
    
    const searchInput = document.getElementById('searchCategoryInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Memisahkan Pemasukan dan Pengeluaran
    let incomeCats = categories.filter(c => c.type === 'income');
    let expenseCats = categories.filter(c => c.type === 'expense');

    // Filter berdasarkan teks pencarian (Hanya huruf awalan)
    if (searchTerm) {
        incomeCats = incomeCats.filter(c => c.name.toLowerCase().startsWith(searchTerm));
        expenseCats = expenseCats.filter(c => c.name.toLowerCase().startsWith(searchTerm));
    }

    // Fungsi internal untuk merender baris ke dalam tabel
    const renderGroup = (cats, typeTitle, typeColorClass, badgeClass) => {
        if (cats.length === 0) return;
        
        // Header Grup (Pemasukan / Pengeluaran)
        listEl.innerHTML += `<tr class="bg-slate-50/80 dark:bg-slate-800/80"><td colspan="3" class="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest ${typeColorClass}">${typeTitle}</td></tr>`;
        
        cats.forEach(cat => {
            const style = getCategoryStyle(cat.name);
            
            // Tarik data transaksi khusus untuk kategori ini
            const catTx = transactions.filter(t => t.category_id === cat.id);
            let txHtml = '';
            
            // JIKA sedang mencari sesuatu, munculkan riwayat transaksinya
            if (searchTerm && catTx.length > 0) {
                txHtml = `<div class="mt-4 pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-2.5">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5"><i class="fa-solid fa-list-ul mr-1"></i> Rincian Transaksi (${catTx.length})</p>
                    ${catTx.map(t => `
                        <div class="flex justify-between items-center text-[11px] font-bold border-b border-slate-100 dark:border-slate-700/50 last:border-0 pb-1.5 last:pb-0">
                            <span class="text-slate-600 dark:text-slate-300">${new Date(t.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} - ${t.description || 'Tanpa keterangan'}</span>
                            <span class="font-black ${cat.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">${formatRupiah(t.amount)}</span>
                        </div>
                    `).join('')}
                </div>`;
            } else if (searchTerm && catTx.length === 0) {
                txHtml = `<div class="mt-3 pl-11 text-[10px] font-bold text-slate-400 italic"><i class="fa-solid fa-circle-info mr-1"></i> Belum ada riwayat transaksi.</div>`;
            }

            listEl.innerHTML += `
                <tr class="hover:bg-white dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700">
                    <td class="px-5 py-4 w-full">
                        <div class="flex items-center gap-3.5">
                            <div class="w-10 h-10 rounded-xl ${style.b} ${style.c} flex items-center justify-center shrink-0 shadow-sm border border-white/50 dark:border-slate-600">
                                <i class="fa-solid ${style.i} text-sm"></i>
                            </div>
                            <div>
                                <p class="font-extrabold text-slate-800 dark:text-white text-sm">${cat.name}</p>
                                <p class="text-[10px] text-slate-400 font-semibold mt-0.5">${catTx.length} Transaksi Tercatat</p>
                            </div>
                        </div>
                        ${txHtml}
                    </td>
                    <td class="px-5 py-4 align-top pt-6">
                        <span class="px-2.5 py-1 ${badgeClass} text-[10px] rounded-lg font-black uppercase shadow-sm">${cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
                    </td>
                    <td class="px-5 py-4 text-center align-top pt-5">
                        <button onclick="deleteCategory('${cat.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center mx-auto transition-colors shadow-sm" title="Hapus Kategori">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    };

    // Jalankan render per grup
    renderGroup(incomeCats, 'Pemasukan', 'text-emerald-600 dark:text-emerald-400', 'bg-emerald-100 text-emerald-600 border border-emerald-200');
    renderGroup(expenseCats, 'Pengeluaran', 'text-rose-600 dark:text-rose-400', 'bg-rose-100 text-rose-600 border border-rose-200');
    
    // Jika hasil pencarian kosong
    if (incomeCats.length === 0 && expenseCats.length === 0) {
        listEl.innerHTML = `<tr><td colspan="3" class="px-5 py-10 text-center"><div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><i class="fa-solid fa-magnifying-glass"></i></div><p class="text-slate-400 text-sm font-bold">Kategori tidak ditemukan.</p></td></tr>`;
    }
}

const categoryForm = document.getElementById('categoryForm');
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const name = document.getElementById('newCategoryName').value.trim(); const type = document.getElementById('newCategoryType').value;
        const { data } = await db.from('categories').insert([{ name, type, user_id: currentUser.id }]).select();
        if (data) { categories.push(data[0]); document.getElementById('newCategoryName').value = ''; renderMasterCategories(); updateCategoryOptions(); applyFilter(); }
    });
}
async function deleteCategory(id) {
    if (transactions.some(t => t.category_id === id)) return await showCustomModal({ title: "Perhatian", message: "Kategori sedang digunakan oleh transaksi." });
    const confirmed = await showCustomModal({ title: "Hapus Kategori", message: "Hapus kategori ini dari master data?" });
    if (confirmed) { await db.from('categories').delete().eq('id', id); categories = categories.filter(c => c.id !== id); renderMasterCategories(); updateCategoryOptions(); }
}
function updateCategoryOptions() {
    const typeEl = document.querySelector('input[name="type"]:checked'); if (!typeEl) return;
    const catSelect = document.getElementById('category'); if (!catSelect) return; catSelect.innerHTML = '';
    categories.filter(c => c.type === typeEl.value).forEach(cat => catSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`);
}

function updateSpecificWalletOptions() {
    const options = `<option value="">Tanpa Dompet (Langsung Saldo Utama)</option>` + wallets.map(w => `<option value="${w.id}">${w.name} (${formatRupiah(w.balance)})</option>`).join('');
    const ws = document.getElementById('walletSelect'); if(ws) ws.innerHTML = options;
    const cs = document.getElementById('charityWalletSelect'); if(cs) cs.innerHTML = options;
    const ds = document.getElementById('debtWalletSelect'); if(ds) ds.innerHTML = options;
}

function renderWalletCards() {
    const container = document.getElementById('walletCardList'); if (!container) return; container.innerHTML = '';
    if (wallets.length === 0) { container.innerHTML = `<p class="text-xs text-slate-400 col-span-full py-6 text-center">Belum ada dompet terdaftar.</p>`; return; }
    wallets.forEach(w => {
        container.innerHTML += `<div class="bg-gradient-to-br from-[var(--card-bg-1)] via-[var(--card-bg-2)] to-[var(--card-bg-3)] border border-theme-500/30 p-6 rounded-[1.5rem] flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all"><div class="flex justify-between items-start"><div><h4 class="font-extrabold text-[var(--text-main)] text-lg tracking-wide">${w.name}</h4></div><button onclick="deleteWallet('${w.id}')" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"><i class="fa-solid fa-trash-can text-xs"></i></button></div><div class="mt-8 pt-4 border-t border-[var(--card-border)] flex justify-between items-end"><div><span class="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">Saldo Tersedia</span><span class="font-black text-theme-500 text-xl tracking-tight">${formatRupiah(w.balance)}</span></div></div></div>`;
    });
}
function openWalletModal() { const m = document.getElementById('walletModal'); m.classList.remove('hidden'); setTimeout(() => { m.classList.add('opacity-100'); document.getElementById('walletModalContent').classList.replace('scale-95', 'scale-100'); }, 10); }
function closeWalletModal() { const m = document.getElementById('walletModal'); m.classList.remove('opacity-100'); document.getElementById('walletModalContent').classList.replace('scale-100', 'scale-95'); setTimeout(() => m.classList.add('hidden'), 300); }
async function submitWalletForm() {
    if (!currentUser) return;
    const name = document.getElementById('walletNameInput').value.trim(); const balance = parseRupiah(document.getElementById('walletBalanceInput').value);
    if (!name) return alert("Nama dompet harus diisi!");
    const { data } = await db.from('wallets').insert([{ name, balance, user_id: currentUser.id }]).select();
    if (data && data.length > 0) { wallets.push(data[0]); renderWalletCards(); updateSpecificWalletOptions(); closeWalletModal(); applyFilter(); }
}
async function deleteWallet(id) { const confirmed = await showCustomModal({ title: "Hapus Dompet", message: "Hapus dompet ini?" }); if (confirmed) { await db.from('wallets').delete().eq('id', id); wallets = wallets.filter(w => w.id !== id); renderWalletCards(); updateSpecificWalletOptions(); applyFilter(); } }

function updateSummary(filtered) {
    let totalWalletBalance = 0; 
    wallets.forEach(w => totalWalletBalance += Number(w.balance));

    let netTransactions = 0; 
    transactions.forEach(t => { 
        if (t.type === 'income') {
            netTransactions += Number(t.amount); 
        } else {
            netTransactions -= Number(t.amount); 
        }
    });

    let totalBalance = wallets.length > 0 ? (totalWalletBalance + netTransactions) : netTransactions;
    let inc = 0; let exp = 0; 
    filtered.forEach(t => { 
        if (t.type === 'income') inc += Number(t.amount); 
        else exp += Number(t.amount); 
    });
    
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
        document.getElementById('dashTotalBalance').innerText = 'Rp ••••••••'; 
        if(document.getElementById('dashTotalPiutang')) document.getElementById('dashTotalPiutang').innerText = 'Rp ••••••'; 
        if(document.getElementById('dashTotalUtang')) document.getElementById('dashTotalUtang').innerText = 'Rp ••••••';
        document.getElementById('dashTotalIncome').innerText = 'Rp ••••••';
        document.getElementById('dashTotalExpense').innerText = 'Rp ••••••';
    } else {
        document.getElementById('dashTotalBalance').innerText = formatRupiah(totalBalance); 
        if(document.getElementById('dashTotalPiutang')) document.getElementById('dashTotalPiutang').innerText = formatRupiah(totalPiutang); 
        if(document.getElementById('dashTotalUtang')) document.getElementById('dashTotalUtang').innerText = formatRupiah(totalUtang);
        document.getElementById('dashTotalIncome').innerText = formatRupiah(inc);
        document.getElementById('dashTotalExpense').innerText = formatRupiah(exp);
    }
    
    if(document.getElementById('dashPiutangDetail')) {
        document.getElementById('dashPiutangDetail').innerHTML = latestPiutangText; 
        document.getElementById('dashUtangDetail').innerHTML = latestUtangText;
        document.getElementById('dashPiutangUnpaid').innerText = `${piutangUnpaid} Belum Lunas`; 
        document.getElementById('dashPiutangOverdue').innerText = `${piutangOverdue} Lewat Tempo`;
        document.getElementById('dashUtangUnpaid').innerText = `${utangUnpaid} Belum Lunas`; 
        document.getElementById('dashUtangOverdue').innerText = `${utangOverdue} Lewat Tempo`;
    }
    // Pembaruan dinamis tanda seru di menu sidebar
    const sideDebtBtn = document.getElementById('side-debt');
    if (sideDebtBtn) {
        // piutangUnpaid dan utangUnpaid sudah dihitung di fungsi updateSummary ini
        const hasUnpaid = (piutangUnpaid > 0 || utangUnpaid > 0);
        sideDebtBtn.innerHTML = `<div class="flex items-center gap-3.5"><i class="fa-solid fa-handshake w-5 text-center text-lg"></i> <span>Utang & Piutang</span></div>${hasUnpaid ? '<span class="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">!</span>' : ''}`;
    }
  // Ini adalah kurung tutup fungsi updateSummary yang sudah ada
}


function updateDashboardLists(filtered) {
    const listIn = document.getElementById('listPemasukanDashboard'); const listOut = document.getElementById('listPengeluaranDashboard');
    if (!listIn || !listOut) return; listIn.innerHTML = ''; listOut.innerHTML = '';
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    let inCount = 0; let outCount = 0;
    
    sorted.forEach(t => {
        const catName = getCategoryName(t.category_id); const style = getCategoryStyle(catName); const descText = t.description ? t.description : catName;
        const pillBadge = `<span class="inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold ${style.b} ${style.c}">${descText}</span>`;
        const row = `<div class="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border-b border-slate-50 dark:border-slate-700/30 transition-colors group"><div class="flex items-start gap-3"><div class="w-10 h-10 rounded-full ${style.b} ${style.c} flex items-center justify-center shrink-0 mt-0.5"><i class="fa-solid ${style.i}"></i></div><div><h4 class="text-xs font-bold text-slate-800 dark:text-white">${catName}</h4><p class="text-[10px] text-slate-400 font-medium mb-0.5">${new Date(t.date).toLocaleDateString('id-ID')}</p>${pillBadge}</div></div><div class="flex flex-col items-end gap-2"><div class="text-right"><p class="text-sm font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}">${formatRupiah(t.amount)}</p></div><div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onclick="editTx('${t.id}')" class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-theme-600 flex items-center justify-center"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button><button onclick="deleteTx('${t.id}')" class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-red-500 flex items-center justify-center"><i class="fa-solid fa-trash-can text-[10px]"></i></button></div></div></div>`;
        if(t.type === 'income') { listIn.innerHTML += row; inCount++; } else { listOut.innerHTML += row; outCount++; }
    });
    if(inCount === 0) listIn.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Tidak ada pemasukan.</div>`;
    if(outCount === 0) listOut.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Tidak ada pengeluaran.</div>`;
}

function switchRekapTab(tab) {
    currentRekapTab = tab;
    ['daily', 'monthly', 'yearly'].forEach(t => { const btn = document.getElementById(`rekapBtn-${t}`); if(btn) btn.className = t === tab ? "px-4 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 shadow-sm text-theme-600 dark:text-theme-300" : "px-4 py-2 text-xs font-bold rounded-lg text-slate-500"; });
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
        tbody.innerHTML += `<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><td class="px-5 py-4 text-slate-800 dark:text-white">${displayLabel}</td><td class="px-5 py-4 text-right text-emerald-600">+ ${formatRupiah(data.income)}</td><td class="px-5 py-4 text-right text-red-500">- ${formatRupiah(data.expense)}</td><td class="px-5 py-4 text-right font-black ${net >= 0 ? 'text-theme-600' : 'text-rose-600'}">${formatRupiah(net)}</td></tr>`;
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
    document.getElementById('reportTotalExpense').innerText = formatRupiah(totalExp); document.getElementById('reportNetProfit').innerText = formatRupiah(totalInc - totalExp);
    
    if (Object.keys(catMap).length === 0) { ledgerContainer.innerHTML = `<div class="text-center py-8 text-slate-400">Belum ada data transaksi.</div>`; return; }
    Object.keys(catMap).forEach(cat => {
        const data = catMap[cat]; let tableRows = '';
        data.items.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(item => { tableRows += `<tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50"><td class="px-6 py-3.5 text-xs font-bold text-slate-500 w-36">${new Date(item.date).toLocaleDateString('id-ID')}</td><td class="px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-white">${item.description || '-'}</td><td class="px-6 py-3.5 text-sm text-right font-black w-44 ${data.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">${formatRupiah(item.amount)}</td></tr>`; });
        const style = getCategoryStyle(cat);
        ledgerContainer.innerHTML += `<div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden mb-6 shadow-sm bg-white dark:bg-slate-800"><div class="bg-slate-50 dark:bg-slate-700/30 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center"><h5 class="font-extrabold text-slate-800 dark:text-white flex items-center gap-3"><div class="w-9 h-9 rounded-xl bg-theme-100 text-theme-600 flex items-center justify-center"><i class="fa-solid ${style.i}"></i></div> <span class="text-base">${cat}</span></h5><span class="text-xs font-extrabold px-3.5 py-1.5 rounded-xl ${data.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">Total: ${formatRupiah(data.total)}</span></div><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50/60 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase text-slate-400 font-extrabold"><th class="px-6 py-3 w-36">Tanggal</th><th class="px-6 py-3">Keterangan</th><th class="px-6 py-3 text-right w-44">Nominal</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`;
    });
}

function updateDashboardChart(filtered) {
    const ctx = document.getElementById('dashboardChart'); if (!ctx) return; if (dashboardChart) dashboardChart.destroy();
    const dateMap = {}; [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => { const d = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); if (!dateMap[d]) dateMap[d] = { income: 0, expense: 0 }; if (t.type === 'income') dateMap[d].income += Number(t.amount); else dateMap[d].expense += Number(t.amount); });
    const labels = Object.keys(dateMap);
    dashboardChart = new Chart(ctx, { type: 'bar', data: { labels: labels.length ? labels : ['Belum ada data'], datasets: [ { label: 'Pemasukan', data: labels.map(l => dateMap[l].income), backgroundColor: '#10b981', borderRadius: 6 }, { label: 'Pengeluaran', data: labels.map(l => dateMap[l].expense), backgroundColor: '#ef4444', borderRadius: 6 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
}

function updateCategoryPage(filtered) {
    const incList = document.getElementById('incomeCategoryList'); const expList = document.getElementById('expenseCategoryList');
    if (!incList || !expList) return; incList.innerHTML = ''; expList.innerHTML = '';
    const catTotals = { income: {}, expense: {} }; let totalInc = 0; let totalExp = 0;
    filtered.forEach(t => { const catName = getCategoryName(t.category_id); if (t.type === 'income') { catTotals.income[catName] = (catTotals.income[catName] || 0) + Number(t.amount); totalInc += Number(t.amount); } else { catTotals.expense[catName] = (catTotals.expense[catName] || 0) + Number(t.amount); totalExp += Number(t.amount); } });
    for (const [cat, amt] of Object.entries(catTotals.expense).sort((a, b) => b[1] - a[1])) { const percent = totalExp > 0 ? ((amt / totalExp) * 100).toFixed(1) : 0; const style=getCategoryStyle(cat); expList.innerHTML += `<div><div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-slate-700 dark:text-slate-200 flex items-center gap-2"><i class="fa-solid ${style.i} ${style.c} w-4 text-center"></i> ${cat}</span><span class="text-slate-600 dark:text-slate-300">${formatRupiah(amt)} (${percent}%)</span></div><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden"><div class="bg-red-500 h-2.5 rounded-full" style="width: ${percent}%"></div></div></div>`; }
    for (const [cat, amt] of Object.entries(catTotals.income).sort((a, b) => b[1] - a[1])) { const percent = totalInc > 0 ? ((amt / totalInc) * 100).toFixed(1) : 0; const style=getCategoryStyle(cat); incList.innerHTML += `<div><div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-slate-700 dark:text-slate-200 flex items-center gap-2"><i class="fa-solid ${style.i} ${style.c} w-4 text-center"></i> ${cat}</span><span class="text-slate-600 dark:text-slate-300">${formatRupiah(amt)} (${percent}%)</span></div><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden"><div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${percent}%"></div></div></div>`; }
}

function updateClock() { const timeEl = document.getElementById('liveTime'); if (!timeEl) return; const now = new Date(); timeEl.innerHTML = `<i class="fa-regular fa-clock text-theme-500"></i> <span>${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} • ${now.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'][now.getMonth()]}</span>`; } setInterval(updateClock, 1000); updateClock();

function openModal() { updateCategoryOptions(); updateSpecificWalletOptions(); const m = document.getElementById('transactionModal'); m.classList.remove('hidden'); setTimeout(() => m.classList.add('opacity-100'), 10); }
function closeModal() { const m = document.getElementById('transactionModal'); m.classList.remove('opacity-100'); setTimeout(() => { m.classList.add('hidden'); document.getElementById('transactionForm').reset(); document.getElementById('date').valueAsDate = new Date(); editingTransactionId = null; }, 300); }
function editTx(id) {
    const t = transactions.find(x => x.id === id); if (!t) return; editingTransactionId = id; document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
    updateCategoryOptions(); updateSpecificWalletOptions(); document.getElementById('category').value = t.category_id || '';
    document.getElementById('walletSelect').value = t.wallet_id || '';
    document.getElementById('amount').value = new Intl.NumberFormat('id-ID').format(t.amount); document.getElementById('description').value = t.description; document.getElementById('date').value = t.date; openModal();
}
const txForm = document.getElementById('transactionForm');
if (txForm) {
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return;
        try {
            const type = document.querySelector('input[name="type"]:checked').value; const category_id = document.getElementById('category').value; 
            const wallet_id = document.getElementById('walletSelect').value || null; const amount = parseRupiah(document.getElementById('amount').value); 
            const description = document.getElementById('description').value; const date = document.getElementById('date').value; 
            const txData = { type, category_id, wallet_id, amount, description, date, user_id: currentUser.id };
            
            if (editingTransactionId) {
                const oldTx = transactions.find(t => t.id === editingTransactionId); 
                if (oldTx.wallet_id) {
                    const oldWallet = wallets.find(w => w.id === oldTx.wallet_id);
                    if(oldWallet) { if(oldTx.type === 'income') oldWallet.balance -= Number(oldTx.amount); else oldWallet.balance += Number(oldTx.amount); await db.from('wallets').update({ balance: oldWallet.balance }).eq('id', oldWallet.id); }
                }
                if (wallet_id) {
                    const newWallet = wallets.find(w => w.id === wallet_id);
                    if(newWallet) { if(type === 'income') newWallet.balance += amount; else newWallet.balance -= amount; await db.from('wallets').update({ balance: newWallet.balance }).eq('id', wallet_id); }
                }
                await db.from('transactions').update(txData).eq('id', editingTransactionId);
                const idx = transactions.findIndex(t => t.id === editingTransactionId); if (idx !== -1) transactions[idx] = { id: editingTransactionId, ...txData };
            } else {
                const { data } = await db.from('transactions').insert([txData]).select(); if (data) transactions.push(data[0]);
                if (wallet_id) {
                    const targetWallet = wallets.find(w => w.id === wallet_id);
                    if (targetWallet) {
                        let currentBalance = Number(targetWallet.balance); if (type === 'income') currentBalance += amount; else currentBalance -= amount;
                        await db.from('wallets').update({ balance: currentBalance }).eq('id', wallet_id); targetWallet.balance = currentBalance;
                    }
                }
            }
            renderWalletCards(); updateSpecificWalletOptions(); applyFilter(); closeModal();
        } catch (err) { await showCustomModal({ title: "Gagal Menyimpan", message: err.message }); }
    });
}
async function deleteTx(id) { 
    const confirmed = await showCustomModal({ title: "Hapus Transaksi", message: "Hapus transaksi ini? Saldo dompet akan disesuaikan kembali." }); if (!confirmed) return;
    const txToDelete = transactions.find(t => t.id === id); if (!txToDelete) return;
    await db.from('transactions').delete().eq('id', id);
    if (txToDelete.wallet_id) {
        const targetWallet = wallets.find(w => w.id === txToDelete.wallet_id);
        if (targetWallet) {
            let currentBalance = Number(targetWallet.balance); if (txToDelete.type === 'income') currentBalance -= Number(txToDelete.amount); else currentBalance += Number(txToDelete.amount);
            await db.from('wallets').update({ balance: currentBalance }).eq('id', txToDelete.wallet_id); targetWallet.balance = currentBalance;
        }
    }
    transactions = transactions.filter(t => t.id !== id); renderWalletCards(); updateSpecificWalletOptions(); applyFilter();
}

async function toggleDebtStatus(id, newStatus) {
    if (!currentUser) return; const debt = debts.find(d => d.id === id); if (!debt) return;
    await db.from('debts').update({ status: newStatus }).eq('id', id); debt.status = newStatus; renderWalletCards(); updateSpecificWalletOptions(); renderDebtPage(); applyFilter();
}

async function submitDebtForm() {
    if (!currentUser) return;
    const person_name = document.getElementById('debtPerson').value.trim(); 
    const type = document.getElementById('debtType').value; 
    const amount = parseRupiah(document.getElementById('debtAmount').value); 
    const due_date = document.getElementById('debtDueDate').value;
    const wallet_id = document.getElementById('debtWalletSelect').value || null;

    if(!person_name || amount <= 0 || !due_date) return await showCustomModal({ title: "Perhatian", message: "Harap isi semua kolom!" });

    if (wallet_id) {
        const targetWallet = wallets.find(w => w.id === wallet_id);
        const newBalance = type === 'payable' ? Number(targetWallet.balance) + amount : Number(targetWallet.balance) - amount;
        await db.from('wallets').update({ balance: newBalance }).eq('id', targetWallet.id); targetWallet.balance = newBalance;
    }

    const { data } = await db.from('debts').insert([{ user_id: currentUser.id, person_name, type, amount, due_date, status: 'unpaid' }]).select();
    if (data) debts.push(data[0]);

    document.getElementById('debtForm').reset(); renderWalletCards(); renderDebtPage(); applyFilter();
    await showCustomModal({ title: "Berhasil", message: "Catatan utang/piutang berhasil disimpan." });
}

function renderDebtPage() {
    const listEl = document.getElementById('debtTableList'); if(!listEl) return; listEl.innerHTML = '';
    if(debts.length === 0) { listEl.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-slate-400">Belum ada catatan.</td></tr>`; return; }
    debts.forEach(d => {
        const isPayable = d.type === 'payable';
        const typeBadge = isPayable ? `<span class="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] rounded-md font-bold uppercase">Saya Ngutang</span>` : `<span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] rounded-md font-bold uppercase">Orang Ngutang</span>`;
        const statusBadge = d.status === 'paid' ? `<span class="text-xs font-bold text-slate-400">Lunas</span>` : `<button onclick="toggleDebtStatus('${d.id}', 'paid')" class="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">Tandai Lunas</button>`;
        listEl.innerHTML += `<tr class="hover:bg-slate-50 border-b border-slate-100 dark:border-slate-700"><td class="px-5 py-4 font-bold text-slate-800 dark:text-white">${d.person_name}</td><td class="px-5 py-4">${typeBadge}</td><td class="px-5 py-4 text-right font-black ${isPayable ? 'text-rose-500' : 'text-emerald-500'}">${formatRupiah(d.amount)}</td><td class="px-5 py-4 text-xs font-bold text-slate-500">${new Date(d.due_date).toLocaleDateString('id-ID')}</td><td class="px-5 py-4 text-center">${statusBadge}</td><td class="px-5 py-4 text-center"><button onclick="deleteDebt('${d.id}')" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    });
}
async function deleteDebt(id) { const confirmed = await showCustomModal({ title: "Hapus", message: "Hapus catatan ini?" }); if (confirmed) { await db.from('debts').delete().eq('id', id); debts = debts.filter(d => d.id !== id); renderDebtPage(); applyFilter(); } }

const charityForm = document.getElementById('charityForm');
if (charityForm) {
    charityForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return;
        try {
            const type = document.getElementById('charityType').value; const amount = parseRupiah(document.getElementById('charityAmount').value);
            const { data } = await db.from('charity_records').insert([{ type, amount, date: new Date().toISOString().split('T')[0], user_id: currentUser.id }]).select();
            if (data) charityRecords.push(data[0]);
            document.getElementById('charityForm').reset(); renderCharityPage();
            await showCustomModal({ title: "Berhasil", message: "Sedekah berhasil dicatat." });
        } catch (err) { await showCustomModal({ title: "Gagal", message: err.message }); }
    });
}
function renderCharityPage() {
    const listEl = document.getElementById('charityTableList'); const totalEl = document.getElementById('totalCharityAmount');
    if (!listEl) return; listEl.innerHTML = ''; let total = 0;
    if (charityRecords.length === 0) { listEl.innerHTML = `<tr><td colspan="4" class="px-5 py-8 text-center text-slate-400">Belum ada histori.</td></tr>`; if(totalEl) totalEl.innerText = formatRupiah(0); return; }
    charityRecords.forEach(c => {
        total += Number(c.amount);
        listEl.innerHTML += `<tr class="hover:bg-slate-50 border-b border-slate-100 dark:border-slate-700"><td class="px-5 py-4 text-xs font-bold text-slate-400">${new Date(c.date).toLocaleDateString('id-ID')}</td><td class="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">${c.type}</td><td class="px-5 py-4 text-right font-black text-emerald-500">+ ${formatRupiah(c.amount)}</td><td class="px-5 py-4 text-center"><button onclick="deleteCharity('${c.id}')" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    });
    if (totalEl) totalEl.innerText = formatRupiah(total);
}
async function deleteCharity(id) { const confirmed = await showCustomModal({ title: "Hapus Catatan", message: "Hapus sedekah ini?" }); if (confirmed) { await db.from('charity_records').delete().eq('id', id); charityRecords = charityRecords.filter(c => c.id !== id); renderCharityPage(); } }

const savingsForm = document.getElementById('savingsForm');
if (savingsForm) {
    savingsForm.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!currentUser) return;
        const title = document.getElementById('savingsTitle').value.trim(); const target_amount = parseRupiah(document.getElementById('savingsTargetAmount').value);
        const { data } = await db.from('savings_goals').insert([{ title, target_amount, current_amount: 0, user_id: currentUser.id }]).select();
        if (data) { savingsGoals.push(data[0]); document.getElementById('savingsForm').reset(); renderSavingsPage(); }
    });
}
function renderSavingsPage() {
    const grid = document.getElementById('savingsGrid'); if (!grid) return; grid.innerHTML = '';
    if (savingsGoals.length === 0) return grid.innerHTML = `<div class="col-span-2 py-8 text-center text-slate-400">Belum ada target tabungan.</div>`;
    savingsGoals.forEach(g => {
        const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0;
        grid.innerHTML += `<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"><div><div class="flex justify-between items-start"><h4 class="font-extrabold text-slate-800 dark:text-white text-lg">${g.title}</h4><button onclick="deleteSavings('${g.id}')" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></div><div class="flex justify-between text-xs font-bold text-slate-400 mt-4 mb-2"><span>Terkumpul: ${formatRupiah(g.current_amount)}</span><span>Target: ${formatRupiah(g.target_amount)}</span></div><div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5"><div class="bg-theme-500 h-2.5 rounded-full" style="width: ${pct}%"></div></div></div><button onclick="addSavingsProgress('${g.id}')" class="mt-5 w-full bg-theme-50 dark:bg-theme-900/30 text-theme-600 dark:text-theme-400 py-2.5 text-xs font-bold rounded-xl">+ Setor Tabungan</button></div>`;
    });
}
async function addSavingsProgress(id) {
    const goal = savingsGoals.find(g => g.id === id); if (!goal) return;
    const nominalStr = await showCustomModal({ title: `Setor ke ${goal.title}`, message: "Masukkan jumlah setoran:", isPrompt: true, placeholder: "Contoh: 50000" });
    const amt = parseRupiah(nominalStr || '0'); if (amt <= 0) return;
    goal.current_amount = Number(goal.current_amount) + amt;
    await db.from('savings_goals').update({ current_amount: goal.current_amount }).eq('id', id);
    renderSavingsPage();
}
async function deleteSavings(id) { const confirmed = await showCustomModal({ title: "Hapus Target", message: "Hapus impian ini?" }); if (confirmed) { await db.from('savings_goals').delete().eq('id', id); savingsGoals = savingsGoals.filter(g => g.id !== id); renderSavingsPage(); } }

let customModalCallback = null;
function showCustomModal({ title, message, isPrompt = false, placeholder = '' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal'); const content = document.getElementById('customConfirmContent');
        document.getElementById('confirmTitle').innerText = title; document.getElementById('confirmMessage').innerText = message;
        const inputWrapper = document.getElementById('confirmInputWrapper'); const inputEl = document.getElementById('customPromptInput');
        if (isPrompt) { inputWrapper.classList.remove('hidden'); inputEl.placeholder = placeholder; inputEl.value = ''; setTimeout(() => inputEl.focus(), 100); } else { inputWrapper.classList.add('hidden'); }
        modal.classList.remove('hidden'); setTimeout(() => { modal.classList.add('opacity-100'); content.classList.replace('scale-95', 'scale-100'); }, 10);
        customModalCallback = (result) => { modal.classList.remove('opacity-100'); content.classList.replace('scale-100', 'scale-95'); setTimeout(() => { modal.classList.add('hidden'); resolve(isPrompt && result ? inputEl.value : result); }, 200); };
    });
}
function closeCustomModal(result) { if (customModalCallback) { customModalCallback(result); customModalCallback = null; } }

async function exportDataJSON() {
    if (!currentUser) return;
    const confirmed = await showCustomModal({ title: "Backup Data", message: "Unduh file cadangan seluruh data Anda?" }); if (!confirmed) return;
    const backupData = { transactions, categories, wallets, debts, savingsGoals, charityRecords };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a'); downloadAnchor.setAttribute("href", dataStr); downloadAnchor.setAttribute("download", `backup_ngaturduit.json`);
    document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
}

async function importDataJSON(input) {
    if (!currentUser) return;
    const file = input.files[0]; if (!file) return; const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            
            // Mengembalikan Dompet & Kategori (Master Data)
            if (parsedData.categories?.length) await db.from('categories').insert(parsedData.categories.map(c => ({ ...c, user_id: currentUser.id })));
            if (parsedData.wallets?.length) await db.from('wallets').insert(parsedData.wallets.map(w => ({ ...w, user_id: currentUser.id })));
            
            // Mengembalikan Transaksi dan Fitur VVIP lainnya
            if (parsedData.transactions?.length) await db.from('transactions').insert(parsedData.transactions.map(t => ({ ...t, user_id: currentUser.id })));
            if (parsedData.debts?.length) await db.from('debts').insert(parsedData.debts.map(d => ({ ...d, user_id: currentUser.id })));
            if (parsedData.savingsGoals?.length) await db.from('savings_goals').insert(parsedData.savingsGoals.map(s => ({ ...s, user_id: currentUser.id })));
            if (parsedData.charityRecords?.length) await db.from('charity_records').insert(parsedData.charityRecords.map(c => ({ ...c, user_id: currentUser.id })));

            await showCustomModal({ title: "Berhasil", message: "Seluruh data berhasil dipulihkan secara utuh!" }); 
            location.reload();
        } catch (err) { 
            await showCustomModal({ title: "Gagal", message: "Gagal memulihkan data. Pastikan file JSON valid." }); 
        } finally { 
            input.value = ''; 
        }
    }; 
    reader.readAsText(file);
}

async function resetAllData() {

    if (!currentUser) return;

    // Konfirmasi Pertama
    const confirm1 = await showCustomModal({ 
        title: "Peringatan Keras!", 
        message: "Anda yakin ingin mereset SELURUH data? Semua transaksi, daftar dompet, utang, sedekah, dan impian akan dihapus secara permanen dan tidak dapat dipulihkan." 
    });
    
    if (!confirm1) return;

    // Konfirmasi Kedua (Validasi Ketikan)
    const confirmWord = await showCustomModal({ 
        title: "Konfirmasi Terakhir", 
        message: "Ketik 'HAPUS' (tanpa tanda kutip, huruf besar semua) untuk memverifikasi tindakan Anda:",
        isPrompt: true,
        placeholder: "Ketik HAPUS di sini..."
    });

    if (confirmWord !== "HAPUS") {
        await showCustomModal({ title: "Dibatalkan", message: "Kata kunci salah atau dibatalkan. Data Anda aman." });
        return;
    }

    try {
        // Proses penghapusan data secara berurutan di Supabase berdasarkan ID pengguna
        await db.from('transactions').delete().eq('user_id', currentUser.id);
        await db.from('wallets').delete().eq('user_id', currentUser.id);
        await db.from('debts').delete().eq('user_id', currentUser.id);
        await db.from('savings_goals').delete().eq('user_id', currentUser.id);
        await db.from('charity_records').delete().eq('user_id', currentUser.id);
        await db.from('categories').delete().eq('user_id', currentUser.id); 
        // Catatan: Profil/Akun (profiles) tidak ikut dihapus agar pengguna tetap bisa login
        
        await showCustomModal({ title: "Berhasil Di-reset", message: "Seluruh data aplikasi Anda telah dibersihkan seperti baru." });
        
        // Memuat ulang (refresh) halaman agar state lokal dibersihkan sepenuhnya dan kembali ke pengaturan awal
        location.reload();
        
    } catch (err) {
        await showCustomModal({ title: "Gagal Reset", message: "Terjadi kesalahan: " + err.message });
    }
}