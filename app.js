// ============================================
// GLOBAL STATE
// ============================================
let currentUser = null;
let allKaryawan = [];
let allLembur = [];
let allCutOff = [];
let activeCutOffs = []; // CHANGED: Now supports multiple active periods
let selectedCutOff = null; // For user selection
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
        
        // Find all active cut-offs (CHANGED: multiple active periods)
        activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
        
        // Set default selected period (latest active or latest overall)
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
        
        // Save to localStorage for cache
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

    // Load from cache first
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

    // Refresh from Google Sheets
    loadAllData().then((success) => {
        if (success) {
            renderKaryawanDashboard();
        }
    });
}

function renderKaryawanDashboard() {
    console.log("🎨 Rendering Karyawan Dashboard");
    console.log("Current user:", currentUser);
    console.log("All lembur data:", allLembur.length);
    console.log("All cutoff:", allCutOff.length);
    console.log("Active cutoffs:", activeCutOffs);
    console.log("Selected cutoff:", selectedCutOff);
    
    // User info - IMPROVED: Make name more prominent
    const userNameEl = document.getElementById("userName");
    const userNIKEl = document.getElementById("userNIK");
    if (userNameEl) userNameEl.textContent = currentUser.nama;
    if (userNIKEl) userNIKEl.textContent = `NIK: ${currentUser.nik}`;

    // Period selector - NEW: Show all active periods
    renderPeriodSelector();
    
    // Active period display
    const activePeriodEl = document.getElementById("activePeriod");
    if (activePeriodEl && selectedCutOff) {
        activePeriodEl.textContent = `${selectedCutOff.bulan}: ${formatDate(selectedCutOff.tanggalMulai)} - ${formatDate(selectedCutOff.tanggalAkhir)}`;
    } else if (activePeriodEl) {
        activePeriodEl.textContent = "Tidak ada periode aktif";
    }

    // Filter lembur - ALWAYS show all data if no period selected
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    console.log("User lembur records:", userLembur.length);
    
    const periodLembur = selectedCutOff ? filterLemburByPeriod(userLembur, selectedCutOff) : userLembur;
    console.log("Period lembur records (after filter):", periodLembur.length);

    // Calculate totals
    let totalHours = 0;
    let totalInsentif = 0;

    periodLembur.forEach(l => {
        totalHours += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
    });

    console.log("Total hours:", totalHours);
    console.log("Total insentif:", totalInsentif);

    // Display stats
    const totalHoursEl = document.getElementById("totalHours");
    const totalInsentifEl = document.getElementById("totalInsentif");
    if (totalHoursEl) totalHoursEl.textContent = totalHours;
    if (totalInsentifEl) totalInsentifEl.textContent = formatCurrency(totalInsentif);

    // Render components IMMEDIATELY (no setTimeout)
    console.log("Rendering chart with", periodLembur.length, "records...");
    renderOvertimeChart(periodLembur);
    
    console.log("Rendering calendar...");
    renderCalendar(periodLembur);
    
    console.log("Rendering history table...");
    renderHistoryTable(periodLembur);
    
    // NEW: Render comparison if there are multiple active periods
    if (activeCutOffs.length > 1) {
        console.log("Rendering comparison...");
        renderPeriodComparison();
    }
    
    console.log("✅ Dashboard render complete!");
}

