// --- KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://onssvkrjtoqxzdvjbeob.supabase.co';
const supabaseKey = 'sb_publishable_YXYOrvgDRHCxKJ1eorzmjg_1dcrPMmi';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let transactions = [];
let categories = []; 
let budgets = []; 
let currentFilter = 'all'; 
let currentUser = null;
let editingTransactionId = null; 
let dashboardChart = null; 
let isShowingAll = false; 

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
        categories = [];
        budgets = [];
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

// --- NAVIGASI TAB ---
function switchPage(page) {
    const pages = ['home', 'category', 'masterCategory', 'report', 'budget'];
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        const nav = document.getElementById(`nav-${p}`);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
        if (nav) nav.className = "py-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2";
    });

    const activeEl = document.getElementById(`page-${page}`);
    const activeNav = document.getElementById(`nav-${page}`);
    if (activeEl) { activeEl.classList.remove('hidden'); activeEl.classList.add('flex'); }
    if (activeNav) activeNav.className = "py-3 px-1 border-b-2 border-primary text-primary font-extrabold text-sm transition-all whitespace-nowrap flex items-center gap-2";
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

function getCategoryName(categoryId) {
    if (!categoryId) return 'Tanpa Kategori / Data Lama';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Kategori Dihapus';
}

// --- AMBIL DATA DARI DATABASE ---
async function init() {
    if (!currentUser) return;
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();

    try {
        const catRes = await db.from('categories').select('*').eq('user_id', currentUser.id);
        if (catRes.data && catRes.data.length > 0) {
            categories = catRes.data;
        } else {
            const defaultCats = [
                { name: 'Pemasukan Utama', type: 'income', user_id: currentUser.id },
                { name: 'Saldo Awal', type: 'income', user_id: currentUser.id },
                { name: 'Pemberian Ortu', type: 'income', user_id: currentUser.id },
                { name: 'Pemasukan Lainnya', type: 'income', user_id: currentUser.id },
                { name: 'Makanan', type: 'expense', user_id: currentUser.id },
                { name: 'Minuman', type: 'expense', user_id: currentUser.id },
                { name: 'Jajan', type: 'expense', user_id: currentUser.id },
                { name: 'Sembako', type: 'expense', user_id: currentUser.id },
                { name: 'Transportasi', type: 'expense', user_id: currentUser.id },
                { name: 'Hiburan', type: 'expense', user_id: currentUser.id },
                { name: 'Pulsa & Kuota', type: 'expense', user_id: currentUser.id },
                { name: 'Keperluan Kampus', type: 'expense', user_id: currentUser.id },
                { name: 'Perawatan Diri', type: 'expense', user_id: currentUser.id },
                { name: 'Kesehatan', type: 'expense', user_id: currentUser.id },
                { name: 'Tempat Tinggal', type: 'expense', user_id: currentUser.id },
                { name: 'Sosial & Amal', type: 'expense', user_id: currentUser.id },
                { name: 'Lain-lain', type: 'expense', user_id: currentUser.id }
            ];
            const insertDefault = await db.from('categories').insert(defaultCats).select();
            if (insertDefault.data) categories = insertDefault.data;
        }

        const txRes = await db.from('transactions').select('*').eq('user_id', currentUser.id);
        if (txRes.data) transactions = txRes.data;

        const budgetRes = await db.from('budgets').select('*').eq('user_id', currentUser.id);
        if (budgetRes.data) budgets = budgetRes.data;
    } catch (err) { console.error("Error init:", err); }

    updateCategoryOptions();
    renderMasterCategories();
    applyFilter();
}

