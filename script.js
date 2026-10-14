// --- KONFIGURASI SUPABASE ---
const supabaseUrl = 'https://onssvkrjtoqxzdvjbeob.supabase.co';
const supabaseKey = 'sb_publishable_YXYOrvgDRHCxKJ1eorzmjg_1dcrPMmi';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- State Management ---
let transactions = [];
let currentFilter = 'all'; 
let transactionToDeleteId = null;
let currentUser = null; // Menyimpan data user yang sedang login

// --- AUTHENTICATION (SISTEM LOGIN) ---
// Mengecek apakah ada yang sudah login otomatis (sesi aktif)
db.auth.onAuthStateChange((event, session) => {
    if (session) {
        // Jika ada yang login, sembunyikan form login, tampilkan aplikasi utama
        currentUser = session.user;
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('flex');
        init(); // Panggil data transaksi milik user ini
    } else {
        // Jika tidak ada yang login (atau logout)
        currentUser = null;
        document.getElementById('authContainer').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('flex');
        
        // Kosongkan data agar aman
        transactions = [];
        updateTransactionList([]);
        updateSummary([]);
    }
});

// Fungsi untuk Daftar & Masuk
async function handleAuth(actionType) {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
        alert("Harap isi email dan password!");
        return;
    }

    if (actionType === 'login') {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Login gagal: " + error.message);
        }
    } else if (actionType === 'register') {
        const { error } = await db.auth.signUp({ email, password });
        if (error) {
            alert("Pendaftaran gagal: " + error.message);
        } else {
            alert("Berhasil mendaftar! Anda akan langsung masuk ke aplikasi.");
            // Kosongkan form
            document.getElementById('authEmail').value = '';
            document.getElementById('authPassword').value = '';
        }
    }
}

// Fungsi Logout
async function handleLogout() {
    const { error } = await db.auth.signOut();
    if (error) {
        alert("Gagal keluar: " + error.message);
    }
}


// --- Helper Functions Format Angka ---
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function parseRupiah(rupiahString) {
    return parseInt(rupiahString.replace(/[^,\d]/g, ''), 10) || 0;
}

function formatRupiahInput(input) {
    let value = input.value.replace(/[^,\d]/g, '');
    if (value) {
        input.value = new Intl.NumberFormat('id-ID').format(parseInt(value, 10));
    } else {
        input.value = '';
    }
}

// Filter Tanggal
function isThisWeek(dateString) {
    const today = new Date();
    const date = new Date(dateString);
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    const lastDayOfWeek = new Date(today);
    lastDayOfWeek.setDate(today.getDate() - today.getDay() + 6);

    return date >= firstDayOfWeek && date <= lastDayOfWeek;
}

