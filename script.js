const supabaseUrl = 'https://onssvkrjtoqxzdvjbeob.supabase.co';
const supabaseKey = 'sb_publishable_YXYOrvgDRHCxKJ1eorzmjg_1dcrPMmi';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let transactions = [];
let categories = []; 
let budgets = []; 
let savingsGoals = [];
let charityRecords = [];
let debts = []; 
let wallets = [];
let currentFilter = 'all'; 
let currentUser = null;
let editingTransactionId = null; 
let dashboardChart = null; 
let isShowingAll = false; 
let isBalanceHidden = false; 
let userProfileData = { full_name: '', phone: '', job: '', address: '', avatar_url: '' };

let cropperImage = new Image();
let currentZoom = 1;
let imageOffsetX = 0;
let imageOffsetY = 0;
let isDragging = false;
let startX, startY;

db.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('flex');
        init();
    } else {
        currentUser = null;
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('flex');
        transactions = []; categories = []; budgets = []; savingsGoals = []; charityRecords = []; debts = []; wallets = [];
    }
});

async function handleAuth(actionType) {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return alert("Harap isi email dan password!");
    
    const btn = document.querySelector(`button[onclick="handleAuth('${actionType}')"]`);
    const originalText = btn.innerText;
    btn.innerText = "Memproses...";
    
    try {
        if (actionType === 'login') await db.auth.signInWithPassword({ email, password });
        else if (actionType === 'register') await db.auth.signUp({ email, password });
    } catch (err) {
        alert("Gagal memproses otentikasi.");
    } finally {
        btn.innerText = originalText;
    }
}

async function handleLogout() { await db.auth.signOut(); }

function switchPage(page) {
    const pages = ['home', 'category', 'masterCategory', 'report', 'charity', 'savings', 'profile', 'debt'];
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        const nav = document.getElementById(`nav-${p}`);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
        if (nav) nav.className = "px-5 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2";
    });

    const activeEl = document.getElementById(`page-${page}`);
    const activeNav = document.getElementById(`nav-${page}`);
    if (activeEl) { activeEl.classList.remove('hidden'); activeEl.classList.add('flex'); }
    if (activeNav) activeNav.className = "px-5 py-2.5 rounded-full bg-slate-800 text-white font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-md shadow-slate-200";
    
    if (page === 'profile') updateProfilePage();
    if (page === 'savings') renderSavingsPage();
    if (page === 'charity') renderCharityPage();
    if (page === 'debt') {
        renderDebtPage();
        const debtDateInput = document.getElementById('debtDueDate');
        if (debtDateInput && !debtDateInput.value) {
            debtDateInput.valueAsDate = new Date();
        }
    }
}

function formatRupiah(number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number); }
function parseRupiah(str) { return parseInt(str.replace(/[^,\d]/g, ''), 10) || 0; }
function formatRupiahInput(input) {
    let val = input.value.replace(/[^,\d]/g, '');
    if (val) input.value = new Intl.NumberFormat('id-ID').format(parseInt(val, 10));
    else input.value = '';
}
function isThisMonth(dateString) {
    const today = new Date(); const d = new Date(dateString);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}
function getCategoryName(categoryId) {
    if (!categoryId) return 'Tanpa Kategori';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Terhapus';
}

function getCategoryIcon(catName) {
    const name = (catName || '').toLowerCase();
    if (name.includes('makan') || name.includes('minum') || name.includes('konsumsi') || name.includes('jajan') || name.includes('kopi') || name.includes('resto') || name.includes('cemil') || name.includes('food') || name.includes('sarapan')) return 'fa-utensils';
    if (name.includes('transport') || name.includes('bensin') || name.includes('parkir') || name.includes('tol') || name.includes('gojek') || name.includes('grab') || name.includes('tiket') || name.includes('kereta')) return 'fa-car-side';
    if (name.includes('gaji') || name.includes('upah') || name.includes('bonus') || name.includes('thr') || name.includes('pemasukan') || name.includes('pendapatan') || name.includes('profit')) return 'fa-money-bill-wave';
    if (name.includes('listrik') || name.includes('air') || name.includes('tagihan') || name.includes('pln') || name.includes('pdam') || name.includes('token')) return 'fa-bolt';
    if (name.includes('belanja') || name.includes('shopping') || name.includes('baju') || name.includes('pakaian') || name.includes('mall') || name.includes('pasar') || name.includes('sepatu')) return 'fa-bag-shopping';
    if (name.includes('sehat') || name.includes('obat') || name.includes('dokter') || name.includes('rs') || name.includes('klinik') || name.includes('bpjs') || name.includes('vitamin')) return 'fa-notes-medical';
    if (name.includes('hiburan') || name.includes('main') || name.includes('game') || name.includes('nonton') || name.includes('bioskop') || name.includes('liburan') || name.includes('netflix') || name.includes('rekreasi')) return 'fa-film';
    if (name.includes('pendidikan') || name.includes('sekolah') || name.includes('buku') || name.includes('spp') || name.includes('les') || name.includes('kuliah') || name.includes('kursus')) return 'fa-graduation-cap';
    if (name.includes('pulsa') || name.includes('internet') || name.includes('kuota') || name.includes('wifi') || name.includes('paket data') || name.includes('telkomsel')) return 'fa-wifi';
    if (name.includes('sedekah') || name.includes('donasi') || name.includes('zakat') || name.includes('infak') || name.includes('amal')) return 'fa-hand-holding-heart';
    if (name.includes('tabung') || name.includes('invest') || name.includes('saham') || name.includes('emas') || name.includes('reksa') || name.includes('deposito')) return 'fa-piggy-bank';
    if (name.includes('kos') || name.includes('kontrakan') || name.includes('sewa') || name.includes('kpr') || name.includes('rumah')) return 'fa-house';
    if (name.includes('olahraga') || name.includes('gym') || name.includes('futsal') || name.includes('renang') || name.includes('sepeda')) return 'fa-dumbbell';
    if (name.includes('servis') || name.includes('bengkel') || name.includes('oli') || name.includes('cuci')) return 'fa-wrench';
    if (name.includes('anak') || name.includes('bayi') || name.includes('susu') || name.includes('popok')) return 'fa-baby';
    if (name.includes('hadiah') || name.includes('kado')) return 'fa-gift';
    return 'fa-tag'; 
}