// NEW: Period selector for karyawan
function renderPeriodSelector() {
    const selectorContainer = document.getElementById('periodSelectorContainer');
    if (!selectorContainer || allCutOff.length === 0) return;
    
    // Only show active periods
    const periodsToShow = activeCutOffs.length > 0 ? activeCutOffs : allCutOff.slice(-3);
    
    if (periodsToShow.length <= 1) {
        selectorContainer.innerHTML = '';
        return;
    }
    
    const html = `
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Pilih Periode:</label>
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

// NEW: Period comparison
function renderPeriodComparison() {
    const comparisonContainer = document.getElementById('periodComparison');
    if (!comparisonContainer || activeCutOffs.length < 2) return;
    
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    
    // Calculate for each active period
    const periodStats = activeCutOffs.map(period => {
        const periodData = filterLemburByPeriod(userLembur, period);
        let totalJam = 0;
        let totalInsentif = 0;
        
        periodData.forEach(l => {
            totalJam += parseJamLembur(l.jamLembur);
            totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
        });
        
        return {
            bulan: period.bulan,
            totalJam,
            totalInsentif
        };
    });
    
    // Find current and previous
    const currentIndex = activeCutOffs.findIndex(p => p === selectedCutOff);
    if (currentIndex <= 0) return; // No previous period
    
    const current = periodStats[currentIndex];
    const previous = periodStats[currentIndex - 1];
    
    const jamDiff = current.totalJam - previous.totalJam;
    const insentifDiff = current.totalInsentif - previous.totalInsentif;
    const jamPercent = previous.totalJam > 0 ? ((jamDiff / previous.totalJam) * 100).toFixed(1) : 0;
    const insentifPercent = previous.totalInsentif > 0 ? ((insentifDiff / previous.totalInsentif) * 100).toFixed(1) : 0;
    
    const html = `
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Perbandingan dengan Periode Sebelumnya
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white rounded-lg p-4 shadow">
                    <p class="text-sm text-gray-600 mb-1">Total Jam Lembur</p>
                    <div class="flex items-baseline space-x-2">
                        <p class="text-2xl font-bold text-gray-800">${current.totalJam}</p>
                        <span class="text-sm ${jamDiff > 0 ? 'text-green-600' : jamDiff < 0 ? 'text-red-600' : 'text-gray-600'}">
                            ${jamDiff > 0 ? '↑' : jamDiff < 0 ? '↓' : '='} ${Math.abs(jamDiff)} jam (${jamPercent}%)
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Periode sebelumnya: ${previous.totalJam} jam</p>
                </div>
                <div class="bg-white rounded-lg p-4 shadow">
                    <p class="text-sm text-gray-600 mb-1">Total Insentif</p>
                    <div class="flex items-baseline space-x-2">
                        <p class="text-2xl font-bold text-gray-800">${formatCurrency(current.totalInsentif)}</p>
                        <span class="text-sm ${insentifDiff > 0 ? 'text-green-600' : insentifDiff < 0 ? 'text-red-600' : 'text-gray-600'}">
                            ${insentifDiff > 0 ? '↑' : insentifDiff < 0 ? '↓' : '='} ${insentifPercent}%
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Periode sebelumnya: ${formatCurrency(previous.totalInsentif)}</p>
                </div>
            </div>
        </div>
    `;
    
    comparisonContainer.innerHTML = html;
}

function renderOvertimeChart(lemburData) {
    const ctx = document.getElementById('overtimeChart');
    if (!ctx) {
        console.warn('❌ overtimeChart element not found');
        return;
    }
    
    console.log('📊 Rendering overtime chart with', lemburData ? lemburData.length : 0, 'records');
    
    // Wait for Chart.js
    if (typeof Chart === 'undefined') {
        console.warn('⏳ Chart.js not loaded yet, retrying...');
        setTimeout(() => renderOvertimeChart(lemburData), 1000);
        return;
    }

    // Destroy existing chart
    if (window.overtimeChart) {
        window.overtimeChart.destroy();
        window.overtimeChart = null;
    }

    // Handle empty data
    if (!lemburData || lemburData.length === 0) {
        console.log('📊 No data for chart, showing empty message');
        // Create empty chart with message
        window.overtimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Jam Lembur',
                    data: [],
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Belum ada data lembur untuk periode ini',
                        color: '#9ca3af',
                        font: {
                            size: 14
                        }
                    }
                },
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
                }
            }
        });
        return;
    }

    // Group by week
    const weekData = {};
    lemburData.forEach(l => {
        try {
            const date = new Date(l.tanggal);
            const weekNum = getWeekNumber(date);
            const weekKey = `Minggu ${weekNum}`;
            
            if (!weekData[weekKey]) weekData[weekKey] = 0;
            weekData[weekKey] += parseJamLembur(l.jamLembur);
        } catch (error) {
            console.error('Error processing lembur record:', l, error);
        }
    });

    console.log('📊 Week data:', weekData);

    // Create chart
    try {
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
                        },
                        ticks: {
                            stepSize: 5
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' jam';
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Chart rendered successfully');
    } catch (error) {
        console.error('❌ Error creating chart:', error);
    }
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
    if (!calendarDiv || !monthTitle) {
        console.warn('Calendar elements not found');
        return;
    }

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
        html += `<div class="text-xs font-semibold text-gray-600 py-2 text-center">${day}</div>`;
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
                <div class="text-sm font-medium">${day}</div>
                ${hasLembur ? `<div class="text-xs text-green-700 font-bold mt-1">${hasLembur}j</div>` : ''}
            </div>
        `;
    }

    calendarDiv.innerHTML = html;
}