function isThisMonth(dateString) {
    const today = new Date();
    const date = new Date(dateString);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

// --- UI Updating Functions ---
function updateSummary(filteredTransactions) {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach(t => {
        if (t.type === 'income') {
            income += Number(t.amount);
        } else {
            expense += Number(t.amount);
        }
    });

    const balance = income - expense;
    const balanceEl = document.getElementById('totalBalance');
    balanceEl.innerText = formatRupiah(balance);
    
    if (balance < 0) {
        balanceEl.className = 'text-3xl font-bold text-danger';
    } else {
        balanceEl.className = 'text-3xl font-bold text-slate-800';
    }

    document.getElementById('totalIncome').innerText = formatRupiah(income);
    document.getElementById('totalExpense').innerText = formatRupiah(expense);
    
    let filterText = 'Semua Waktu';
    if (currentFilter === 'month') filterText = 'Bulan Ini';
    if (currentFilter === 'week') filterText = 'Minggu Ini';
    
    document.querySelectorAll('.filter-label').forEach(el => {
        el.innerText = filterText;
    });
}

function updateTransactionList(filteredTransactions) {
    const listEl = document.getElementById('transactionList');
    const emptyState = document.getElementById('emptyState');
    const countEl = document.getElementById('transactionCount');
    
    Array.from(listEl.children).forEach(child => {
        if (child.id !== 'emptyState') {
            child.remove();
        }
    });

    countEl.innerText = `${filteredTransactions.length} item`;

    if (filteredTransactions.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedTransactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0';
            
            const isIncome = t.type === 'income';
            const amountColor = isIncome ? 'text-success' : 'text-danger';
            const sign = isIncome ? '+' : '-';
            
            const dateObj = new Date(t.date);
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

            tr.innerHTML = `
                <td class="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-100 text-success' : 'bg-red-100 text-danger'}">
                            <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
                        </div>
                        <span class="font-medium">${dateStr}</span>
                    </div>
                </td>
                <td class="px-5 py-4 text-sm text-slate-800 font-medium">${t.description}</td>
                <td class="px-5 py-4 whitespace-nowrap text-sm text-right font-bold ${amountColor}">
                    ${sign} ${formatRupiah(t.amount)}
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-center text-sm">
                    <button onclick="requestDelete('${t.id}')" class="text-slate-400 hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-red-50">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            listEl.appendChild(tr);
        });
    }
}

// --- Application Logic & Filter ---
function applyFilter() {
    let filtered = transactions;
    if (currentFilter === 'week') {
        filtered = transactions.filter(t => isThisWeek(t.date));
    } else if (currentFilter === 'month') {
        filtered = transactions.filter(t => isThisMonth(t.date));
    }

    updateSummary(filtered);
    updateTransactionList(filtered);
    updateFilterButtons();
}

function setFilter(filterType) {
    currentFilter = filterType;
    applyFilter();
}

function updateFilterButtons() {
    const filters = ['all', 'month', 'week'];
    filters.forEach(f => {
        const btn = document.getElementById(`btnFilter-${f}`);
        if (f === currentFilter) {
            btn.className = "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors bg-white shadow-sm text-primary";
        } else {
            btn.className = "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-500 hover:text-slate-700 hover:bg-white/50";
        }
    });
}

// --- SUPABASE DATABASE OPERATIONS ---
async function init() {
    if (!currentUser) return; // Jangan ambil data jika belum login

    document.getElementById('currentYear').innerText = new Date().getFullYear();
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('currentDateDisplay').innerText = today;
    document.getElementById('date').valueAsDate = new Date();

    try {
        // Hanya ambil data transaksi di mana user_id sesuai dengan id pengguna yang login
        const { data, error } = await db
            .from('transactions')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error("Gagal memuat data:", error);
        } else if (data) {
            transactions = data;
        }
    } catch (err) {
        console.error("Kesalahan sistem:", err);
    }

    applyFilter();
}

// --- Modal Controls ---
const modal = document.getElementById('transactionModal');
const modalContent = document.getElementById('modalContent');
const form = document.getElementById('transactionForm');

function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        modalContent.classList.remove('translate-y-full', 'sm:translate-y-4');
        modalContent.classList.add('translate-y-0');
        document.getElementById('amount').focus();
    }, 10);
}

function closeModal() {
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    modalContent.classList.remove('translate-y-0');
    modalContent.classList.add('translate-y-full', 'sm:translate-y-4');
    setTimeout(() => {
        modal.classList.add('hidden');
        form.reset();
        document.getElementById('date').valueAsDate = new Date();
    }, 300);
}

const confirmModal = document.getElementById('confirmModal');
const confirmContent = document.getElementById('confirmContent');

function requestDelete(id) {
    transactionToDeleteId = id;
    confirmModal.classList.remove('hidden');
    setTimeout(() => {
        confirmModal.classList.remove('opacity-0');
        confirmModal.classList.add('opacity-100');
        confirmContent.classList.remove('scale-95');
        confirmContent.classList.add('scale-100');
    }, 10);
}

function closeConfirmModal() {
    transactionToDeleteId = null;
    confirmModal.classList.remove('opacity-100');
    confirmModal.classList.add('opacity-0');
    confirmContent.classList.remove('scale-100');
    confirmContent.classList.add('scale-95');
    setTimeout(() => {
        confirmModal.classList.add('hidden');
    }, 300);
}

// Hapus Data
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (transactionToDeleteId) {
        try {
            const { error } = await db
                .from('transactions')
                .delete()
                .eq('id', transactionToDeleteId)
                .eq('user_id', currentUser.id); // Tambahan keamanan

            if (error) {
                console.error("Gagal menghapus:", error);
                alert("Gagal menghapus transaksi dari database.");
                return;
            }

            transactions = transactions.filter(t => t.id !== transactionToDeleteId);
            applyFilter();
            closeConfirmModal();
        } catch (err) {
            console.error("Kesalahan sistem saat menghapus:", err);
        }
    }
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeConfirmModal();
});

// Simpan Data
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
        alert("Anda harus login untuk menyimpan transaksi.");
        return;
    }

    const type = document.querySelector('input[name="type"]:checked').value;
    const amountStr = document.getElementById('amount').value;
    const amount = parseRupiah(amountStr);
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;

    if (amount <= 0) {
        alert("Harap masukkan jumlah yang valid (lebih dari 0).");
        return;
    }

    const newTransaction = {
        type: type,
        amount: amount,
        description: description,
        date: date,
        user_id: currentUser.id // MENYIMPAN ID PENGGUNA YANG SEDANG LOGIN!
    };

    try {
        const { data, error } = await db
            .from('transactions')
            .insert([newTransaction])
            .select();

        if (error) {
            console.error("Gagal menyimpan:", error);
            alert('Gagal menyimpan transaksi ke database.');
            return;
        }

        if (data && data.length > 0) {
            transactions.push(data[0]);
        }

        applyFilter();
        closeModal();
    } catch (err) {
        console.error("Kesalahan sistem saat menyimpan:", err);
    }
});