function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden; 
    const eyeIcon = document.getElementById('toggleEyeIcon');
    if (isBalanceHidden) {
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash'); 
    } else {
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye'); 
    }
    applyFilter(); 
}

async function init() {
    if (!currentUser) return;
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();

    const debtDateInput = document.getElementById('debtDueDate');
    if (debtDateInput) debtDateInput.valueAsDate = new Date();

    try {
        await fetchUserProfile();
        const catRes = await db.from('categories').select('*').eq('user_id', currentUser.id);
        if (catRes.data && catRes.data.length > 0) {
            categories = catRes.data;
        } else {
            const defaultCats = [
                { name: 'Gaji Bulanan', type: 'income', user_id: currentUser.id },
                { name: 'Makan & Minum', type: 'expense', user_id: currentUser.id },
                { name: 'Transportasi', type: 'expense', user_id: currentUser.id },
                { name: 'Lain-lain', type: 'expense', user_id: currentUser.id }
            ];
            const insertDefault = await db.from('categories').insert(defaultCats).select();
            if (insertDefault.data) categories = insertDefault.data;
        }

        const txRes = await db.from('transactions').select('*').eq('user_id', currentUser.id);
        if (txRes.data) transactions = txRes.data;

        const budgetRes = await db.from('budgets').select('*').eq('user_id', currentUser.id);
        if (budgetRes.data) budgets = budgetRes.data;

        const savingsRes = await db.from('savings_goals').select('*').eq('user_id', currentUser.id);
        if (savingsRes.data) savingsGoals = savingsRes.data;

        const charityRes = await db.from('charity_records').select('*').eq('user_id', currentUser.id);
        if (charityRes.data) charityRecords = charityRes.data;

        const debtRes = await db.from('debts').select('*').eq('user_id', currentUser.id);
        if (debtRes.data) debts = debtRes.data;

        const walletRes = await db.from('wallets').select('*').eq('user_id', currentUser.id);
        if (walletRes.data) wallets = walletRes.data;
        renderWalletCards();
        updateWalletOptions();

    } catch (err) { console.error("Error init:", err); }

    updateCategoryOptions(); renderMasterCategories(); 
    setFilter('all');
}

async function fetchUserProfile() {
    if (!currentUser) return;
    try {
        const { data } = await db.from('profiles').select('*').eq('user_id', currentUser.id).single();
        if (data) {
            userProfileData = data;
            document.getElementById('profileFullName').value = data.full_name || '';
            document.getElementById('profilePhone').value = data.phone || '';
            document.getElementById('profileJob').value = data.job || '';
            document.getElementById('profileAddress').value = data.address || '';
            updateHeaderDisplay(data.full_name, data.avatar_url);
        } else { updateHeaderDisplay('', ''); }
    } catch (err) { updateHeaderDisplay('', ''); }
}

function updateHeaderDisplay(fullName, avatarUrl) {
    const headerName = document.getElementById('headerName');
    const profileHeaderName = document.getElementById('profileHeaderName');
    const headerAvatar = document.getElementById('headerAvatar');
    const profileAvatarLarge = document.getElementById('profileAvatarLarge');
    const balanceProfileName = document.getElementById('balanceProfileName');

    const displayName = fullName && fullName.trim() !== '' ? fullName : currentUser.email.split('@')[0];
    const displayAvatar = avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.email)}`;

    if (headerName) headerName.innerText = displayName;
    if (profileHeaderName) profileHeaderName.innerText = displayName;
    if (headerAvatar) headerAvatar.src = displayAvatar;
    if (profileAvatarLarge) profileAvatarLarge.src = displayAvatar;
    if (balanceProfileName) balanceProfileName.innerText = displayName;
}

function initImageCropper(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            cropperImage.src = e.target.result;
            cropperImage.onload = function() {
                const canvas = document.getElementById('cropCanvas');
                const size = canvas.width;
                const scaleX = size / cropperImage.width;
                const scaleY = size / cropperImage.height;
                const baseZoom = Math.max(scaleX, scaleY);
                currentZoom = baseZoom; imageOffsetX = 0; imageOffsetY = 0;
                const zoomSlider = document.getElementById('zoomRange');
                if (zoomSlider) { zoomSlider.min = baseZoom * 0.5; zoomSlider.max = baseZoom * 3; zoomSlider.value = baseZoom; }
                document.getElementById('cropContainer').classList.remove('hidden');
                drawCroppedCanvas();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function drawCroppedCanvas() {
    const canvas = document.getElementById('cropCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    const scaledWidth = cropperImage.width * currentZoom;
    const scaledHeight = cropperImage.height * currentZoom;
    const x = (size - scaledWidth) / 2 + imageOffsetX;
    const y = (size - scaledHeight) / 2 + imageOffsetY;
    ctx.drawImage(cropperImage, x, y, scaledWidth, scaledHeight);
    ctx.restore();
    const finalBase64 = canvas.toDataURL('image/jpeg', 0.9);
    document.getElementById('profileAvatarLarge').src = finalBase64;
    document.getElementById('headerAvatar').src = finalBase64;
    userProfileData.avatar_url = finalBase64;
}

function adjustZoom(val) { currentZoom = parseFloat(val); drawCroppedCanvas(); }

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('cropCanvas');
    if (canvas) {
        canvas.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX - imageOffsetX; startY = e.clientY - imageOffsetY; });
        window.addEventListener('mousemove', (e) => { if (!isDragging) return; imageOffsetX = e.clientX - startX; imageOffsetY = e.clientY - startY; drawCroppedCanvas(); });
        window.addEventListener('mouseup', () => { isDragging = false; });
    }
});

const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const full_name = document.getElementById('profileFullName').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();
        const job = document.getElementById('profileJob').value.trim();
        const address = document.getElementById('profileAddress').value.trim();
        const avatar_url = userProfileData.avatar_url || '';
        const payload = { user_id: currentUser.id, full_name, avatar_url, phone, job, address, updated_at: new Date() };
        const { data: existing } = await db.from('profiles').select('id').eq('user_id', currentUser.id).single();
        if (existing) await db.from('profiles').update(payload).eq('user_id', currentUser.id);
        else await db.from('profiles').insert([payload]);
        userProfileData = payload; updateHeaderDisplay(full_name, avatar_url);
        document.getElementById('cropContainer').classList.add('hidden');
        alert("Profil berhasil diperbarui!");
    });
}

function updateProfilePage() {
    if (!currentUser) return;
    document.getElementById('profileEmailSubtitle').innerText = currentUser.email;
}

function renderMasterCategories() {
    const listEl = document.getElementById('masterCategoryList');
    if (!listEl) return;
    listEl.innerHTML = '';
    categories.forEach(cat => {
        const badge = cat.type === 'income' ? '<span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs rounded-lg font-bold">Pemasukan</span>' : '<span class="px-3 py-1 bg-red-50 text-red-500 text-xs rounded-lg font-bold">Pengeluaran</span>';
        const iconName = getCategoryIcon(cat.name);
        
        listEl.innerHTML += `<tr class="hover:bg-slate-50"><td class="px-5 py-4 font-bold text-slate-800"><i class="fa-solid ${iconName} text-indigo-400 w-5 text-center mr-2"></i>${cat.name}</td><td class="px-5 py-4">${badge}</td><td class="px-5 py-4 text-center"><button onclick="deleteCategory('${cat.id}')" class="text-slate-400 hover:text-red-500 p-2"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    });
}