function changeMonth(delta) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + delta);
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, selectedCutOff);
    renderCalendar(periodLembur);
}

function changePage(direction) {
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, selectedCutOff);
    const sortedData = [...periodLembur].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    
    if (direction === -1 && currentPage > 1) {
        currentPage--;
        renderHistoryTable(sortedData);
    } else if (direction === 1 && currentPage < totalPages) {
        currentPage++;
        renderHistoryTable(sortedData);
    }
}

function renderHistoryTable(lemburData) {
    const tbody = document.getElementById('historyTable');
    if (!tbody) {
        console.warn('❌ historyTable element not found');
        return;
    }
    
    console.log('📋 Rendering history table with', lemburData ? lemburData.length : 0, 'records');
    console.log('📋 Current page:', currentPage);
    
    if (!lemburData || lemburData.length === 0) {
        console.log('📋 No data to display');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-medium">Belum ada data lembur untuk periode ini</p>
                    <p class="text-sm text-gray-400 mt-1">Data lembur Anda akan muncul di sini</p>
                </td>
            </tr>
        `;
        
        // Hide pagination
        const paginationDiv = document.getElementById('paginationControls');
        if (paginationDiv) {
            paginationDiv.innerHTML = '';
        }
        return;
    }

    const sortedData = [...lemburData].sort((a, b) => {
        const dateA = new Date(a.tanggal);
        const dateB = new Date(b.tanggal);
        return dateB - dateA; // Newest first
    });
    
    console.log('📋 Sorted data:', sortedData.length, 'records');
    
    // Pagination
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
    console.log('📋 Total pages:', totalPages);
    
    // Reset to page 1 if current page exceeds total pages
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
    
    console.log('📋 Showing items', indexOfFirstItem, 'to', indexOfLastItem);
    console.log('📋 Current items:', currentItems.length);

    try {
        tbody.innerHTML = currentItems.map(l => {
            const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 text-sm">${formatDate(l.tanggal)}</td>
                    <td class="px-4 py-3 text-sm">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${
                            l.jenisLembur && l.jenisLembur.toLowerCase().includes('libur') 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                        }">
                            ${l.jenisLembur || '-'}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-sm font-semibold text-indigo-600">${l.jamLembur || '0 Jam'}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-green-600">${formatCurrency(insentif)}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${l.keterangan || '-'}</td>
                </tr>
            `;
        }).join('');
        
        console.log('✅ Table HTML rendered');
    } catch (error) {
        console.error('❌ Error rendering table:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-red-500">
                    <p class="text-lg font-medium">Error menampilkan data</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </td>
            </tr>
        `;
        return;
    }

    // Pagination controls
    const paginationDiv = document.getElementById('paginationControls');
    if (paginationDiv && totalPages > 1) {
        paginationDiv.innerHTML = `
            <div class="flex justify-center items-center space-x-2 mt-4">
                <button onclick="changePage(-1)" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? 'disabled' : ''}>
                    &laquo; Sebelumnya
                </button>
                <span class="text-gray-700 font-medium">Halaman ${currentPage} dari ${totalPages}</span>
                <button onclick="changePage(1)" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === totalPages ? 'disabled' : ''}>
                    Berikutnya &raquo;
                </button>
            </div>
        `;
    } else if (paginationDiv) {
        paginationDiv.innerHTML = '';
    }
    
    console.log('✅ History table rendered successfully');
}

function downloadReport() {
    const userLembur = allLembur.filter(l => l.nik === currentUser.nik);
    const periodLembur = filterLemburByPeriod(userLembur, selectedCutOff);
    
    if (periodLembur.length === 0) {
        showAlert('Tidak ada data untuk didownload', 'warning');
        return;
    }
    
    let csv = 'Tanggal,Jenis Lembur,Jam,Insentif,Keterangan\n';

    periodLembur.forEach(l => {
        const jam = parseJamLembur(l.jamLembur);
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, currentUser.level);
        csv += `${l.tanggal},"${l.jenisLembur}",${jam},${insentif},"${l.keterangan}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_${currentUser.nik}_${selectedCutOff ? selectedCutOff.bulan.replace(/\s/g, '_') : 'All'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('✅ Laporan berhasil didownload!', 'success');
}

console.log('✅ app.js loaded');