// --- MANAJEMEN MASTER KATEGORI ---
function renderMasterCategories() {
    const listEl = document.getElementById('masterCategoryList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (categories.length === 0) {
        listEl.innerHTML = `<tr><td colspan="3" class="px-5 py-6 text-center text-slate-400 font-medium">Belum ada kategori kustom.</td></tr>`;
        return;
    }

    categories.forEach(cat => {
        const isInc = cat.type === 'income';
        const badge = isInc ? '<span class="px-3 py-1 bg-emerald-50 text-success text-xs rounded-xl border border-emerald-200 font-bold">Pemasukan</span>' : '<span class="px-3 py-1 bg-red-50 text-danger text-xs rounded-xl border border-red-200 font-bold">Pengeluaran</span>';
        
        listEl.innerHTML += `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="px-5 py-4 font-bold text-slate-800">${cat.name}</td>
                <td class="px-5 py-4">${badge}</td>
                <td class="px-5 py-4 text-center">
                    <button onclick="deleteCategory('${cat.id}')" class="text-slate-400 hover:text-danger transition-all p-2 rounded-xl hover:bg-red-50 shadow-sm" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}

const categoryForm = document.getElementById('categoryForm');
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newCategoryName').value.trim();
        const type = document.getElementById('newCategoryType').value;
        if (!name) return;

        const { data, error } = await db.from('categories').insert([{ name, type, user_id: currentUser.id }]).select();
        if (error) {
            alert("Gagal menambah kategori: " + error.message);
        } else if (data) {
            categories.push(data[0]);
            document.getElementById('newCategoryName').value = '';
            renderMasterCategories();
            updateCategoryOptions();
            applyFilter(); 
        }
    });
}

async function deleteCategory(id) {
    const isUsed = transactions.some(t => t.category_id === id);
    if (isUsed) {
        alert("Kategori ini tidak bisa dihapus karena sedang digunakan oleh transaksi yang ada.");
        return;
    }

    if (confirm("Hapus kategori ini?")) {
        const { error } = await db.from('categories').delete().eq('id', id);
        if (error) {
            alert("Gagal menghapus kategori: " + error.message);
        } else {
            categories = categories.filter(c => c.id !== id);
            renderMasterCategories();
            updateCategoryOptions();
        }
    }
}

function updateCategoryOptions() {
    const typeEl = document.querySelector('input[name="type"]:checked');
    if (!typeEl) return;
    const type = typeEl.value;
    const catSelect = document.getElementById('category');
    if (!catSelect) return;
    
    catSelect.innerHTML = ''; 
    const filteredCats = categories.filter(c => c.type === type);

    if (filteredCats.length === 0) {
        catSelect.innerHTML = `<option value="">Silakan tambah kategori di Master Data</option>`;
    } else {
        filteredCats.forEach(cat => {
            catSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }
}

// --- GRAFIK DASHBOARD ---
function updateDashboardChart(filtered) {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;
    if (dashboardChart) dashboardChart.destroy();

    const dateMap = {};
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(t => {
        const d = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (!dateMap[d]) dateMap[d] = { income: 0, expense: 0 };
        if (t.type === 'income') dateMap[d].income += Number(t.amount);
        else dateMap[d].expense += Number(t.amount);
    });

    const labels = Object.keys(dateMap);
    const incomeData = labels.map(l => dateMap[l].income);
    const expenseData = labels.map(l => dateMap[l].expense);

    const canvasCtx = ctx.getContext('2d');
    
    const incomeGradient = canvasCtx.createLinearGradient(0, 0, 0, 250);
    incomeGradient.addColorStop(0, 'rgba(5, 150, 105, 0.25)');
    incomeGradient.addColorStop(1, 'rgba(5, 150, 105, 0.0)');

    const expenseGradient = canvasCtx.createLinearGradient(0, 0, 0, 250);
    expenseGradient.addColorStop(0, 'rgba(220, 38, 38, 0.25)');
    expenseGradient.addColorStop(1, 'rgba(220, 38, 38, 0.0)');

    dashboardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Belum ada data'],
            datasets: [
                { label: 'Pemasukan', data: incomeData.length > 0 ? incomeData : [0], borderColor: '#059669', backgroundColor: incomeGradient, borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#059669' },
                { label: 'Pengeluaran', data: expenseData.length > 0 ? expenseData : [0], borderColor: '#dc2626', backgroundColor: expenseGradient, borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#dc2626' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { display: false },
                tooltip: { 
                    backgroundColor: '#0f172a', titleFont: { family: 'Inter', size: 12, weight: 'bold' }, bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                    padding: 12, cornerRadius: 14, displayColors: true 
                } 
            },
            scales: { 
                x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11, weight: '600' }, color: '#94a3b8' } },
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 11, weight: '600' }, color: '#94a3b8', callback: function(value) { if(value >= 1000000) return 'Rp ' + (value/1000000).toLocaleString('id-ID') + 'Jt'; if(value >= 1000) return 'Rp ' + (value/1000).toLocaleString('id-ID') + 'rb'; return 'Rp ' + value; } } } 
            }
        }
    });
}

// --- LAPORAN AKUNTANSI ---
function updateAccountingReports(filtered) {
    const incRowsEl = document.getElementById('reportIncomeRows');
    const expRowsEl = document.getElementById('reportExpenseRows');
    const totIncEl = document.getElementById('reportTotalIncome');
    const totExpEl = document.getElementById('reportTotalExpense');
    const netProfitEl = document.getElementById('reportNetProfit');
    const netProfitLabel = document.getElementById('netProfitLabel');
    const ledgerContainer = document.getElementById('generalLedgerContainer');

    if (!incRowsEl || !ledgerContainer) return;

    incRowsEl.innerHTML = ''; expRowsEl.innerHTML = ''; ledgerContainer.innerHTML = '';
    let totalInc = 0; let totalExp = 0;
    const catMap = {};

    filtered.forEach(t => {
        const catName = getCategoryName(t.category_id);
        if (!catMap[catName]) catMap[catName] = { type: t.type, items: [], total: 0 };
        catMap[catName].items.push(t);
        catMap[catName].total += Number(t.amount);

        if (t.type === 'income') totalInc += Number(t.amount);
        else totalExp += Number(t.amount);
    });

    const incomeCategories = Object.keys(catMap).filter(cat => catMap[cat].type === 'income');
    incomeCategories.forEach(cat => {
        incRowsEl.innerHTML += `<div class="flex justify-between py-1.5"><span class="text-slate-600 font-semibold">${cat}</span><span class="font-bold text-slate-800">${formatRupiah(catMap[cat].total)}</span></div>`;
    });
    totIncEl.innerText = formatRupiah(totalInc);

    const expenseCategories = Object.keys(catMap).filter(cat => catMap[cat].type === 'expense');
    expenseCategories.forEach(cat => {
        expRowsEl.innerHTML += `<div class="flex justify-between py-1.5"><span class="text-slate-600 font-semibold">${cat}</span><span class="font-bold text-slate-800">${formatRupiah(catMap[cat].total)}</span></div>`;
    });
    totExpEl.innerText = formatRupiah(totalExp);

    const netProfit = totalInc - totalExp;
    netProfitEl.innerText = formatRupiah(netProfit);
    if (netProfit < 0) { netProfitLabel.innerText = "Rugi Bersih"; netProfitEl.className = "text-danger font-black"; } 
    else { netProfitLabel.innerText = "Laba Bersih"; netProfitEl.className = "text-success font-black"; }

    for (const [cat, data] of Object.entries(catMap)) {
        const badgeColor = data.type === 'income' ? 'bg-emerald-50 text-success border-emerald-200' : 'bg-red-50 text-danger border-red-200';
        let rowsHtml = '';
        data.items.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            rowsHtml += `<tr class="border-b border-slate-50 hover:bg-slate-50 text-xs"><td class="py-3 px-5 text-slate-600 font-semibold">${dateStr}</td><td class="py-3 px-5 text-slate-800 font-bold">${item.description}</td><td class="py-3 px-5 text-right font-extrabold text-slate-900">${formatRupiah(item.amount)}</td></tr>`;
        });
        ledgerContainer.innerHTML += `
            <div class="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div class="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex justify-between items-center"><span class="px-3 py-1 text-xs font-extrabold rounded-xl border ${badgeColor}">${cat}</span><span class="text-xs font-bold text-slate-700">Total Mutasi: ${formatRupiah(data.total)}</span></div>
                <div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="text-[11px] uppercase text-slate-400 bg-slate-50/40 border-b border-slate-100 font-extrabold"><th class="py-2.5 px-5">Tanggal</th><th class="py-2.5 px-5">Keterangan</th><th class="py-2.5 px-5 text-right">Jumlah</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
            </div>
        `;
    }
}

// --- MANAJEMEN ANGGARAN (BUDGETING) ---
function updateBudgetPage(filteredTransactions) {
    const listEl = document.getElementById('budgetTableList');
    const selectEl = document.getElementById('budgetCategorySelect');
    if (!listEl || !selectEl) return;

    selectEl.innerHTML = '';
    const expenseCats = categories.filter(c => c.type === 'expense');
    if (expenseCats.length === 0) {
        selectEl.innerHTML = `<option value="">Belum ada kategori pengeluaran</option>`;
    } else {
        expenseCats.forEach(cat => {
            selectEl.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }

    listEl.innerHTML = '';
    if (budgets.length === 0) {
        listEl.innerHTML = `<tr><td colspan="5" class="px-5 py-8 text-center text-slate-400 font-medium">Belum ada batas anggaran yang ditetapkan.</td></tr>`;
        return;
    }

    budgets.forEach(b => {
        const catName = getCategoryName(b.category_id);
        const spentThisMonth = filteredTransactions
            .filter(t => t.category_id === b.category_id && t.type === 'expense' && isThisMonth(t.date))
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const limit = Number(b.limit_amount);
        const percentage = limit > 0 ? Math.min(Math.round((spentThisMonth / limit) * 100), 100) : 0;
        
        let barColor = 'bg-success';
        let statusBadge = '<span class="px-3 py-1 bg-emerald-50 text-success text-xs rounded-xl border border-emerald-200 font-extrabold">Aman</span>';

        if (spentThisMonth > limit) {
            barColor = 'bg-danger';
            statusBadge = '<span class="px-3 py-1 bg-red-50 text-danger text-xs rounded-xl border border-red-200 font-black animate-pulse">⚠️ Melewati Batas!</span>';
        } else if (percentage >= 80) {
            barColor = 'bg-amber-500';
            statusBadge = '<span class="px-3 py-1 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-200 font-extrabold">Mendekati Batas</span>';
        }

        listEl.innerHTML += `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="px-5 py-4 font-extrabold text-slate-800">${catName}</td>
                <td class="px-5 py-4 text-slate-700 font-bold">${formatRupiah(spentThisMonth)}</td>
                <td class="px-5 py-4 text-slate-700 font-bold">${formatRupiah(limit)}</td>
                <td class="px-5 py-4">
                    <div class="flex justify-between text-xs font-bold mb-1.5"><span>${percentage}%</span> ${statusBadge}</div>
                    <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner"><div class="${barColor} h-3 rounded-full transition-all" style="width: ${percentage}%"></div></div>
                </td>
                <td class="px-5 py-4 text-center">
                    <button onclick="deleteBudget('${b.id}')" class="text-slate-400 hover:text-danger transition-all p-2 rounded-xl hover:bg-red-50 shadow-sm" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}

const budgetForm = document.getElementById('budgetForm');
if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category_id = document.getElementById('budgetCategorySelect').value;
        const limit_amount = parseRupiah(document.getElementById('budgetLimitAmount').value);

        if (!category_id || limit_amount <= 0) return alert("Harap isi kategori dan batas nominal yang valid!");

        const existing = budgets.find(b => b.category_id === category_id);
        if (existing) {
            const { error } = await db.from('budgets').update({ limit_amount }).eq('id', existing.id);
            if (error) return alert("Gagal memperbarui anggaran: " + error.message);
            existing.limit_amount = limit_amount;
        } else {
            const { data, error } = await db.from('budgets').insert([{ category_id, limit_amount, user_id: currentUser.id }]).select();
            if (error) return alert("Gagal menyimpan anggaran: " + error.message);
            if (data) budgets.push(data[0]);
        }

        document.getElementById('budgetLimitAmount').value = '';
        applyFilter();
        alert("Batas anggaran berhasil disimpan!");
    });
}