const categoryForm = document.getElementById('categoryForm');
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newCategoryName').value.trim();
        const type = document.getElementById('newCategoryType').value;
        const { data, error } = await db.from('categories').insert([{ name, type, user_id: currentUser.id }]).select();
        if (data) { categories.push(data[0]); document.getElementById('newCategoryName').value = ''; renderMasterCategories(); updateCategoryOptions(); applyFilter(); }
    });
}

async function deleteCategory(id) {
    if (transactions.some(t => t.category_id === id)) {
        await showCustomModal({ title: "Perhatian", message: "Kategori sedang digunakan oleh transaksi dan tidak dapat dihapus." });
        return;
    }
    const confirmed = await showCustomModal({ title: "Hapus Kategori", message: "Hapus kategori ini secara permanen dari master data?" });
    if (confirmed) { 
        await db.from('categories').delete().eq('id', id); 
        categories = categories.filter(c => c.id !== id); 
        renderMasterCategories(); 
        updateCategoryOptions(); 
    }
}

function updateCategoryOptions() {
    const typeEl = document.querySelector('input[name="type"]:checked');
    if (!typeEl) return;
    const catSelect = document.getElementById('category');
    if (!catSelect) return;
    catSelect.innerHTML = '';
    categories.filter(c => c.type === typeEl.value).forEach(cat => catSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`);
}

// LOGIKA DOMPET / REKENING & MODAL DOMPET
function updateWalletOptions() {
    const select = document.getElementById('walletSelect');
    if (!select) return;
    select.innerHTML = '';
    if (wallets.length === 0) {
        select.innerHTML = `<option value="">Belum ada dompet (Tambah dulu)</option>`;
        return;
    }
    wallets.forEach(w => {
        select.innerHTML += `<option value="${w.id}">${w.name} (${formatRupiah(w.balance)})</option>`;
    });
}

function renderWalletCards() {
    const container = document.getElementById('walletCardList');
    if (!container) return;
    container.innerHTML = '';
    if (wallets.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 col-span-full py-4 text-center">Belum ada dompet atau rekening terdaftar.</p>`;
        return;
    }
    wallets.forEach(w => {
        container.innerHTML += `
            <div class="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all">
                <div>
                    <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rekening / Akun</span>
                    <h4 class="font-extrabold text-slate-800 text-base mt-0.5">${w.name}</h4>
                </div>
                <div class="mt-6 flex justify-between items-end">
                    <span class="font-black text-indigo-600 text-base">${formatRupiah(w.balance)}</span>
                    <button onclick="deleteWallet('${w.id}')" class="text-slate-300 hover:text-red-500 text-sm p-1 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
}

function openWalletModal() {
    const modal = document.getElementById('walletModal');
    if (!modal) return;
    document.getElementById('walletForm').reset();
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        document.getElementById('walletModalContent').classList.remove('scale-95');
        document.getElementById('walletModalContent').classList.add('scale-100');
    }, 10);
}

function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    document.getElementById('walletModalContent').classList.remove('scale-100');
    document.getElementById('walletModalContent').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function submitWalletForm() {
    if (!currentUser) return;
    const name = document.getElementById('walletNameInput').value.trim();
    const balance = parseRupiah(document.getElementById('walletBalanceInput').value);

    if (!name) return alert("Nama dompet harus diisi!");

    const { data, error } = await db.from('wallets').insert([{ name, balance, user_id: currentUser.id }]).select();
    if (data && data.length > 0) {
        wallets.push(data[0]);
        renderWalletCards();
        updateWalletOptions();
        closeWalletModal();
    } else {
        alert("Gagal membuat dompet. Pastikan RLS pada tabel 'wallets' sudah dimatikan di Supabase.");
    }
}

async function deleteWallet(id) {
    const confirmed = await showCustomModal({ title: "Hapus Dompet", message: "Apakah Anda yakin ingin menghapus dompet ini?" });
    if (confirmed) {
        await db.from('wallets').delete().eq('id', id);
        wallets = wallets.filter(w => w.id !== id);
        renderWalletCards();
        updateWalletOptions();
    }
}

function updateDashboardChart(filtered) {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;
    if (dashboardChart) dashboardChart.destroy();
    const dateMap = {};
    [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
        const d = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (!dateMap[d]) dateMap[d] = { income: 0, expense: 0 };
        if (t.type === 'income') dateMap[d].income += Number(t.amount); else dateMap[d].expense += Number(t.amount);
    });
    const labels = Object.keys(dateMap);
    dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Belum ada data'],
            datasets: [
                { label: 'Pemasukan', data: labels.map(l => dateMap[l].income), backgroundColor: '#10b981', borderRadius: 6 },
                { label: 'Pengeluaran', data: labels.map(l => dateMap[l].expense), backgroundColor: '#ef4444', borderRadius: 6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'top' } } }
    });
}

function updateAccountingReports(filtered) {
    const incRowsEl = document.getElementById('reportIncomeRows'); 
    const expRowsEl = document.getElementById('reportExpenseRows'); 
    const ledgerContainer = document.getElementById('generalLedgerContainer');
    
    if (!incRowsEl || !ledgerContainer) return;
    
    incRowsEl.innerHTML = ''; 
    expRowsEl.innerHTML = ''; 
    ledgerContainer.innerHTML = '';
    
    let totalInc = 0; let totalExp = 0; const catMap = {};
    
    filtered.forEach(t => {
        const catName = getCategoryName(t.category_id);
        if (!catMap[catName]) catMap[catName] = { type: t.type, items: [], total: 0 };
        catMap[catName].items.push(t); catMap[catName].total += Number(t.amount);
        if (t.type === 'income') totalInc += Number(t.amount); else totalExp += Number(t.amount);
    });
    
    Object.keys(catMap).filter(cat => catMap[cat].type === 'income').forEach(cat => {
        incRowsEl.innerHTML += `<div class="flex justify-between items-center"><span class="text-slate-600 flex items-center gap-2"><i class="fa-solid ${getCategoryIcon(cat)} w-4 text-center text-emerald-400"></i> ${cat}</span><span class="font-bold">${formatRupiah(catMap[cat].total)}</span></div>`;
    });
    document.getElementById('reportTotalIncome').innerText = formatRupiah(totalInc);
    
    Object.keys(catMap).filter(cat => catMap[cat].type === 'expense').forEach(cat => {
        expRowsEl.innerHTML += `<div class="flex justify-between items-center"><span class="text-slate-600 flex items-center gap-2"><i class="fa-solid ${getCategoryIcon(cat)} w-4 text-center text-red-400"></i> ${cat}</span><span class="font-bold">${formatRupiah(catMap[cat].total)}</span></div>`;
    });
    document.getElementById('reportTotalExpense').innerText = formatRupiah(totalExp);
    
    document.getElementById('reportNetProfit').innerText = formatRupiah(totalInc - totalExp);

    if (Object.keys(catMap).length === 0) {
        ledgerContainer.innerHTML = `<div class="text-center py-8 text-slate-400 font-medium">Belum ada data transaksi untuk ditampilkan.</div>`;
        return;
    }

    Object.keys(catMap).forEach(cat => {
        const data = catMap[cat];
        let tableRows = '';
        
        data.items.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(item => {
            tableRows += `
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td class="px-5 py-3 text-xs text-slate-400 font-bold">${new Date(item.date).toLocaleDateString('id-ID')}</td>
                    <td class="px-5 py-3 text-sm font-semibold text-slate-700">${item.description}</td>
                    <td class="px-5 py-3 text-sm text-right font-black ${data.type === 'income' ? 'text-emerald-500' : 'text-red-500'}">${formatRupiah(item.amount)}</td>
                </tr>
            `;
        });
        
        const badgeColor = data.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500';
        
        ledgerContainer.innerHTML += `
            <div class="border border-slate-100 rounded-xl overflow-hidden mb-6 shadow-sm">
                <div class="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h5 class="font-extrabold text-slate-800 flex items-center gap-3"><div class="w-8 h-8 rounded-lg ${badgeColor} flex items-center justify-center"><i class="fa-solid ${getCategoryIcon(cat)}"></i></div> ${cat}</h5>
                    <span class="text-xs font-bold ${data.type === 'income' ? 'text-emerald-600 bg-emerald-100 border-emerald-200' : 'text-red-600 bg-red-100 border-red-200'} border px-3 py-1.5 rounded-lg">Total: ${formatRupiah(data.total)}</span>
                </div>
                <div class="overflow-x-auto bg-white">
                    <table class="w-full text-left">
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    });
}

