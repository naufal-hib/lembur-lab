// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let allKaryawan = [];
let allLembur = [];
let allCutOff = [];
let activeCutOffs = [];
let selectedCutOff = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// Calendar state - INDEPENDENT from period selection
let currentCalendarMonth = new Date();
let allUserLemburForCalendar = []; // Store all user's lembur data for calendar

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.id = 'alert';
    alertDiv.className = `fixed top-4 right-4 ${{
        success: 'bg-green-100 border-l-4 border-green-500 text-green-700',
        error: 'bg-red-100 border-l-4 border-red-500 text-red-700',
        warning: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700',
        info: 'bg-blue-100 border-l-4 border-blue-500 text-blue-700'
    }[type]} p-4 rounded shadow-lg z-50 max-w-md`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <p class="font-medium">${message}</p>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function parseJamLembur(jamString) {
    if (!jamString) return 0;
    const match = String(jamString).match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return null;
    }
}

// ============================================
// GOOGLE SHEETS API FUNCTIONS
// ============================================
async function fetchSheetData(sheetName, range = '') {
    const url = getSheetUrl(sheetName, range);
    console.log(`Fetching ${sheetName}...`);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ ${sheetName}: ${data.values ? data.values.length : 0} rows`);
    return data.values || [];
}

async function loadAllData() {
    console.log('🔄 Loading data from Google Sheets...');
    showLoading();
    try {
        const configCheck = validateConfig();
        if (!configCheck.valid) {
            throw new Error(configCheck.message);
        }
        
        const [karyawanData, lemburData, cutOffData] = await Promise.all([
            fetchSheetData(SHEET_CONFIG.KARYAWAN),
            fetchSheetData(SHEET_CONFIG.LEMBUR),
            fetchSheetData(SHEET_CONFIG.CUTOFF)
        ]);
        
        allKaryawan = processKaryawanData(karyawanData);
        allLembur = processLemburData(lemburData);
        allCutOff = processCutOffData(cutOffData);
        
        activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
        
        if (activeCutOffs.length > 0) {
            selectedCutOff = activeCutOffs[activeCutOffs.length - 1];
        } else if (allCutOff.length > 0) {
            selectedCutOff = allCutOff[allCutOff.length - 1];
        }
        
        console.log('✅ Data loaded:', {
            karyawan: allKaryawan.length,
            lembur: allLembur.length,
            cutoff: allCutOff.length,
            activeCutOffs: activeCutOffs.length
        });
        
        saveToLocalStorage('karyawan', allKaryawan);
        saveToLocalStorage('lembur', allLembur);
        saveToLocalStorage('cutoff', allCutOff);
        saveToLocalStorage('lastUpdate', new Date().toISOString());
        
        hideLoading();
        return true;
    } catch (error) {
        console.error('❌ Error loading data:', error);
        hideLoading();
        
        const cachedKaryawan = getFromLocalStorage('karyawan');
        const cachedLembur = getFromLocalStorage('lembur');
        const cachedCutOff = getFromLocalStorage('cutoff');
        
        if (cachedKaryawan && cachedLembur && cachedCutOff) {
            allKaryawan = cachedKaryawan;
            allLembur = cachedLembur;
            allCutOff = cachedCutOff;
            activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
            
            if (activeCutOffs.length > 0) {
                selectedCutOff = activeCutOffs[activeCutOffs.length - 1];
            } else if (allCutOff.length > 0) {
                selectedCutOff = allCutOff[allCutOff.length - 1];
            }
            
            console.log('✅ Loaded from cache');
            showAlert('Data dimuat dari cache. Koneksi internet bermasalah.', 'warning');
            return true;
        }
        
        showAlert('Gagal memuat data. Periksa koneksi internet dan konfigurasi.', 'error');
        return false;
    }
}

function processKaryawanData(data) {
    if (data.length < 2) return [];
    const rows = data.slice(1);

    return rows.filter(row => row[0]).map(row => ({
        nik: String(row[0] || '').trim(),
        nama: row[1] || '',
        departemen: row[2] || '',
        jabatan: row[3] || '',
        password: row[4] || '123',
        level: row[5] || 'staff',
        telepon: row[6] || '' // FIXED: Tambah kolom telepon
    }));
}

function processLemburData(data) {
    if (data.length < 2) return [];
    const rows = data.slice(1);

    return rows.filter(row => row[2]).map(row => ({
        no: row[0] || '',
        tanggal: row[1] || '',
        nik: String(row[2] || '').trim(),
        nama: row[3] || '',
        departemen: row[4] || '',
        jabatan: row[5] || '',
        jenisLembur: row[6] || '',
        jamLembur: row[7] || '',
        insentifKopi: row[8] || '',
        keterangan: row[9] || '',
        pengecekan: row[10] || ''
    }));
}

function processCutOffData(data) {
    if (data.length < 2) return [];
    const rows = data.slice(1);

    return rows.filter(row => row[0]).map(row => ({
        bulan: row[0] || '',
        tanggalMulai: row[1] || '',
        tanggalAkhir: row[2] || '',
        status: row[3] || ''
    }));
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
async function login(nik, password) {
    console.log('Login attempt:', nik);
    showLoading();
    
    if (nik === ADMIN_CONFIG.NIK) {
        if (password === ADMIN_CONFIG.PASSWORD) {
            currentUser = {
                nik: 'admin',
                nama: 'Administrator',
                role: 'admin'
            };
            saveToLocalStorage('currentUser', currentUser);
            console.log('✅ Admin login success');
            hideLoading();
            window.location.href = 'dashboard-admin.html';
            return;
        } else {
            hideLoading();
            showAlert('Password admin salah!', 'error');
            return;
        }
    }

    if (allKaryawan.length === 0) {
        const success = await loadAllData();
        if (!success) {
            hideLoading();
            return;
        }
    }

    const user = allKaryawan.find(k => k.nik === nik);

    if (!user) {
        hideLoading();
        showAlert('NIK tidak ditemukan!', 'error');
        return;
    }

    if (user.password !== password) {
        hideLoading();
        showAlert('Password salah!', 'error');
        return;
    }

    currentUser = {
        nik: user.nik,
        nama: user.nama,
        jabatan: user.jabatan,
        level: user.level,
        role: 'karyawan'
    };
    saveToLocalStorage('currentUser', currentUser);
    console.log('✅ Karyawan login success:', currentUser.nama);
    hideLoading();
    window.location.href = 'dashboard-karyawan.html';
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function checkAuth() {
    currentUser = getFromLocalStorage('currentUser');
    if (!currentUser) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============================================
// OVERTIME CALCULATION
// ============================================
function calculateInsentif(jamLembur, jenisLembur, level) {
    const jam = parseJamLembur(jamLembur);
    const isHariLibur = jenisLembur && jenisLembur.toLowerCase().includes('libur');
    const isSupervisor = level === 'supervisor';
    
    if (isHariLibur) {
        if (jam >= 10) return 120000;
        if (jam >= 5) return 100000;
        if (jam >= 1) return 50000;
        return 0;
    } else {
        if (isSupervisor) {
            if (jam < 2) return 0;
            return 30000 + ((jam - 2) * 15000);
        } else {
            if (jam < 2) return 0;
            return 40000 + ((jam - 2) * 20000);
        }
    }
}

function filterLemburByPeriod(lemburData, cutOff) {
    if (!cutOff) return lemburData;
    const startDate = new Date(cutOff.tanggalMulai);
    const endDate = new Date(cutOff.tanggalAkhir);

    return lemburData.filter(l => {
        const lemburDate = new Date(l.tanggal);
        return lemburDate >= startDate && lemburDate <= endDate;
    });
}

// ============================================
// KARYAWAN DASHBOARD
// ============================================
async function initKaryawanDashboard() {
    console.log('🚀 Init Karyawan Dashboard');
    if (!checkAuth()) return;

    const cachedKaryawan = getFromLocalStorage('karyawan');
    const cachedLembur = getFromLocalStorage('lembur');
    const cachedCutOff = getFromLocalStorage('cutoff');

    if (cachedKaryawan && cachedLembur && cachedCutOff) {
        allKaryawan = cachedKaryawan;
        allLembur = cachedLembur;
        allCutOff = cachedCutOff;
        activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
        
        if (activeCutOffs.length > 0) {
            selectedCutOff = activeCutOffs[activeCutOffs.length - 1];
        } else if (allCutOff.length > 0) {
            selectedCutOff = allCutOff[allCutOff.length - 1];
        }
        
        renderKaryawanDashboard();
    }

    loadAllData().then((success) => {
        if (success) {
            renderKaryawanDashboard();
        }
    });
}

function renderKaryawanDashboard() {
    console.log("🎨 Rendering Karyawan Dashboard");
    
    // User info
    const userNameEl = document.getElementById("userName");
    const userNIKEl = document.getElementById("userNIK");
    if (userNameEl) userNameEl.textContent = currentUser.nama;
    if (userNIKEl) userNIKEl.textContent = `NIK: ${currentUser.nik} | ${currentUser.jabatan}`;

    // Period selector
    renderPeriodSelector();
    
    // Active period display
    const activePeriodEl = document.getElementById("activePeriod");
    if (activePeriodEl && selectedCutOff) {
        activePeriodEl.textContent = `${selectedCutOff.bulan}: ${formatDate(selectedCutOff.tanggalMulai)} - ${formatDate(selectedCutOff.tanggalAkhir)}`;
    } else if (activePeriodEl) {
        activePeriodEl.textContent = "Tidak ada periode aktif";
    }

    // Filter lembur by selected period
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    
    // Store ALL user lembur for calendar (INDEPENDENT from period filter)
    allUserLemburForCalendar = userLembur;
    console.log('📊 Total user lembur for calendar:', allUserLemburForCalendar.length);
    
    const periodLembur = selectedCutOff ? filterLemburByPeriod(userLembur, selectedCutOff) : userLembur;

    // Calculate totals for SELECTED PERIOD
    let totalHours = 0;
    let totalInsentif = 0;

    periodLembur.forEach(l => {
        totalHours += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
    });

    // Display stats - SINGLE SET
    const totalHoursEl = document.getElementById("totalHours");
    const totalInsentifEl = document.getElementById("totalInsentif");
    if (totalHoursEl) totalHoursEl.textContent = totalHours;
    if (totalInsentifEl) totalInsentifEl.textContent = formatCurrency(totalInsentif);

    // Render components
    renderStatsBreakdown(periodLembur);
    renderCalendar(allUserLemburForCalendar); // Calendar uses ALL data, not filtered
    renderHistoryTable(periodLembur);
}

function renderPeriodSelector() {
    const selectorContainer = document.getElementById('periodSelectorContainer');
    if (!selectorContainer || allCutOff.length === 0) return;
    
    const periodsToShow = activeCutOffs.length > 0 ? activeCutOffs : allCutOff.slice(-3);
    
    if (periodsToShow.length <= 1) {
        selectorContainer.innerHTML = '';
        return;
    }
    
    const html = `
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Pilih Periode untuk Statistik & Riwayat:</label>
            <select id="periodSelector" onchange="changePeriod(this.value)" class="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                ${periodsToShow.map((period, index) => `
                    <option value="${index}" ${period === selectedCutOff ? 'selected' : ''}>
                        ${period.bulan} (${formatDate(period.tanggalMulai)} - ${formatDate(period.tanggalAkhir)})
                    </option>
                `).join('')}
            </select>
        </div>
    `;
    
    selectorContainer.innerHTML = html;
}

