// --- KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://onssvkrjtoqxzdvjbeob.supabase.co';
const supabaseKey = 'sb_publishable_YXYOrvgDRHCxKJ1eorzmjg_1dcrPMmi';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let transactions = [];
let currentFilter = 'all'; 
let transactionToDeleteId = null;
let currentUser = null;
let editingTransactionId = null; // Menandakan sedang mode edit

// --- AUTHENTICATION ---
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
        transactions = [];
    }
});

async function handleAuth(actionType) {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return alert("Harap isi email dan password!");
    if (actionType === 'login') await db.auth.signInWithPassword({ email, password });
    else if (actionType === 'register') await db.auth.signUp({ email, password });
}

async function handleLogout() { await db.auth.signOut(); }

// --- NAVIGASI HALAMAN (TABS) ---
function switchPage(page) {
    const pageHome = document.getElementById('page-home');
    const pageCategory = document.getElementById('page-category');
    const navHome = document.getElementById('nav-home');
    const navCategory = document.getElementById('nav-category');

    if (page === 'home') {
        pageHome.classList.remove('hidden');
        pageHome.classList.add('flex');
        pageCategory.classList.add('hidden');
        pageCategory.classList.remove('flex');
        
        navHome.className = "py-3 px-1 border-b-2 border-primary text-primary font-medium text-sm transition-colors";
        navCategory.className = "py-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors";
    } else if (page === 'category') {
        pageCategory.classList.remove('hidden');
        pageCategory.classList.add('flex');
        pageHome.classList.add('hidden');
        pageHome.classList.remove('flex');
        
        navCategory.className = "py-3 px-1 border-b-2 border-primary text-primary font-medium text-sm transition-colors";
        navHome.className = "py-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors";
    }
}

// --- FUNGSI HELPER ---
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

// --- UPDATE TAMPILAN BERANDA ---
function updateSummary(filtered) {
    let inc = 0; let exp = 0;
    filtered.forEach(t => { if (t.type === 'income') inc += Number(t.amount); else exp += Number(t.amount); });
    
    const balanceEl = document.getElementById('totalBalance');
    const incomeEl = document.getElementById('totalIncome');
    const expEl = document.getElementById('totalExpense');
    
    if (balanceEl) balanceEl.innerText = formatRupiah(inc - exp);
    if (incomeEl) incomeEl.innerText = formatRupiah(inc);
    if (expEl) expEl.innerText = formatRupiah(exp);
}