function updateCategoryPage(filtered) {
    const incList = document.getElementById('incomeCategoryList'); const expList = document.getElementById('expenseCategoryList');
    if (!incList || !expList) return;
    incList.innerHTML = ''; expList.innerHTML = '';
    const catTotals = { income: {}, expense: {} }; let totalInc = 0; let totalExp = 0;

    filtered.forEach(t => {
        const catName = getCategoryName(t.category_id);
        if (t.type === 'income') { catTotals.income[catName] = (catTotals.income[catName] || 0) + Number(t.amount); totalInc += Number(t.amount); } 
        else { catTotals.expense[catName] = (catTotals.expense[catName] || 0) + Number(t.amount); totalExp += Number(t.amount); }
    });

    for (const [cat, amt] of Object.entries(catTotals.expense).sort((a, b) => b[1] - a[1])) {
        const percent = totalExp > 0 ? ((amt / totalExp) * 100).toFixed(1) : 0;
        expList.innerHTML += `<div><div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-slate-700 flex items-center gap-2"><i class="fa-solid ${getCategoryIcon(cat)} text-slate-400 w-4 text-center"></i> ${cat}</span><span class="text-slate-600">${formatRupiah(amt)} <span class="text-[10px] text-slate-400 ml-1">(${percent}%)</span></span></div><div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div class="bg-red-500 h-2.5 rounded-full" style="width: ${percent}%"></div></div></div>`;
    }
    for (const [cat, amt] of Object.entries(catTotals.income).sort((a, b) => b[1] - a[1])) {
        const percent = totalInc > 0 ? ((amt / totalInc) * 100).toFixed(1) : 0;
        incList.innerHTML += `<div><div class="flex justify-between text-sm mb-1.5 font-bold"><span class="text-slate-700 flex items-center gap-2"><i class="fa-solid ${getCategoryIcon(cat)} text-slate-400 w-4 text-center"></i> ${cat}</span><span class="text-slate-600">${formatRupiah(amt)} <span class="text-[10px] text-slate-400 ml-1">(${percent}%)</span></span></div><div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${percent}%"></div></div></div>`;
    }
}