async function deleteBudget(id) {
    if (confirm("Hapus batas anggaran ini?")) {
        const { error } = await db.from('budgets').delete().eq('id', id);
        if (error) {
            alert("Gagal menghapus anggaran: " + error.message);
        } else {
            budgets = budgets.filter(b => b.id !== id);
            applyFilter();
        }
    }
}

// --- UPDATE TAMPILAN LAINNYA ---
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

// --- RIWAYAT TRANSAKSI ---
function updateTransactionList(filtered) {
    const listEl = document.getElementById('transactionList');
    const countEl = document.getElementById('transactionCount');
    const toggleContainer = document.getElementById('toggleContainer');
    const toggleBtn = document.getElementById('toggleBtn');
    const hiddenCountEl = document.getElementById('hiddenCount');

    if (!listEl) return;
    if (countEl) countEl.innerText = `${filtered.length} item`;
    listEl.innerHTML = ''; 

    if (!filtered || filtered.length === 0) {
        listEl.innerHTML = `<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400 font-semibold">Belum ada catatan transaksi yang ditemukan.</td></tr>`;
        if (toggleContainer) toggleContainer.classList.add('hidden');
        return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    const displayedTransactions = isShowingAll ? sorted : sorted.slice(0, 7);

    if (toggleContainer && toggleBtn) {
        if (sorted.length > 7) {
            toggleContainer.classList.remove('hidden');
            const remaining = sorted.length - 7;
            if (hiddenCountEl) hiddenCountEl.innerText = remaining;
            if (isShowingAll) {
                toggleBtn.innerHTML = `<i class="fa-solid fa-chevron-up mr-1.5"></i> Sembunyikan Kembali`;
            } else {
                toggleBtn.innerHTML = `<i class="fa-solid fa-chevron-down mr-1.5"></i> Tampilkan Semua (${remaining} lainnya)`;
            }
        } else {
            toggleContainer.classList.add('hidden');
        }
    }

    displayedTransactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-all border-b border-slate-50 group';
        const isInc = t.type === 'income';
        const catText = getCategoryName(t.category_id);
        
        // Menggunakan ikon dompet untuk pemasukan dan tas belanja untuk pengeluaran (tanpa kotak kecil)
        const iconName = isInc ? 'fa-wallet text-success' : 'fa-bag-shopping text-danger';
        
        tr.innerHTML = `
            <td class="px-6 sm:px-8 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-slate-100/80 shadow-sm">
                        <i class="fa-solid ${iconName} text-sm"></i>
                    </div>
                    <span>${new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
            </td>
            <td class="px-6 sm:px-8 py-4 text-sm font-extrabold text-slate-800">${t.description}</td>
            <td class="px-6 sm:px-8 py-4"><span class="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-xl border border-slate-200/80 font-extrabold">${catText}</span></td>
            <td class="px-6 sm:px-8 py-4 text-sm text-right font-black tracking-tight ${isInc ? 'text-success' : 'text-danger'}">${isInc ? '+' : '-'} ${formatRupiah(t.amount)}</td>
            <td class="px-6 sm:px-8 py-4 text-center whitespace-nowrap">
                <button onclick="editTx('${t.id}')" class="text-slate-400 hover:text-primary transition-all p-2 rounded-xl hover:bg-blue-50 mr-1 shadow-sm hover:shadow" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteTx('${t.id}')" class="text-slate-400 hover:text-danger transition-all p-2 rounded-xl hover:bg-red-50 shadow-sm hover:shadow" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        listEl.appendChild(tr);
    });
}

function toggleShowAll() {
    isShowingAll = !isShowingAll;
    applyFilter();
}

function updateCategoryPage(filtered) {
    const incList = document.getElementById('incomeCategoryList');
    const expList = document.getElementById('expenseCategoryList');
    if (!incList || !expList) return;
    incList.innerHTML = ''; expList.innerHTML = '';
    const catTotals = { income: {}, expense: {} };
    let totalInc = 0; let totalExp = 0;

    filtered.forEach(t => {
        const catName = getCategoryName(t.category_id);
        if (t.type === 'income') { catTotals.income[catName] = (catTotals.income[catName] || 0) + Number(t.amount); totalInc += Number(t.amount); } 
        else { catTotals.expense[catName] = (catTotals.expense[catName] || 0) + Number(t.amount); totalExp += Number(t.amount); }
    });

    for (const [cat, amt] of Object.entries(catTotals.expense).sort((a, b) => b[1] - a[1])) {
        const percent = totalExp > 0 ? ((amt / totalExp) * 100).toFixed(1) : 0;
        expList.innerHTML += `<div><div class="flex justify-between text-sm mb-2 font-bold"><span class="text-slate-700">${cat}</span><span class="text-slate-600">${formatRupiah(amt)} (${percent}%)</span></div><div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner"><div class="bg-danger h-3 rounded-full transition-all" style="width: ${percent}%"></div></div></div>`;
    }
    for (const [cat, amt] of Object.entries(catTotals.income).sort((a, b) => b[1] - a[1])) {
        const percent = totalInc > 0 ? ((amt / totalInc) * 100).toFixed(1) : 0;
        incList.innerHTML += `<div><div class="flex justify-between text-sm mb-2 font-bold"><span class="text-slate-700">${cat}</span><span class="text-slate-600">${formatRupiah(amt)} (${percent}%)</span></div><div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner"><div class="bg-success h-3 rounded-full transition-all" style="width: ${percent}%"></div></div></div>`;
    }
}