function changePeriod(index) {
    const periodsToShow = activeCutOffs.length > 0 ? activeCutOffs : allCutOff.slice(-3);
    selectedCutOff = periodsToShow[parseInt(index)];
    renderKaryawanDashboard();
}

function renderStatsBreakdown(lemburData) {
    const container = document.getElementById('statsBreakdown');
    if (!container) return;
    
    if (!lemburData || lemburData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <p class="font-medium text-sm sm:text-base">Belum ada data lembur</p>
            </div>
        `;
        return;
    }
    
    let hariKerja = 0;
    let hariLibur = 0;
    let totalDays = 0;
    
    const uniqueDates = new Set();
    
    lemburData.forEach(l => {
        uniqueDates.add(l.tanggal);
        if (l.jenisLembur && l.jenisLembur.toLowerCase().includes('libur')) {
            hariLibur += parseJamLembur(l.jamLembur);
        } else {
            hariKerja += parseJamLembur(l.jamLembur);
        }
    });
    
    totalDays = uniqueDates.size;
    const totalJam = hariKerja + hariLibur;
    const maxJam = Math.max(hariKerja, hariLibur, 1);
    
    const hariKerjaPercent = (hariKerja / maxJam) * 100;
    const hariLiburPercent = (hariLibur / maxJam) * 100;
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-xs sm:text-sm text-gray-600 font-medium">Total Hari Lembur</p>
                        <p class="text-2xl sm:text-3xl font-bold text-indigo-600">${totalDays}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs sm:text-sm text-gray-600 font-medium">Total Jam</p>
                        <p class="text-2xl sm:text-3xl font-bold text-purple-600">${totalJam}</p>
                    </div>
                </div>
            </div>
            
            <div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                        <span class="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        Hari Kerja
                    </span>
                    <span class="text-xs sm:text-sm font-bold text-blue-600">${hariKerja} jam</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2" style="width: ${hariKerjaPercent}%">
                        ${hariKerjaPercent > 20 ? '<span class="text-xs font-bold text-white">' + hariKerja + '</span>' : ''}
                    </div>
                </div>
            </div>
            
            <div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                        <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        Hari Libur
                    </span>
                    <span class="text-xs sm:text-sm font-bold text-red-600">${hariLibur} jam</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-red-500 to-red-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2" style="width: ${hariLiburPercent}%">
                        ${hariLiburPercent > 20 ? '<span class="text-xs font-bold text-white">' + hariLibur + '</span>' : ''}
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                    <p class="text-xl sm:text-2xl font-bold text-blue-600">${hariKerja}</p>
                    <p class="text-xs text-gray-600 font-medium mt-1">Jam Hari Kerja</p>
                </div>
                <div class="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                    <p class="text-xl sm:text-2xl font-bold text-red-600">${hariLibur}</p>
                    <p class="text-xs text-gray-600 font-medium mt-1">Jam Hari Libur</p>
                </div>
            </div>
        </div>
    `;
}

// FIXED: Calendar is now INDEPENDENT - uses all user lembur data
function renderCalendar(lemburData) {
    console.log('🎨 Rendering Calendar - Independent Mode');
    const calendarDiv = document.getElementById('calendar');
    const monthTitle = document.getElementById('calendarMonth');
    if (!calendarDiv || !monthTitle) {
        console.error('Calendar elements not found');
        return;
    }

    // Use global calendar state, not filtered by period
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    monthTitle.textContent = currentCalendarMonth.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric'
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '';

    // Header days
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    days.forEach(day => {
        html += `<div class="text-xs font-semibold text-gray-600 py-2 text-center">${day}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    // Create lembur map for this month
    const lemburMap = {};
    if (lemburData && lemburData.length > 0) {
        lemburData.forEach(l => {
            const date = new Date(l.tanggal);
            if (date.getMonth() === month && date.getFullYear() === year) {
                const day = date.getDate();
                if (!lemburMap[day]) lemburMap[day] = 0;
                lemburMap[day] += parseJamLembur(l.jamLembur);
            }
        });
    }

    // Render days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const hasLembur = lemburMap[day];
        const isToday = today.getDate() === day && 
                       today.getMonth() === month && 
                       today.getFullYear() === year;
        
        let className = 'p-2 rounded-lg text-center transition-all cursor-pointer hover:shadow-md ';
        if (isToday) {
            className += 'bg-blue-100 border-2 border-blue-400 ';
        } else if (hasLembur) {
            className += 'bg-green-100 border-2 border-green-300 ';
        } else {
            className += 'hover:bg-gray-50 ';
        }
        
        html += `
            <div class="${className}">
                <div class="text-xs sm:text-sm font-medium">${day}</div>
                ${hasLembur ? `<div class="text-xs text-green-700 font-bold mt-1">${hasLembur}j</div>` : ''}
            </div>
        `;
    }

    calendarDiv.innerHTML = html;
    console.log('✅ Calendar rendered for', monthTitle.textContent);
}

// FIXED: Calendar navigation - Always works independently
function changeMonth(delta) {
    console.log(`📅 Changing month by ${delta}`);
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + delta);
    
    // Always use all user data, never filtered
    if (currentUser && allUserLemburForCalendar) {
        renderCalendar(allUserLemburForCalendar);
    } else {
        console.error('User data not available for calendar');
    }
}

function changePage(direction) {
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = selectedCutOff ? filterLemburByPeriod(userLembur, selectedCutOff) : userLembur;
    const sortedData = [...periodLembur].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    
    if (direction === -1 && currentPage > 1) {
        currentPage--;
        renderHistoryTable(periodLembur);
    } else if (direction === 1 && currentPage < totalPages) {
        currentPage++;
        renderHistoryTable(periodLembur);
    }
}

function renderHistoryTable(lemburData) {
    const tbody = document.getElementById('historyTable');
    if (!tbody) return;
    
    if (!lemburData || lemburData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-sm sm:text-lg font-medium">Belum ada data lembur</p>
                </td>
            </tr>
        `;
        
        const paginationDiv = document.getElementById('paginationControls');
        if (paginationDiv) {
            paginationDiv.innerHTML = '';
        }
        return;
    }

    const sortedData = [...lemburData].sort((a, b) => {
        const dateA = new Date(a.tanggal);
        const dateB = new Date(b.tanggal);
        return dateB - dateA;
    });
    
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

    tbody.innerHTML = currentItems.map(l => {
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">${formatDate(l.tanggal)}</td>
                <td class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        l.jenisLembur && l.jenisLembur.toLowerCase().includes('libur') 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                    }">
                        ${l.jenisLembur || '-'}
                    </span>
                </td>
                <td class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-indigo-600">${l.jamLembur || '0 Jam'}</td>
                <td class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-green-600">${formatCurrency(insentif)}</td>
                <td class="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">${l.keterangan || '-'}</td>
            </tr>
        `;
    }).join('');

    const paginationDiv = document.getElementById('paginationControls');
    if (paginationDiv && totalPages > 1) {
        paginationDiv.innerHTML = `
            <div class="flex justify-center items-center space-x-2 mt-4">
                <button onclick="changePage(-1)" class="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base" ${currentPage === 1 ? 'disabled' : ''}>
                    &laquo; Prev
                </button>
                <span class="text-gray-700 font-medium text-sm sm:text-base">Hal ${currentPage} dari ${totalPages}</span>
                <button onclick="changePage(1)" class="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base" ${currentPage === totalPages ? 'disabled' : ''}>
                    Next &raquo;
                </button>
            </div>
        `;
    } else if (paginationDiv) {
        paginationDiv.innerHTML = '';
    }
}

// ============================================
// CHANGE PASSWORD FEATURE - FIXED
// ============================================
function showChangePasswordModal() {
    console.log('showChangePasswordModal called');
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();
    } else {
        console.error('changePasswordModal not found');
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function changePassword(event) {
    event.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Find current user in karyawan list
    const karyawan = allKaryawan.find(k => k.nik === currentUser.nik);
    
    if (!karyawan) {
        showAlert('Data karyawan tidak ditemukan!', 'error');
        return;
    }
    
    // Validate old password
    if (karyawan.password !== oldPassword) {
        showAlert('Password lama tidak sesuai!', 'error');
        return;
    }
    
    // Validate new password
    if (newPassword.length < 4) {
        showAlert('Password baru minimal 4 karakter!', 'error');
        return;
    }
    
    // Validate confirmation
    if (newPassword !== confirmPassword) {
        showAlert('Konfirmasi password tidak cocok!', 'error');
        return;
    }
    
    // Update password
    karyawan.password = newPassword;
    
    // Save to localStorage
    saveToLocalStorage('karyawan', allKaryawan);
    
    // Sync to Google Sheets
    try {
        showLoading();
        await callAppsScript('updateKaryawan', { data: allKaryawan });
        hideLoading();
        showAlert('✅ Password berhasil diubah!', 'success');
        closeChangePasswordModal();
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Password diubah di sistem, tetapi gagal sync ke Google Sheets.', 'warning');
        closeChangePasswordModal();
    }
}

// ============================================
// DOWNLOAD PDF WITH PERIOD SELECTION - FIXED
// ============================================
function showDownloadPDFModal() {
    console.log('showDownloadPDFModal called');
    const modal = document.getElementById('downloadPDFModal');
    const selector = document.getElementById('pdfPeriodSelector');
    
    if (!modal || !selector) {
        console.error('downloadPDFModal or pdfPeriodSelector not found');
        return;
    }
    
    // Populate period options
    const periods = activeCutOffs.length > 0 ? activeCutOffs : allCutOff;
    
    if (periods.length === 0) {
        showAlert('Tidak ada periode tersedia', 'warning');
        return;
    }
    
    selector.innerHTML = periods.map((period, index) => `
        <option value="${index}">
            ${period.bulan} (${formatDate(period.tanggalMulai)} - ${formatDate(period.tanggalAkhir)})
        </option>
    `).join('');
    
    // Pre-select current period
    if (selectedCutOff) {
        const selectedIndex = periods.findIndex(p => p === selectedCutOff);
        if (selectedIndex >= 0) {
            selector.value = selectedIndex;
        }
    }
    
    modal.style.display = 'flex';
}

function closeDownloadPDFModal() {
    const modal = document.getElementById('downloadPDFModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function downloadReportPDF() {
    console.log('downloadReportPDF called');
    const selector = document.getElementById('pdfPeriodSelector');
    const selectedIndex = parseInt(selector.value);
    
    const periods = activeCutOffs.length > 0 ? activeCutOffs : allCutOff;
    const selectedPeriod = periods[selectedIndex];
    
    if (!selectedPeriod) {
        showAlert('Pilih periode terlebih dahulu!', 'error');
        return;
    }
    
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, selectedPeriod);
    
    if (periodLembur.length === 0) {
        showAlert('Tidak ada data lembur untuk periode ini', 'warning');
        return;
    }
    
    // Calculate totals
    let totalJam = 0;
    let totalInsentif = 0;
    
    periodLembur.forEach(l => {
        totalJam += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
    });
    
    // Generate PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN LEMBUR KARYAWAN', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${selectedPeriod.bulan}`, 105, 28, { align: 'center' });
    doc.text(`${formatDate(selectedPeriod.tanggalMulai)} - ${formatDate(selectedPeriod.tanggalAkhir)}`, 105, 34, { align: 'center' });
    
    // Employee Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI KARYAWAN', 20, 45);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIK: ${currentUser.nik}`, 20, 53);
    doc.text(`Nama: ${currentUser.nama}`, 20, 60);
    doc.text(`Jabatan: ${currentUser.jabatan}`, 20, 67);
    doc.text(`Level: ${currentUser.level}`, 20, 74);
    
    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN', 20, 87);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Jam Lembur: ${totalJam} jam`, 20, 95);
    doc.text(`Total Insentif: ${formatCurrency(totalInsentif)}`, 20, 102);
    doc.text(`Jumlah Hari Lembur: ${periodLembur.length} hari`, 20, 109);
    
    // Detail table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAIL LEMBUR', 20, 122);
    
    const headers = [['No', 'Tanggal', 'Jenis', 'Jam', 'Insentif']];
    const data = periodLembur.map((l, index) => [
        index + 1,
        formatDate(l.tanggal),
        l.jenisLembur,
        parseJamLembur(l.jamLembur) + ' jam',
        formatCurrency(calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level))
    ]);
    
    doc.autoTable({
        startY: 127,
        head: headers,
        body: data,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 }
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Halaman ${i} dari ${pageCount}`, 105, 290, { align: 'center' });
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 20, 290);
    }
    
    // Save
    doc.save(`Laporan_Lembur_${currentUser.nik}_${selectedPeriod.bulan.replace(/\s/g, '_')}.pdf`);
    
    closeDownloadPDFModal();
    showAlert('✅ PDF berhasil didownload!', 'success');
}

console.log('✅ app.js (FIXED with telepon column) loaded');
