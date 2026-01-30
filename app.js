// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let allKaryawan = [];
let allLembur = [];
let allCutOff = [];
let activeCutOff = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    const types = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700'
    };
    
    alert.className = `${types[type]} border-l-4 p-4 rounded-lg mb-4`;
    alert.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <p class="font-medium">${message}</p>
        </div>
    `;
    alert.classList.remove('hidden');
    
    setTimeout(() => alert.classList.add('hidden'), 5000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function parseJamLembur(jamString) {
    // Parse "3 Jam" => 3
    const match = jamString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// ============================================
// GOOGLE SHEETS API FUNCTIONS
// ============================================

async function fetchSheetData(sheetName, range = '') {
    try {
        const url = getSheetUrl(sheetName, range);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error(`Error fetching ${sheetName}:`, error);
        throw error;
    }
}

async function loadAllData() {
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
        
        // Process Karyawan data
        allKaryawan = processKaryawanData(karyawanData);
        
        // Process Lembur data
        allLembur = processLemburData(lemburData);
        
        // Process CutOff data
        allCutOff = processCutOffData(cutOffData);
        
        // Find active cut-off
        activeCutOff = allCutOff.find(c => c.status === 'Aktif');
        
        // Save to localStorage for caching
        saveToLocalStorage('karyawan', allKaryawan);
        saveToLocalStorage('lembur', allLembur);
        saveToLocalStorage('cutoff', allCutOff);
        saveToLocalStorage('lastUpdate', new Date().toISOString());
        
        hideLoading();
        return true;
    } catch (error) {
        hideLoading();
        
        // User-friendly error messages
        let userMessage = 'Gagal memuat data. ';
        
        if (error.message.includes('SPREADSHEET_ID')) {
            userMessage += 'Konfigurasi sistem belum lengkap. Hubungi administrator.';
        } else if (error.message.includes('API_KEY')) {
            userMessage += 'Konfigurasi sistem belum lengkap. Hubungi administrator.';
        } else if (error.message.includes('403')) {
            userMessage += 'Tidak memiliki akses ke data. Hubungi administrator.';
        } else if (error.message.includes('404')) {
            userMessage += 'Data tidak ditemukan. Hubungi administrator.';
        } else if (error.message.includes('Unable to parse range')) {
            userMessage += 'Format data tidak sesuai. Hubungi administrator.';
        } else {
            userMessage += 'Terjadi kesalahan. Silakan coba lagi atau hubungi administrator.';
        }
        
        showAlert(userMessage, 'error');
        
        // Log detail error to console for debugging
        console.error('=== ERROR LOADING DATA ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Stack:', error.stack);
        console.error('=========================');
        
        return false;
    }
}

function processKaryawanData(data) {
    if (data.length < 2) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => ({
        nik: row[0] || '',
        nama: row[1] || '',
        departemen: row[2] || '',
        jabatan: row[3] || '',
        password: row[4] || '123',
        level: row[5] || 'staff' // 'supervisor' atau 'staff'
    }));
}

function processLemburData(data) {
    if (data.length < 2) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => ({
        no: row[0] || '',
        tanggal: row[1] || '',
        nik: row[2] || '',
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
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => ({
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
        showAlert('NIK tidak ditemukan! Pastikan NIK Anda sudah terdaftar.', 'error');
        console.error('Login failed: NIK not found -', nik);
        return;
    }
    
    if (user.password !== password) {
        hideLoading();
        showAlert('Password salah! Silakan coba lagi.', 'error');
        console.error('Login failed: Wrong password for NIK -', nik);
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
    const isHariLibur = jenisLembur.toLowerCase().includes('libur');
    const isSupervisor = level === 'supervisor';
    
    if (isHariLibur) {
        // Hari Libur - sama untuk semua level
        if (jam >= 10) return 120000;
        if (jam >= 5) return 100000;
        if (jam >= 1) return 50000;
        return 0;
    } else {
        // Hari Kerja
        if (isSupervisor) {
            // Supervisor: 2 jam = 30.000, +1 jam = +15.000
            if (jam < 2) return 0;
            return 30000 + ((jam - 2) * 15000);
        } else {
            // Staff: 2 jam = 40.000, +1 jam = +20.000
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
    if (!checkAuth()) return;
    
    // Load cached data first
    const cachedKaryawan = getFromLocalStorage('karyawan');
    const cachedLembur = getFromLocalStorage('lembur');
    const cachedCutOff = getFromLocalStorage('cutoff');
    
    if (cachedKaryawan && cachedLembur && cachedCutOff) {
        allKaryawan = cachedKaryawan;
        allLembur = cachedLembur;
        allCutOff = cachedCutOff;
        activeCutOff = allCutOff.find(c => c.status === 'Aktif');
    }
    
    // Refresh data in background
    loadAllData().then(() => {
        renderKaryawanDashboard();
    });
    
    // Render with cached data
    renderKaryawanDashboard();
    
    // Setup event listeners
    setupKaryawanEventListeners();
}

function renderKaryawanDashboard() {
    // Display user info
    document.getElementById('userName').textContent = currentUser.nama;
    document.getElementById('userNIK').textContent = `NIK: ${currentUser.nik}`;
    
    // Display active period
    if (activeCutOff) {
        const periodText = `${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`;
        document.getElementById('activePeriod').textContent = periodText;
    } else {
        document.getElementById('activePeriod').textContent = 'Tidak ada periode aktif';
        document.getElementById('activePeriod').classList.add('text-red-600');
    }
    
    // Filter lembur for current user and period
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, activeCutOff);
    
    // Calculate totals
    let totalHours = 0;
    let totalInsentif = 0;
    
    periodLembur.forEach(l => {
        const jam = parseJamLembur(l.jamLembur);
        totalHours += jam;
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
    });
    
    // Display stats
    document.getElementById('totalHours').textContent = totalHours;
    document.getElementById('totalInsentif').textContent = formatCurrency(totalInsentif);
    
    // Render chart
    renderOvertimeChart(periodLembur);
    
    // Render calendar
    renderCalendar(periodLembur);
    
    // Render history table
    renderHistoryTable(periodLembur);
}

function renderOvertimeChart(lemburData) {
    const ctx = document.getElementById('overtimeChart');
    if (!ctx) return;
    
    // Group by week
    const weekData = {};
    lemburData.forEach(l => {
        const date = new Date(l.tanggal);
        const weekNum = getWeekNumber(date);
        const weekKey = `Minggu ${weekNum}`;
        
        if (!weekData[weekKey]) {
            weekData[weekKey] = 0;
        }
        weekData[weekKey] += parseJamLembur(l.jamLembur);
    });
    
    // Destroy existing chart if exists
    if (window.overtimeChart) {
        window.overtimeChart.destroy();
    }
    
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
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5
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
    
    // Get first day and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create calendar HTML
    let html = '';
    
    // Day headers
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    days.forEach(day => {
        html += `<div class="text-xs font-semibold text-gray-600 py-2">${day}</div>`;
    });
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }
    
    // Create lembur map
    const lemburMap = {};
    lemburData.forEach(l => {
        const date = new Date(l.tanggal);
        if (date.getMonth() === month && date.getFullYear() === year) {
            const day = date.getDate();
            if (!lemburMap[day]) {
                lemburMap[day] = 0;
            }
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
        } else {
            className += 'hover:bg-gray-100 ';
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

function renderHistoryTable(lemburData) {
    const tbody = document.getElementById('historyTable');
    if (!tbody) return;
    
    // Check if no data
    if (!lemburData || lemburData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="text-lg font-medium">Belum ada data lembur</p>
                        <p class="text-sm text-gray-400 mt-1">Data lembur Anda akan muncul di sini setelah ada input lembur</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date descending
    const sortedData = [...lemburData].sort((a, b) => 
        new Date(b.tanggal) - new Date(a.tanggal)
    );
    
    tbody.innerHTML = sortedData.map(l => {
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
}

function setupKaryawanEventListeners() {
    // Change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                showAlert('Password tidak cocok!', 'error');
                return;
            }
            
            if (newPassword.length < 3) {
                showAlert('Password minimal 3 karakter!', 'error');
                return;
            }
            
            // Update password in localStorage
            const updatedKaryawan = allKaryawan.map(k => {
                if (k.nik === currentUser.nik) {
                    return { ...k, password: newPassword };
                }
                return k;
            });
            
            allKaryawan = updatedKaryawan;
            saveToLocalStorage('karyawan', allKaryawan);
            
            showAlert('Password berhasil diubah! Silakan catat password baru Anda. PENTING: Perubahan password hanya tersimpan di browser ini. Untuk perubahan permanen, hubungi admin untuk update di Google Sheets.', 'warning');
            
            // Clear form
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        });
    }
}

function downloadReport() {
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, activeCutOff);
    
    let totalHours = 0;
    let totalInsentif = 0;
    
    let csv = 'Tanggal,Jenis Lembur,Jam,Insentif,Keterangan\n';
    
    periodLembur.forEach(l => {
        const jam = parseJamLembur(l.jamLembur);
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
        totalHours += jam;
        totalInsentif += insentif;
        
        csv += `${l.tanggal},${l.jenisLembur},${jam},${insentif},${l.keterangan}\n`;
    });
    
    csv += `\nTotal,,,${totalHours},${totalInsentif}`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_${currentUser.nik}_${activeCutOff?.bulan || 'All'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ============================================
// ADMIN DASHBOARD
// ============================================

async function initAdminDashboard() {
    if (!checkAuth() || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    // Load cached data first
    const cachedKaryawan = getFromLocalStorage('karyawan');
    const cachedLembur = getFromLocalStorage('lembur');
    const cachedCutOff = getFromLocalStorage('cutoff');
    
    if (cachedKaryawan && cachedLembur && cachedCutOff) {
        allKaryawan = cachedKaryawan;
        allLembur = cachedLembur;
        allCutOff = cachedCutOff;
        activeCutOff = allCutOff.find(c => c.status === 'Aktif');
    }
    
    // Refresh data in background
    loadAllData().then(() => {
        renderAdminDashboard();
    });
    
    // Render with cached data
    renderAdminDashboard();
    
    // Setup event listeners
    setupAdminEventListeners();
}

function renderAdminDashboard() {
    renderOverviewTab();
    renderKaryawanTab();
    renderLemburTab();
    renderCutOffTab();
}

function renderOverviewTab() {
    // Calculate stats
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
    document.getElementById('totalKaryawan').textContent = allKaryawan.length;
    document.getElementById('totalRecords').textContent = periodLembur.length;
    document.getElementById('totalJam').textContent = totalJam;
    document.getElementById('totalInsentifAdmin').textContent = formatCurrency(totalInsentif);
    
    // Display active period
    const periodElement = document.getElementById('activePeriodAdmin');
    if (activeCutOff) {
        const periodText = `${activeCutOff.bulan}: ${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`;
        periodElement.textContent = periodText;
        periodElement.classList.remove('text-red-600');
        periodElement.classList.add('text-indigo-600');
    } else {
        periodElement.textContent = 'Tidak ada periode aktif. Silakan set periode aktif di sheet CutOff.';
        periodElement.classList.remove('text-indigo-600');
        periodElement.classList.add('text-red-600');
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
    
    // Check if no data
    if (!periodLembur || periodLembur.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-3 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="text-lg font-medium">Belum ada data lembur</p>
                        <p class="text-sm text-gray-400 mt-1">Data lembur untuk periode ini belum tersedia</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('recordCount').textContent = '0';
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
    
    document.getElementById('recordCount').textContent = periodLembur.length;
}

function renderCutOffTab() {
    const tbody = document.getElementById('cutoffTable');
    if (!tbody) return;
    
    tbody.innerHTML = allCutOff.map(c => `
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
        </tr>
    `).join('');
}

function setupAdminEventListeners() {
    // Search karyawan
    const searchKaryawan = document.getElementById('searchKaryawan');
    if (searchKaryawan) {
        searchKaryawan.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filteredKaryawan = allKaryawan.filter(k => 
                k.nik.toLowerCase().includes(query) || 
                k.nama.toLowerCase().includes(query)
            );
            
            const tbody = document.getElementById('karyawanTable');
            tbody.innerHTML = filteredKaryawan.map(k => `
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
        });
    }
    
    // Search and filter lembur
    const searchLembur = document.getElementById('searchLembur');
    const filterDate = document.getElementById('filterDate');
    
    function filterLemburData() {
        let filtered = filterLemburByPeriod(allLembur, activeCutOff);
        
        const searchQuery = searchLembur?.value.toLowerCase() || '';
        if (searchQuery) {
            filtered = filtered.filter(l => 
                l.nik.toLowerCase().includes(searchQuery) || 
                l.nama.toLowerCase().includes(searchQuery)
            );
        }
        
        const dateFilter = filterDate?.value || '';
        if (dateFilter) {
            filtered = filtered.filter(l => l.tanggal === dateFilter);
        }
        
        const tbody = document.getElementById('lemburTable');
        tbody.innerHTML = filtered.map((l, index) => {
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
        
        document.getElementById('recordCount').textContent = filtered.length;
    }
    
    if (searchLembur) {
        searchLembur.addEventListener('input', filterLemburData);
    }
    
    if (filterDate) {
        filterDate.addEventListener('change', filterLemburData);
    }
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600');
        btn.classList.add('text-gray-500');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Add active class to selected button
    event.target.classList.add('border-indigo-600', 'text-indigo-600');
    event.target.classList.remove('text-gray-500');
}

function viewKaryawanDetail(nik) {
    const karyawan = allKaryawan.find(k => k.nik === nik);
    const lemburData = allLembur.filter(l => l.nik === nik);
    const periodLembur = filterLemburByPeriod(lemburData, activeCutOff);
    
    let totalJam = 0;
    let totalInsentif = 0;
    
    periodLembur.forEach(l => {
        totalJam += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
    });
    
    const message = `
        <div class="text-left">
            <h3 class="font-bold text-lg mb-2">${karyawan.nama}</h3>
            <p><strong>NIK:</strong> ${karyawan.nik}</p>
            <p><strong>Jabatan:</strong> ${karyawan.jabatan}</p>
            <p><strong>Level:</strong> ${karyawan.level}</p>
            <hr class="my-3">
            <p><strong>Total Jam (Periode Aktif):</strong> ${totalJam} jam</p>
            <p><strong>Total Insentif:</strong> ${formatCurrency(totalInsentif)}</p>
            <p><strong>Total Records:</strong> ${periodLembur.length}</p>
        </div>
    `;
    
    alert(message);
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
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_All_${activeCutOff?.bulan || 'All'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}