// --- FILTER & PENCARIAN LANJUTAN ---
function applyFilter() {
    let filtered = [...transactions];

    if (currentFilter === 'month') {
        filtered = filtered.filter(t => isThisMonth(t.date));
    }

    const startDateVal = document.getElementById('startDate') ? document.getElementById('startDate').value : '';
    const endDateVal = document.getElementById('endDate') ? document.getElementById('endDate').value : '';
    
    if (startDateVal) {
        filtered = filtered.filter(t => t.date >= startDateVal);
    }
    if (endDateVal) {
        filtered = filtered.filter(t => t.date <= endDateVal);
    }

    const searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
    if (searchVal) {
        filtered = filtered.filter(t => {
            const desc = t.description ? t.description.toLowerCase() : '';
            const catName = getCategoryName(t.category_id).toLowerCase();
            return desc.includes(searchVal) || catName.includes(searchVal);
        });
    }

    updateSummary(filtered);
    updateDashboardChart(filtered);
    updateTransactionList(filtered);
    updateCategoryPage(filtered); 
    updateAccountingReports(filtered);
    updateBudgetPage(filtered);

    const btnAll = document.getElementById('btnFilter-all');
    const btnMonth = document.getElementById('btnFilter-month');
    if (btnAll) btnAll.className = currentFilter === 'all' ? "px-4 py-2 text-xs font-extrabold rounded-xl transition-all bg-white shadow-sm text-primary" : "px-4 py-2 text-xs font-bold rounded-xl transition-all text-slate-500 hover:text-slate-700";
    if (btnMonth) btnMonth.className = currentFilter === 'month' ? "px-4 py-2 text-xs font-extrabold rounded-xl transition-all bg-white shadow-sm text-primary" : "px-4 py-2 text-xs font-bold rounded-xl transition-all text-slate-500 hover:text-slate-700";
}