const savingsForm = document.getElementById('savingsForm');
if (savingsForm) {
    savingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('savingsTitle').value.trim();
        const target_amount = parseRupiah(document.getElementById('savingsTargetAmount').value);
        const { data } = await db.from('savings_goals').insert([{ title, target_amount, current_amount: 0, user_id: currentUser.id }]).select();
        if (data) { savingsGoals.push(data[0]); document.getElementById('savingsTitle').value = ''; document.getElementById('savingsTargetAmount').value = ''; renderSavingsPage(); }
    });
}

function renderSavingsPage() {
    const grid = document.getElementById('savingsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    if (savingsGoals.length === 0) return grid.innerHTML = `<div class="col-span-2 py-8 text-center text-slate-400 font-medium">Anda belum memiliki target tabungan.</div>`;
    savingsGoals.forEach(g => {
        const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0;
        grid.innerHTML += `<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"><div><div class="flex justify-between items-start"><h4 class="font-extrabold text-slate-800 text-lg">${g.title}</h4><button onclick="deleteSavings('${g.id}')" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></div><div class="flex justify-between text-xs font-bold text-slate-500 mt-4 mb-2"><span>Terkumpul: ${formatRupiah(g.current_amount)}</span><span>Target: ${formatRupiah(g.target_amount)}</span></div><div class="w-full bg-slate-100 rounded-full h-2.5"><div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${pct}%"></div></div></div><button onclick="addSavingsProgress('${g.id}')" class="mt-5 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 text-xs font-bold rounded-xl transition-colors">+ Setor Tabungan</button></div>`;
    });
}

async function addSavingsProgress(id) {
    const val = await showCustomModal({
        title: "Setor Tabungan",
        message: "Masukkan nominal setoran tabungan tambahan (Rp):",
        isPrompt: true,
        placeholder: "Contoh: 50.000"
    });
    if (!val) return;
    const amt = parseRupiah(val);
    if (amt <= 0) return;
    
    const goal = savingsGoals.find(g => g.id === id);
    const newCurrent = Number(goal.current_amount) + amt;
    await db.from('savings_goals').update({ current_amount: newCurrent }).eq('id', id);
    goal.current_amount = newCurrent; renderSavingsPage();
}

async function deleteSavings(id) { 
    const confirmed = await showCustomModal({ title: "Hapus Target", message: "Apakah Anda yakin ingin menghapus target impian ini secara permanen?" });
    if (confirmed) {
        await db.from('savings_goals').delete().eq('id', id); 
        savingsGoals = savingsGoals.filter(g => g.id !== id); 
        renderSavingsPage(); 
    }
}

const charityForm = document.getElementById('charityForm');
if (charityForm) {
    charityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('charityType').value;
        const amount = parseRupiah(document.getElementById('charityAmount').value);
        const { data } = await db.from('charity_records').insert([{ type, amount, date: new Date().toISOString().split('T')[0], user_id: currentUser.id }]).select();
        if (data) { charityRecords.push(data[0]); document.getElementById('charityAmount').value = ''; renderCharityPage(); }
    });
}

