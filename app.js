// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let allKaryawan = [];
let allLembur = [];
let allCutOff = [];
let activeCutOff = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

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
    }[type]} p-4 rounded shadow-lg z-50`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
        // Validate configuration
        const configCheck = validateConfig();
        if (!configCheck.valid) {
            throw new Error(configCheck.message);
        }
        
        // Load all data from sheets
        const [karyawanData, lemburData, cutOffData] = await Promise.all([
            fetchSheetData(SHEET_CONFIG.KARYAWAN),
            fetchSheetData(SHEET_CONFIG.LEMBUR),
            fetchSheetData(SHEET_CONFIG.CUTOFF)
        ]);
        
        // Process data
        allKaryawan = processKaryawanData(karyawanData);
        allLembur = processLemburData(lemburData);
        allCutOff = processCutOffData(cutOffData);
        
        // Find active cut-off
        activeCutOff = allCutOff.find(c => c.status === 'Aktif');
        
        console.log('✅ Data loaded:', {
            karyawan: allKaryawan.length,
            lembur: allLembur.length,
            cutoff: allCutOff.length,
            activeCutOff: activeCutOff ? activeCutOff.bulan : 'None'
        });
        
        // Save to localStorage
        saveToLocalStorage('karyawan', allKaryawan);
        saveToLocalStorage('lembur', allLembur);
        saveToLocalStorage('cutoff', allCutOff);
        saveToLocalStorage('lastUpdate', new Date().toISOString());
        
        hideLoading();
        return true;
    } catch (error) {
        console.error('❌ Error loading data:', error);
        hideLoading();
        
        // Try to load from localStorage as fallback
        const cachedKaryawan = getFromLocalStorage('karyawan');
        const cachedLembur = getFromLocalStorage('lembur');
        const cachedCutOff = getFromLocalStorage('cutoff');
        
        if (cachedKaryawan && cachedLembur && cachedCutOff) {
            allKaryawan = cachedKaryawan;
            allLembur = cachedLembur;
            allCutOff = cachedCutOff;
            activeCutOff = allCutOff.find(c => c.status === 'Aktif');
            
            console.log('✅ Loaded from cache');
            showAlert('Data dimuat dari cache. Pastikan koneksi internet untuk data terbaru.', 'warning');
            return true;
        }
        
        showAlert('Gagal memuat data. Periksa koneksi internet dan konfigurasi.', 'error');
        return false;
    }
}

function processKaryawanData(data) {
    if (data.length < 2) return [];
    const rows = data.slice(1); // Skip header

    return rows.filter(row => row[0]).map(row => ({
        nik: String(row[0] || '').trim(),
        nama: row[1] || '',
        departemen: row[2] || '',
        jabatan: row[3] || '',
        password: row[4] || '123',
        level: row[5] || 'staff'
    }));
}

function processLemburData(data) {
    if (data.length < 2) return [];
    const rows = data.slice(1); // Skip header

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
    const rows = data.slice(1); // Skip header

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
    // Check if admin
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

    // Load data if not cached
    if (allKaryawan.length === 0) {
        const success = await loadAllData();
        if (!success) {
            hideLoading();
            return;
        }
    }

    // Find user
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

    // Login success
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
    localStorage.clear();
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

    // Load from cache first
    const cachedKaryawan = getFromLocalStorage('karyawan');
    const cachedLembur = getFromLocalStorage('lembur');
    const cachedCutOff = getFromLocalStorage('cutoff');

    if (cachedKaryawan && cachedLembur && cachedCutOff) {
        allKaryawan = cachedKaryawan;
        allLembur = cachedLembur;
        allCutOff = cachedCutOff;
        activeCutOff = allCutOff.find(c => c.status === 'Aktif');
        renderKaryawanDashboard();
    }

    // Refresh from Google Sheets
    loadAllData().then((success) => {
        if (success) {
            renderKaryawanDashboard();
        }
    });
}

function renderKaryawanDashboard() {
    console.log('🎨 Rendering Karyawan Dashboard');
    // User info
    const userNameEl = document.getElementById('userName');
    const userNIKEl = document.getElementById('userNIK');
    if (userNameEl) userNameEl.textContent = currentUser.nama;
    if (userNIKEl) userNIKEl.textContent = `NIK: ${currentUser.nik}`;

    // Active period
    const activePeriodEl = document.getElementById('activePeriod');
    if (activePeriodEl) {
        if (activeCutOff) {
            activePeriodEl.textContent = `${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`;
        } else {
            activePeriodEl.textContent = 'Tidak ada periode aktif';
        }
    }

    // Filter lembur
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, activeCutOff);

    // Calculate totals
    let totalHours = 0;
    let totalInsentif = 0;

    periodLembur.forEach(l => {
        totalHours += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
    });

    // Display stats
    const totalHoursEl = document.getElementById('totalHours');
    const totalInsentifEl = document.getElementById('totalInsentif');
    if (totalHoursEl) totalHoursEl.textContent = totalHours;
    if (totalInsentifEl) totalInsentifEl.textContent = formatCurrency(totalInsentif);

    // Render components
    renderOvertimeChart(periodLembur);
    renderCalendar(periodLembur);
    renderHistoryTable(periodLembur);
}

function renderOvertimeChart(lemburData) {
    const ctx = document.getElementById('overtimeChart');
    if (!ctx) return;
    
    // Wait for Chart.js
    if (typeof Chart === 'undefined') {
        setTimeout(() => renderOvertimeChart(lemburData), 1000);
        return;
    }

    // Group by week
    const weekData = {};
    lemburData.forEach(l => {
        const date = new Date(l.tanggal);
        const weekNum = getWeekNumber(date);
        const weekKey = `Minggu ${weekNum}`;
        
        if (!weekData[weekKey]) weekData[weekKey] = 0;
        weekData[weekKey] += parseJamLembur(l.jamLembur);
    });

    // Destroy existing
    if (window.overtimeChart) {
        window.overtimeChart.destroy();
    }

    // Create chart
    window.overtimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(weekData),
            datasets: [{
                label: 'Jam Lembur',
                data: Object.values(weekData),
                backgroundColor: 'rgba(79, 70, 229, 0.8)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Jam Lembur'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Minggu'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

let currentCalendarMonth = new Date();

function renderCalendar(lemburData) {
    const calendarDiv = document.getElementById('calendar');
    const monthTitle = document.getElementById('calendarMonth');
    if (!calendarDiv || !monthTitle) return;

    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    monthTitle.textContent = currentCalendarMonth.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric'
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '';

    // Headers
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    days.forEach(day => {
        html += `<div class="text-xs font-semibold text-gray-600 py-2">${day}</div>`;
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    // Create lembur map
    const lemburMap = {};
    lemburData.forEach(l => {
        const date = new Date(l.tanggal);
        if (date.getMonth() === month && date.getFullYear() === year) {
            const day = date.getDate();
            if (!lemburMap[day]) lemburMap[day] = 0;
            lemburMap[day] += parseJamLembur(l.jamLembur);
        }
    });

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const hasLembur = lemburMap[day];
        const isToday = new Date().getDate() === day && 
                       new Date().getMonth() === month && 
                       new Date().getFullYear() === year;
        
        let className = 'p-2 rounded-lg text-center ';
        if (isToday) {
            className += 'bg-blue-100 border border-blue-300 ';
        } else if (hasLembur) {
            className += 'bg-green-100 border border-green-300 ';
        }
        
        html += `
            <div class="${className}">
                <div class="text-sm font-medium">${day}</div>
                ${hasLembur ? `<div class="text-xs text-green-700 font-semibold">${hasLembur}j</div>` : ''}
            </div>
        `;
    }

    calendarDiv.innerHTML = html;
}

function changeMonth(delta) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + delta);
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, activeCutOff);
    renderCalendar(periodLembur);
}

function changePage(direction) {
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, activeCutOff);
    const sortedData = [...periodLembur].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (direction === -1 && currentPage > 1) {
        currentPage--;
        renderHistoryTable(sortedData);
    } else if (direction === 1 && currentPage < Math.ceil(sortedData.length / ITEMS_PER_PAGE)) {
        currentPage++;
        renderHistoryTable(sortedData);
    }
}

function renderHistoryTable(lemburData) {
    const tbody = document.getElementById('historyTable');
    if (!tbody) return;
    
    if (!lemburData || lemburData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <p class="text-lg font-medium">Belum ada data lembur</p>
                </td>
            </tr>
        `;
        return;
    }

    const sortedData = [...lemburData].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    // Pagination
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

    tbody.innerHTML = currentItems.map(l => {
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">${formatDate(l.tanggal)}</td>
                <td class="px-4 py-3 text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        l.jenisLembur.toLowerCase().includes('libur') 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                    }">
                        ${l.jenisLembur}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm font-semibold">${l.jamLembur}</td>
                <td class="px-4 py-3 text-sm font-semibold text-green-600">${formatCurrency(insentif)}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${l.keterangan}</td>
            </tr>
        `;
    }).join('');

    // Pagination controls
    const paginationDiv = document.getElementById('paginationControls');
    if (paginationDiv) {
        const totalPages = Math.ceil(lemburData.length / ITEMS_PER_PAGE);
        paginationDiv.innerHTML = `
            <div class="flex justify-center items-center space-x-2">
                <button onclick="changePage(-1)" class="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}>
                    &laquo; Sebelumnya
                </button>
                <span class="text-gray-700">Halaman ${currentPage} dari ${totalPages}</span>
                <button onclick="changePage(1)" class="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''}>
                    Berikutnya &raquo;
                </button>
            </div>
        `;
    }
}

function downloadReport() {
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, activeCutOff);
    let csv = 'Tanggal,Jenis Lembur,Jam,Insentif,Keterangan\n';

    periodLembur.forEach(l => {
        const jam = parseJamLembur(l.jamLembur);
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
        csv += `${l.tanggal},${l.jenisLembur},${jam},${insentif},${l.keterangan}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_${currentUser.nik}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ============================================
// ADMIN DASHBOARD
// ============================================
async function initAdminDashboard() {
    console.log('🚀 Init Admin Dashboard');
    if (!checkAuth() || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Load from cache first
    const cachedKaryawan = getFromLocalStorage('karyawan');
    const cachedLembur = getFromLocalStorage('lembur');
    const cachedCutOff = getFromLocalStorage('cutoff');

    if (cachedKaryawan && cachedLembur && cachedCutOff) {
        allKaryawan = cachedKaryawan;
        allLembur = cachedLembur;
        allCutOff = cachedCutOff;
        activeCutOff = allCutOff.find(c => c.status === 'Aktif');
        renderAdminDashboard();
    }

    // Refresh from Google Sheets
    loadAllData().then((success) => {
        if (success) {
            renderAdminDashboard();
        }
    });
}

function renderAdminDashboard() {
    console.log('🎨 Rendering Admin Dashboard');
    renderOverviewTab();
    renderKaryawanTab();
    renderLemburTab();
    renderCutOffTab();
}

function renderOverviewTab() {
    const periodLembur = filterLemburByPeriod(allLembur, activeCutOff);
    let totalJam = 0;
    let totalInsentif = 0;

    periodLembur.forEach(l => {
        const karyawan = allKaryawan.find(k => k.nik === l.nik);
        const level = karyawan ? karyawan.level : 'staff';
        totalJam += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, level);
    });

    // Update stats
    const el1 = document.getElementById('totalKaryawan');
    const el2 = document.getElementById('totalRecords');
    const el3 = document.getElementById('totalJam');
    const el4 = document.getElementById('totalInsentifAdmin');

    if (el1) el1.textContent = allKaryawan.length;
    if (el2) el2.textContent = periodLembur.length;
    if (el3) el3.textContent = totalJam;
    if (el4) el4.textContent = formatCurrency(totalInsentif);

    // Active period
    const periodEl = document.getElementById('activePeriodAdmin');
    if (periodEl) {
        if (activeCutOff) {
            periodEl.textContent = `${activeCutOff.bulan}: ${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`;
        } else {
            periodEl.textContent = 'Tidak ada periode aktif';
        }
    }
}

function renderKaryawanTab() {
    const tbody = document.getElementById('karyawanTable');
    if (!tbody) return;
    tbody.innerHTML = allKaryawan.map(k => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium">${k.nik}</td>
            <td class="px-4 py-3 text-sm">${k.nama}</td>
            <td class="px-4 py-3 text-sm">${k.jabatan}</td>
            <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${
                    k.level === 'supervisor' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                }">
                    ${k.level}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">
                <code class="bg-gray-100 px-2 py-1 rounded">${k.password}</code>
            </td>
            <td class="px-4 py-3 text-sm">
                <button onclick="viewKaryawanDetail('${k.nik}')" class="text-indigo-600 hover:text-indigo-800 font-medium">
                    Lihat Detail
                </button>
            </td>
        </tr>
    `).join('');
}

function renderLemburTab() {
    const tbody = document.getElementById('lemburTable');
    if (!tbody) return;
    const periodLembur = filterLemburByPeriod(allLembur, activeCutOff);

    if (periodLembur.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-3 py-8 text-center text-gray-500">
                    <p class="text-lg font-medium">Belum ada data lembur</p>
                </td>
            </tr>
        `;
        const recordCount = document.getElementById('recordCount');
        if (recordCount) recordCount.textContent = '0';
        
        // Clear recap
        const recapElement = document.getElementById('lemburRecap');
        if (recapElement) {
            recapElement.innerHTML = '';
        }
        
        return;
    }

    tbody.innerHTML = periodLembur.map((l, index) => {
        const karyawan = allKaryawan.find(k => k.nik === l.nik);
        const level = karyawan ? karyawan.level : 'staff';
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, level);
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-3 py-3 text-sm">${index + 1}</td>
                <td class="px-3 py-3 text-sm">${formatDate(l.tanggal)}</td>
                <td class="px-3 py-3 text-sm font-medium">${l.nik}</td>
                <td class="px-3 py-3 text-sm">${l.nama}</td>
                <td class="px-3 py-3 text-sm">${l.jabatan}</td>
                <td class="px-3 py-3 text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        l.jenisLembur.toLowerCase().includes('libur') 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                    }">
                        ${l.jenisLembur}
                    </span>
                </td>
                <td class="px-3 py-3 text-sm font-semibold">${l.jamLembur}</td>
                <td class="px-3 py-3 text-sm font-semibold text-green-600">${formatCurrency(insentif)}</td>
                <td class="px-3 py-3 text-sm text-gray-600">${l.keterangan}</td>
            </tr>
        `;
    }).join('');

    const recordCount = document.getElementById('recordCount');
    if (recordCount) recordCount.textContent = periodLembur.length;

    // Render recap
    renderLemburRecap(periodLembur);
}

function renderLemburRecap(periodLembur) {
    let totalHours = 0;
    let totalInsentif = 0;
    let totalRecords = 0;
    
    periodLembur.forEach(l => {
        const karyawan = allKaryawan.find(k => k.nik === l.nik);
        const level = karyawan ? karyawan.level : 'staff';
        totalHours += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, level);
    });
    
    totalRecords = periodLembur.length;
    
    const recapElement = document.getElementById('lemburRecap');
    if (recapElement) {
        recapElement.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg shadow">
                    <p class="text-2xl font-bold text-indigo-600">${totalRecords}</p>
                    <p class="text-gray-600">Total Records</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg shadow">
                    <p class="text-2xl font-bold text-indigo-600">${totalHours}</p>
                    <p class="text-gray-600">Total Jam Lembur</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg shadow">
                    <p class="text-2xl font-bold text-green-600">${formatCurrency(totalInsentif)}</p>
                    <p class="text-gray-600">Total Insentif</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg shadow">
                    <p class="text-2xl font-bold text-purple-600">${allKaryawan.length}</p>
                    <p class="text-gray-600">Total Karyawan</p>
                </div>
            </div>
        `;
    }
}

function renderCutOffTab() {
    const tbody = document.getElementById('cutoffTable');
    if (!tbody) return;
    tbody.innerHTML = allCutOff.map((c, index) => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium">${c.bulan}</td>
            <td class="px-4 py-3 text-sm">${formatDate(c.tanggalMulai)}</td>
            <td class="px-4 py-3 text-sm">${formatDate(c.tanggalAkhir)}</td>
            <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${
                    c.status === 'Aktif' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                }">
                    ${c.status || '-'}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">
                <div class="flex space-x-2">
                    ${c.status !== 'Aktif' ? `
                        <button onclick="setActiveCutOff(${index})" class="text-green-600 hover:text-green-800 font-medium text-xs px-2 py-1 rounded hover:bg-green-50">
                            Set Aktif
                        </button>
                    ` : ''}
                    <button onclick="showCutOffModal(true, allCutOff[${index}])" class="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-2 py-1 rounded hover:bg-indigo-50">
                        Edit
                    </button>
                    <button onclick="deleteCutOff(${index})" class="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded hover:bg-red-50">
                        Hapus
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setActiveCutOff(index) {
    allCutOff.forEach(c => c.status = '');
    allCutOff[index].status = 'Aktif';
    activeCutOff = allCutOff[index];
    saveToLocalStorage('cutoff', allCutOff);

    showAlert('✅ Periode aktif berhasil diubah! Note: Update juga di Google Sheets.', 'warning');
    renderAdminDashboard();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600');
        btn.classList.add('text-gray-500');
    });

    const tab = document.getElementById(`${tabName}-tab`);
    if (tab) tab.classList.remove('hidden');

    event.target.classList.add('border-indigo-600', 'text-indigo-600');
    event.target.classList.remove('text-gray-500');
}

function exportToExcel() {
    const periodLembur = filterLemburByPeriod(allLembur, activeCutOff);
    let csv = 'No,Tanggal,NIK,Nama,Jabatan,Jenis Lembur,Jam,Insentif,Keterangan\n';

    periodLembur.forEach((l, index) => {
        const karyawan = allKaryawan.find(k => k.nik === l.nik);
        const level = karyawan ? karyawan.level : 'staff';
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, level);
        
        csv += `${index + 1},${l.tanggal},${l.nik},${l.nama},${l.jabatan},${l.jenisLembur},${parseJamLembur(l.jamLembur)},${insentif},${l.keterangan}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_${activeCutOff ? activeCutOff.bulan : 'All'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

console.log('✅ app.js loaded');