function setFilter(type) { 
    currentFilter = type; 
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    applyFilter(); 
}

// --- WAKTU REAL-TIME ---
function updateClock() {
    const timeEl = document.getElementById('liveTime');
    if (!timeEl) return;
    const now = new Date();
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
    const tanggal = now.getDate();
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()];
    const tahun = now.getFullYear();
    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const detik = String(now.getSeconds()).padStart(2, '0');
    timeEl.innerText = `${hari}, ${tanggal} ${bulan} ${tahun} • ${jam}:${menit}:${detik}`;
}
setInterval(updateClock, 1000); updateClock();

// --- MODAL & FORM ---
function openModal() {
    updateCategoryOptions();
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
        editingTransactionId = null;
        const title = document.querySelector('#modalContent h3');
        if (title) title.innerText = 'Tambah Transaksi';
    }, 300);
}

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
    if (catSelect) catSelect.value = t.category_id || ''; 
    
    const amountInput = document.getElementById('amount');
    if (amountInput) amountInput.value = new Intl.NumberFormat('id-ID').format(t.amount);
    const descInput = document.getElementById('description');
    if (descInput) descInput.value = t.description;
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = t.date;
    openModal();
}

const txForm = document.getElementById('transactionForm');
if (txForm) {
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Anda harus login.");
        
        const type = document.querySelector('input[name="type"]:checked').value;
        const category_id = document.getElementById('category').value; 
        const amount = parseRupiah(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value;
        
        if (!category_id) return alert("Silakan tambah kategori terlebih dahulu di menu Master Kategori.");
        if (amount <= 0) return alert("Jumlah tidak valid.");
        
        const txData = { type, category_id, amount, description, date, user_id: currentUser.id };
        
        try {
            if (editingTransactionId) {
                const { data, error } = await db.from('transactions').update(txData).eq('id', editingTransactionId).select();
                if (error) throw error;
                if (data && data.length > 0) {
                    const index = transactions.findIndex(t => t.id === editingTransactionId);
                    if (index !== -1) transactions[index] = data[0]; 
                }
            } else {
                const { data, error } = await db.from('transactions').insert([txData]).select();
                if (error) throw error;
                if (data && data.length > 0) { transactions.push(data[0]); }
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