function renderCharityPage() {
    const listEl = document.getElementById('charityTableList');
    const totalEl = document.getElementById('totalCharityAmount');
    if (!listEl) return;
    listEl.innerHTML = ''; let total = 0;
    if (charityRecords.length === 0) { listEl.innerHTML = `<tr><td colspan="4" class="px-5 py-8 text-center text-slate-400 font-medium">Belum ada histori sedekah.</td></tr>`; if(totalEl) totalEl.innerText = formatRupiah(0); return; }
    
    const sorted = [...charityRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(c => {
        total += Number(c.amount);
        listEl.innerHTML += `<tr class="hover:bg-slate-50 border-b border-slate-50"><td class="px-5 py-4 text-xs font-bold text-slate-400">${new Date(c.date).toLocaleDateString('id-ID')}</td><td class="px-5 py-4 font-bold text-slate-700">${c.type}</td><td class="px-5 py-4 text-right font-black text-emerald-500">+ ${formatRupiah(c.amount)}</td><td class="px-5 py-4 text-center"><button onclick="deleteCharity('${c.id}')" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-trash-can"></i></button></td></tr>`;
    });
    if (totalEl) totalEl.innerText = formatRupiah(total);
}

async function deleteCharity(id) { 
    const confirmed = await showCustomModal({ title: "Hapus Catatan", message: "Hapus catatan sedekah ini dari histori?" });
    if (confirmed) {
        await db.from('charity_records').delete().eq('id', id); 
        charityRecords = charityRecords.filter(c => c.id !== id); 
        renderCharityPage(); 
    }
}

// LOGIKA UTANG & PIUTANG 
async function submitDebtForm() {
    if (!currentUser) return;
    const person_name = document.getElementById('debtPerson').value.trim();
    const type = document.getElementById('debtType').value;
    const amount = parseRupiah(document.getElementById('debtAmount').value);
    const due_date = document.getElementById('debtDueDate').value;
    
    if(!person_name || amount <= 0 || !due_date) {
        await showCustomModal({ title: "Perhatian", message: "Harap isi semua kolom dengan benar!" });
        return;
    }

    const payload = { user_id: currentUser.id, person_name, type, amount, due_date, status: 'unpaid' };
    
    const { data, error } = await db.from('debts').insert([payload]).select();
    if (data && data.length > 0) { 
        debts.push(data[0]); 
        document.getElementById('debtForm').reset(); 
        const debtDateInput = document.getElementById('debtDueDate');
        if(debtDateInput) debtDateInput.valueAsDate = new Date();
        renderDebtPage(); 
    } else {
        await showCustomModal({ title: "Error", message: "Gagal menyimpan data utang: " + (error ? error.message : "Kesalahan tidak diketahui") });
    }
}

function renderDebtPage() {
    const listEl = document.getElementById('debtTableList');
    if(!listEl) return;
    listEl.innerHTML = '';
    
    let totalPayable = 0;
    let totalReceivable = 0;
    
    if(debts.length === 0) {
        listEl.innerHTML = `<tr><td colspan="6" class="px-5 py-8 text-center text-slate-400 font-medium">Belum ada catatan utang atau piutang.</td></tr>`;
    } else {
        [...debts].sort((a,b) => new Date(a.due_date) - new Date(b.due_date)).forEach(d => {
            if (d.status === 'unpaid') {
                if(d.type === 'payable') totalPayable += Number(d.amount);
                else totalReceivable += Number(d.amount);
            }
            
            const isPayable = d.type === 'payable';
            const typeBadge = isPayable 
                ? `<span class="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] rounded-md font-bold uppercase tracking-wide">Saya Ngutang</span>`
                : `<span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] rounded-md font-bold uppercase tracking-wide">Orang Ngutang</span>`;
            
            const amountColor = isPayable ? 'text-rose-500' : 'text-emerald-500';
            
            const statusBadge = d.status === 'paid'
                ? `<span class="text-xs font-bold text-slate-400"><i class="fa-solid fa-check-circle text-emerald-400"></i> Lunas</span>`
                : `<button onclick="toggleDebtStatus('${d.id}', 'paid')" class="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm border border-slate-200">Tandai Lunas</button>`;
                
            listEl.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 ${d.status === 'paid' ? 'opacity-60' : ''}">
                    <td class="px-5 py-4 font-bold text-slate-800">${d.person_name}</td>
                    <td class="px-5 py-4">${typeBadge}</td>
                    <td class="px-5 py-4 text-right font-black ${amountColor}">${formatRupiah(d.amount)}</td>
                    <td class="px-5 py-4 text-xs font-bold ${new Date(d.due_date) < new Date() && d.status === 'unpaid' ? 'text-red-500' : 'text-slate-500'}">${new Date(d.due_date).toLocaleDateString('id-ID')}</td>
                    <td class="px-5 py-4 text-center">${statusBadge}</td>
                    <td class="px-5 py-4 text-center">
                        ${d.status === 'paid' ? `<button onclick="toggleDebtStatus('${d.id}', 'unpaid')" class="text-slate-400 hover:text-indigo-500 p-2 mr-1 transition-colors" title="Batal Lunas"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
                        <button onclick="deleteDebt('${d.id}')" class="text-slate-300 hover:text-red-500 p-2 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    document.getElementById('totalPayable').innerText = formatRupiah(totalPayable);
    document.getElementById('totalReceivable').innerText = formatRupiah(totalReceivable);
}

async function toggleDebtStatus(id, newStatus) {
    if (!currentUser) return;
    const { error } = await db.from('debts').update({ status: newStatus }).eq('id', id);
    if (error) { await showCustomModal({ title: "Error", message: "Gagal memperbarui status: " + error.message }); return; }
    const debt = debts.find(d => d.id === id);
    if (debt) debt.status = newStatus;
    renderDebtPage();
}

async function deleteDebt(id) {
    const confirmed = await showCustomModal({ title: "Hapus Utang", message: "Hapus catatan utang atau piutang ini secara permanen?" });
    if (confirmed) {
        const { error } = await db.from('debts').delete().eq('id', id);
        if (error) { await showCustomModal({ title: "Error", message: "Gagal menghapus: " + error.message }); return; }
        debts = debts.filter(d => d.id !== id);
        renderDebtPage();
    }
}

// LOGIKA DASHBOARD & TRANSAKSI
function updateSummary(filtered) {
    let inc = 0; let exp = 0;
    filtered.forEach(t => { if (t.type === 'income') inc += Number(t.amount); else exp += Number(t.amount); });
    const balance = inc - exp;
    
    if (isBalanceHidden) {
        document.getElementById('totalBalance').innerText = 'Rp ••••••••';
        document.getElementById('totalIncome').innerText = 'Rp ••••••';
        document.getElementById('totalExpense').innerText = 'Rp ••••••';
    } else {
        document.getElementById('totalBalance').innerText = formatRupiah(balance);
        document.getElementById('totalIncome').innerText = formatRupiah(inc);
        document.getElementById('totalExpense').innerText = formatRupiah(exp);
    }

    const badgeText = document.getElementById('balanceBadgeText');
    if (badgeText) {
        if (balance < 50000) {
            badgeText.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Kurang Sehat`;
            badgeText.className = "text-xs font-bold bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 shadow-sm text-rose-400";
        } else {
            badgeText.innerHTML = `<i class="fa-solid fa-check-circle"></i> Keuangan Sehat`;
            badgeText.className = "text-xs font-bold bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 shadow-sm text-emerald-400"; 
        }
    }
}

function updateTransactionList(filtered) {
    const listEl = document.getElementById('transactionList');
    if (!listEl) return;
    listEl.innerHTML = ''; 
    document.getElementById('transactionCount').innerText = `${filtered.length} Transaksi`;
    
    if (filtered.length === 0) { 
        listEl.innerHTML = `<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400">Belum ada transaksi.</td></tr>`; 
        document.getElementById('toggleContainer').classList.add('hidden'); 
        return; 
    }
    
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    const displayed = isShowingAll ? sorted : sorted.slice(0, 7);
    
    if (sorted.length > 7) { 
        document.getElementById('toggleContainer').classList.remove('hidden'); 
        const toggleBtn = document.getElementById('toggleBtn');
        if (isShowingAll) {
            toggleBtn.innerHTML = `Tampilkan Lebih Sedikit <i class="fa-solid fa-chevron-up"></i>`;
        } else {
            toggleBtn.innerHTML = `Tampilkan Semua <i class="fa-solid fa-chevron-down"></i>`;
        }
    } else { 
        document.getElementById('toggleContainer').classList.add('hidden'); 
    }
    
    displayed.forEach(t => {
        const isInc = t.type === 'income';
        const amountColorClass = isInc ? 'text-emerald-500' : 'text-red-500';
        const catName = getCategoryName(t.category_id);
        const iconName = getCategoryIcon(catName);
        
        listEl.innerHTML += `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
            <td class="px-6 py-4 text-xs font-bold text-slate-400">${new Date(t.date).toLocaleDateString('id-ID')}</td>
            <td class="px-6 py-4 text-sm font-bold text-slate-700">${t.description}</td>
            <td class="px-6 py-4"><span class="px-3 py-1 bg-slate-100 text-xs font-bold text-slate-600 rounded-lg flex items-center gap-1.5 w-fit"><i class="fa-solid ${iconName}"></i> ${catName}</span></td>
            <td class="px-6 py-4 text-sm text-right font-black ${amountColorClass}">${isInc ? '+' : '-'} ${formatRupiah(t.amount)}</td>
            <td class="px-6 py-4 text-center">
                <button onclick="editTx('${t.id}')" class="text-slate-300 hover:text-indigo-600 p-2 mr-1 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteTx('${t.id}')" class="text-slate-300 hover:text-red-500 p-2 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>`;
    });
}

function toggleShowAll() { isShowingAll = !isShowingAll; applyFilter(); }

function setFilter(type) { 
    currentFilter = type; 
    document.getElementById('startDate').value = ''; 
    document.getElementById('endDate').value = ''; 

    const btnAll = document.getElementById('btnFilter-all');
    const btnMonth = document.getElementById('btnFilter-month');

    if (btnAll && btnMonth) {
        if(type === 'all') {
            btnAll.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all bg-white shadow-sm text-indigo-600 border border-slate-200/50";
            btnMonth.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 border border-transparent";
        } else {
            btnMonth.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all bg-white shadow-sm text-indigo-600 border border-slate-200/50";
            btnAll.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-700 border border-transparent";
        }
    }
    
    applyFilter(); 
}

function applyFilter() {
    let filtered = [...transactions];
    if (currentFilter === 'month') filtered = filtered.filter(t => isThisMonth(t.date));
    const start = document.getElementById('startDate').value; const end = document.getElementById('endDate').value;
    if (start) filtered = filtered.filter(t => t.date >= start);
    if (end) filtered = filtered.filter(t => t.date <= end);
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    if (search) filtered = filtered.filter(t => (t.description || '').toLowerCase().includes(search) || getCategoryName(t.category_id).toLowerCase().includes(search));
    
    updateSummary(filtered); 
    updateDashboardChart(filtered); 
    updateTransactionList(filtered); 
    updateCategoryPage(filtered); 
    updateAccountingReports(filtered);
}

function updateClock() {
    const timeEl = document.getElementById('liveTime'); if (!timeEl) return;
    const now = new Date();
    timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> <span>${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} • ${now.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'][now.getMonth()]}</span>`;
}
setInterval(updateClock, 1000); updateClock();

function openModal() { updateCategoryOptions(); updateWalletOptions(); const m = document.getElementById('transactionModal'); m.classList.remove('hidden'); setTimeout(() => m.classList.add('opacity-100'), 10); }
function closeModal() { const m = document.getElementById('transactionModal'); m.classList.remove('opacity-100'); setTimeout(() => { m.classList.add('hidden'); document.getElementById('transactionForm').reset(); document.getElementById('date').valueAsDate = new Date(); editingTransactionId = null; }, 300); }

function editTx(id) {
    const t = transactions.find(x => x.id === id); if (!t) return;
    editingTransactionId = id; document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
    updateCategoryOptions(); updateWalletOptions();
    document.getElementById('category').value = t.category_id || '';
    if (t.wallet_id) document.getElementById('walletSelect').value = t.wallet_id;
    document.getElementById('amount').value = new Intl.NumberFormat('id-ID').format(t.amount);
    document.getElementById('description').value = t.description; document.getElementById('date').value = t.date; openModal();
}

const txForm = document.getElementById('transactionForm');
if (txForm) {
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        if (!currentUser) return alert("Silakan login terlebih dahulu!");
        
        try {
            const type = document.querySelector('input[name="type"]:checked').value;
            const category_id = document.getElementById('category').value; 
            const wallet_id = document.getElementById('walletSelect').value || null;
            const amount = parseRupiah(document.getElementById('amount').value); 
            const description = document.getElementById('description').value; 
            const date = document.getElementById('date').value; 

            if (!wallet_id) {
                throw new Error("Pilih dompet atau rekening terlebih dahulu!");
            }

            const txData = { type, category_id, wallet_id, amount, description, date, user_id: currentUser.id };

            if (editingTransactionId) {
                // (Opsional jika ingin handle edit transaksi, fokus utamanya ada di insert baru)
                const { error } = await db.from('transactions').update(txData).eq('id', editingTransactionId);
                if (error) throw error;
                const idx = transactions.findIndex(t => t.id === editingTransactionId); 
                if (idx !== -1) transactions[idx] = { id: editingTransactionId, ...txData };
            } else {
                // 1. Simpan transaksi baru ke tabel transactions
                const { data, error } = await db.from('transactions').insert([txData]).select();
                if (error) throw error;
                if (data) transactions.push(data[0]);

                // 2. AMBIL SALDO DOMPET SAAT INI & UPDATE OTOMATIS
                const targetWallet = wallets.find(w => w.id === wallet_id);
                if (targetWallet) {
                    let currentBalance = Number(targetWallet.balance);
                    
                    // Jika Pemasukan (+), saldo dompet bertambah. Jika Pengeluaran (-), saldo dompet berkurang.
                    if (type === 'income') {
                        currentBalance += amount;
                    } else {
                        currentBalance -= amount;
                    }

                    // Perbarui saldo di database Supabase tabel 'wallets'
                    const { error: walletErr } = await db.from('wallets')
                        .update({ balance: currentBalance })
                        .eq('id', wallet_id);

                    if (walletErr) throw walletErr;

                    // Perbarui data saldo dompet di memori lokal web
                    targetWallet.balance = currentBalance;
                    renderWalletCards();
                    updateWalletOptions();
                }
            }
            
            applyFilter(); 
            closeModal();
        } catch (err) {
            await showCustomModal({ title: "Gagal Menyimpan", message: err.message });
        }
    });
}

async function deleteTx(id) { 
    const confirmed = await showCustomModal({ title: "Hapus Transaksi", message: "Apakah Anda yakin ingin menghapus catatan transaksi ini?" });
    if (confirmed) { 
        await db.from('transactions').delete().eq('id', id); 
        transactions = transactions.filter(t => t.id !== id); 
        applyFilter(); 
    } 
}

// MODAL DIALOG KUSTOM (PENGGANTI PROMPT & CONFIRM)
let customModalCallback = null;

function showCustomModal({ title, message, isPrompt = false, placeholder = '', inputType = 'text', defaultValue = '' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const content = document.getElementById('customConfirmContent');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const inputWrapper = document.getElementById('confirmInputWrapper');
        const inputEl = document.getElementById('customPromptInput');
        
        titleEl.innerText = title;
        msgEl.innerText = message;
        
        if (isPrompt) {
            inputWrapper.classList.remove('hidden');
            inputEl.type = inputType;
            inputEl.placeholder = placeholder;
            inputEl.value = defaultValue;
            setTimeout(() => inputEl.focus(), 100);
        } else {
            inputWrapper.classList.add('hidden');
            inputEl.value = '';
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);

        customModalCallback = (result) => {
            modal.classList.remove('opacity-100');
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                if (isPrompt) {
                    resolve(result ? inputEl.value : null);
                } else {
                    resolve(result);
                }
            }, 200);
        };
    });
}