function updateTransactionList(filtered) {
    const listEl = document.getElementById('transactionList');
    const countEl = document.getElementById('transactionCount');
    
    if (!listEl) return; // Pengaman agar tidak error

    if (countEl) countEl.innerText = `${filtered.length} item`;
    listEl.innerHTML = ''; 

    if (filtered.length === 0) {
        listEl.innerHTML = `<tr><td colspan="5" class="px-5 py-8 text-center text-slate-400">Belum ada transaksi.</td></tr>`;
        return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-50';
        const isInc = t.type === 'income';
        const catText = t.category || 'Lainnya';
        
        tr.innerHTML = `
            <td class="px-5 py-4 whitespace-nowrap text-sm text-slate-600">${new Date(t.date).toLocaleDateString('id-ID')}</td>
            <td class="px-5 py-4 text-sm font-medium text-slate-800">${t.description}</td>
            <td class="px-5 py-4"><span class="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg border border-slate-200">${catText}</span></td>
            <td class="px-5 py-4 text-sm text-right font-bold ${isInc ? 'text-success' : 'text-danger'}">${isInc ? '+' : '-'} ${formatRupiah(t.amount)}</td>
            <td class="px-5 py-4 text-center whitespace-nowrap">
                <button onclick="editTx('${t.id}')" class="text-slate-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-blue-50 mr-1" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteTx('${t.id}')" class="text-slate-400 hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Hapus">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        listEl.appendChild(tr);
    });
}

// --- UPDATE TAMPILAN KATEGORI ---
function updateCategoryPage(filtered) {
    const incList = document.getElementById('incomeCategoryList');
    const expList = document.getElementById('expenseCategoryList');
    
    if (!incList || !expList) return; // Pengaman agar tidak error

    incList.innerHTML = ''; 
    expList.innerHTML = '';

    const catTotals = { income: {}, expense: {} };
    let totalInc = 0; let totalExp = 0;

    filtered.forEach(t => {
        const cat = t.category || 'Lainnya';
        if (t.type === 'income') {
            catTotals.income[cat] = (catTotals.income[cat] || 0) + Number(t.amount);
            totalInc += Number(t.amount);
        } else {
            catTotals.expense[cat] = (catTotals.expense[cat] || 0) + Number(t.amount);
            totalExp += Number(t.amount);
        }
    });

    if (Object.keys(catTotals.expense).length === 0) {
        expList.innerHTML = `<p class="text-sm text-slate-400 text-center py-4">Belum ada data pengeluaran</p>`;
    } else {
        for (const [cat, amt] of Object.entries(catTotals.expense).sort((a, b) => b[1] - a[1])) {
            const percent = ((amt / totalExp) * 100).toFixed(1);
            expList.innerHTML += `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-slate-700">${cat}</span>
                        <span class="text-slate-600 font-medium">${formatRupiah(amt)} <span class="text-slate-400 text-xs font-normal">(${percent}%)</span></span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-danger h-2 rounded-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }
    }

    if (Object.keys(catTotals.income).length === 0) {
        incList.innerHTML = `<p class="text-sm text-slate-400 text-center py-4">Belum ada data pemasukan</p>`;
    } else {
        for (const [cat, amt] of Object.entries(catTotals.income).sort((a, b) => b[1] - a[1])) {
            const percent = ((amt / totalInc) * 100).toFixed(1);
            incList.innerHTML += `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-slate-700">${cat}</span>
                        <span class="text-slate-600 font-medium">${formatRupiah(amt)} <span class="text-slate-400 text-xs font-normal">(${percent}%)</span></span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-success h-2 rounded-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }
    }
}

// --- FILTER & INIT ---
function applyFilter() {
    let filtered = transactions;
    if (currentFilter === 'month') filtered = transactions.filter(t => isThisMonth(t.date));

    updateSummary(filtered);
    updateTransactionList(filtered);
    updateCategoryPage(filtered); 

    const btnAll = document.getElementById('btnFilter-all');
    const btnMonth = document.getElementById('btnFilter-month');
    
    if (btnAll) btnAll.className = currentFilter === 'all' ? "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors bg-white shadow-sm text-primary" : "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-500 hover:text-slate-700 hover:bg-white/50";
    if (btnMonth) btnMonth.className = currentFilter === 'month' ? "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors bg-white shadow-sm text-primary" : "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-500 hover:text-slate-700 hover:bg-white/50";
}

function setFilter(type) { currentFilter = type; applyFilter(); }

async function init() {
    if (!currentUser) return;
    
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();
    
    updateCategoryOptions(); 
    try {
        const { data, error } = await db.from('transactions').select('*').eq('user_id', currentUser.id);
        if (data) transactions = data;
    } catch (err) {}
    applyFilter();
}

// --- MODAL & FORM (EDIT / TAMBAH) ---
function updateCategoryOptions() {
    const typeEl = document.querySelector('input[name="type"]:checked');
    if (!typeEl) return;
    
    const type = typeEl.value;
    const catSelect = document.getElementById('category');
    if (!catSelect) return;
    
    catSelect.innerHTML = ''; 

    const incomeCategories = ['Pemasukan', 'Saldo', 'Lainnya'];
    const expenseCategories = ['Makanan', 'Transportasi', 'Belanja', 'Sembako', 'Pengeluaran', 'Pemasukan','Saldo', 'Minuman', 'Hiburan', 'Lainnya'];

    const options = type === 'income' ? incomeCategories : expenseCategories;
    options.forEach(cat => {
        catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function openModal() {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.add('opacity-100'); }, 10);
}

function closeModal() {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    setTimeout(() => { 
        modal.classList.add('hidden'); 
        
        const form = document.getElementById('transactionForm');
        if (form) form.reset();
        
        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.valueAsDate = new Date();
        
        // Reset status edit
        editingTransactionId = null;
        const title = document.querySelector('#modalContent h3');
        if (title) title.innerText = 'Tambah Transaksi';
    }, 300);
}

// Fungsi Buka Form dalam Mode Edit
function editTx(id) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    
    editingTransactionId = id; 
    
    const title = document.querySelector('#modalContent h3');
    if (title) title.innerText = 'Edit Transaksi';
    
    const typeRadio = document.querySelector(`input[name="type"][value="${t.type}"]`);
    if (typeRadio) typeRadio.checked = true;
    
    updateCategoryOptions(); 
    
    const catSelect = document.getElementById('category');
    if (catSelect) {
        if (Array.from(catSelect.options).some(opt => opt.value === t.category)) {
            catSelect.value = t.category;
        } else {
            catSelect.value = 'Lainnya';
        }
    }
    
    const amountInput = document.getElementById('amount');
    if (amountInput) amountInput.value = new Intl.NumberFormat('id-ID').format(t.amount);
    
    const descInput = document.getElementById('description');
    if (descInput) descInput.value = t.description;
    
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = t.date;
    
    openModal();
}

// Fungsi Simpan (Menangani Insert Baru dan Update Edit)
const txForm = document.getElementById('transactionForm');
if (txForm) {
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Anda harus login.");

        const type = document.querySelector('input[name="type"]:checked').value;
        const category = document.getElementById('category').value;
        const amount = parseRupiah(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value;

        if (amount <= 0) return alert("Jumlah tidak valid.");

        const txData = { type, category, amount, description, date, user_id: currentUser.id };

        try {
            if (editingTransactionId) {
                // Mode Edit
                const { data, error } = await db.from('transactions').update(txData).eq('id', editingTransactionId).select();
                if (error) throw error;
                if (data && data.length > 0) {
                    const index = transactions.findIndex(t => t.id === editingTransactionId);
                    if (index !== -1) transactions[index] = data[0]; 
                }
            } else {
                // Mode Tambah Baru
                const { data, error } = await db.from('transactions').insert([txData]).select();
                if (error) throw error;
                if (data && data.length > 0) {
                    transactions.push(data[0]);
                }
            }
            
            applyFilter(); 
            closeModal();
        } catch (err) { 
            console.error("Error saat menyimpan:", err); 
            alert("Gagal menyimpan: " + (err.message || "Silakan cek koneksi atau database."));
        }
    });
}

async function deleteTx(id) {
    if (confirm("Hapus transaksi ini?")) {
        await db.from('transactions').delete().eq('id', id);
        transactions = transactions.filter(t => t.id !== id);
        applyFilter();
    }
}