function closeCustomModal(result) {
    if (customModalCallback) {
        customModalCallback(result);
        customModalCallback = null;
    }
}

// FITUR BACKUP & RESTORE (JSON)
function exportDataJSON() {
    if (!currentUser) return alert("Silakan masuk terlebih dahulu!");
    const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        user_email: currentUser.email,
        transactions: transactions,
        categories: categories,
        budgets: budgets,
        savingsGoals: savingsGoals,
        charityRecords: charityRecords,
        debts: debts,
        wallets: wallets,
        profile: userProfileData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_bukukas_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

async function importDataJSON(input) {
    if (!currentUser) return alert("Silakan masuk terlebih dahulu!");
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const content = e.target.result;
            const parsedData = JSON.parse(content);
            if (!parsedData.transactions || !parsedData.categories) {
                throw new Error("Format file backup tidak valid!");
            }
            const confirmed = await showCustomModal({ title: "Pemulihan Data", message: "Proses Restore akan memasukkan data cadangan ke akun Anda. Lanjutkan?" });
            if (!confirmed) {
                input.value = '';
                return;
            }
            if (parsedData.categories && parsedData.categories.length > 0) {
                const cleanCats = parsedData.categories.map(c => ({ name: c.name, type: c.type, user_id: currentUser.id }));
                await db.from('categories').insert(cleanCats);
            }
            if (parsedData.wallets && parsedData.wallets.length > 0) {
                const cleanWallets = parsedData.wallets.map(w => ({ name: w.name, balance: w.balance, user_id: currentUser.id }));
                await db.from('wallets').insert(cleanWallets);
            }
            if (parsedData.transactions && parsedData.transactions.length > 0) {
                const cleanTx = parsedData.transactions.map(t => ({ type: t.type, category_id: t.category_id, amount: t.amount, description: t.description, date: t.date, user_id: currentUser.id }));
                await db.from('transactions').insert(cleanTx);
            }
            if (parsedData.debts && parsedData.debts.length > 0) {
                const cleanDebts = parsedData.debts.map(d => ({ person_name: d.person_name, type: d.type, amount: d.amount, due_date: d.due_date, status: d.status || 'unpaid', user_id: currentUser.id }));
                await db.from('debts').insert(cleanDebts);
            }
            await showCustomModal({ title: "Berhasil", message: "Data berhasil dipulihkan (Restore)!" });
            location.reload();
        } catch (err) {
            await showCustomModal({ title: "Gagal Membaca File", message: err.message });
        } finally {
            input.value = '';
        }
    };
    reader.readAsText(file);
}