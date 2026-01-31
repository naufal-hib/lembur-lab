// ============================================
// ADMIN FEATURES - ENHANCED VERSION WITH MOBILE RESPONSIVE
// ============================================

// ============================================
// ADMIN DASHBOARD INITIALIZATION
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
        activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
        
        if (activeCutOffs.length > 0) {
            selectedCutOff = activeCutOffs[activeCutOffs.length - 1];
        } else if (allCutOff.length > 0) {
            selectedCutOff = allCutOff[allCutOff.length - 1];
        }
        
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

// ============================================
// OVERVIEW TAB WITH CALENDAR VIEW
// ============================================
function renderOverviewTab() {
    // Get selected period or latest active
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = displayPeriod ? filterLemburByPeriod(allLembur, displayPeriod) : allLembur;
    
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
        if (displayPeriod) {
            periodEl.textContent = `${displayPeriod.bulan}: ${formatDate(displayPeriod.tanggalMulai)} - ${formatDate(displayPeriod.tanggalAkhir)}`;
        } else {
            periodEl.textContent = 'Tidak ada periode aktif';
        }
    }
    
    // Render calendar view for all employees
    renderAdminCalendarView();
}

// IMPROVED: Admin Calendar View with Mobile Responsive - FIXED
// IMPROVED: Admin Calendar View with FIXED Mobile Responsive Sticky Columns
function renderAdminCalendarView() {
    const calendarContainer = document.getElementById('adminCalendarView');
    if (!calendarContainer) return;
    
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    
    if (!displayPeriod) {
        calendarContainer.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p class="text-yellow-800 font-semibold">⚠️ Tidak ada periode aktif</p>
                <p class="text-yellow-600 text-sm mt-2">Silakan aktifkan periode di tab Cut-Off Period</p>
            </div>
        `;
        return;
    }
    
    // Period selector if multiple active periods
    let periodSelectorHtml = '';
    if (activeCutOffs.length > 1) {
        periodSelectorHtml = `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Pilih Periode:</label>
                <select id="adminPeriodSelector" onchange="changeAdminPeriod(this.value)" class="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base">
                    ${activeCutOffs.map((period, index) => `
                        <option value="${index}" ${period === displayPeriod ? 'selected' : ''}>
                            ${period.bulan} (${formatDate(period.tanggalMulai)} - ${formatDate(period.tanggalAkhir)})
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }
    
    // Get date range
    const startDate = new Date(displayPeriod.tanggalMulai);
    const endDate = new Date(displayPeriod.tanggalAkhir);
    
    // Calculate days in period
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }
    
    // Group lembur by NIK and date
    const lemburByNikDate = {};
    allLembur.forEach(l => {
        const lemburDate = new Date(l.tanggal);
        if (lemburDate >= startDate && lemburDate <= endDate) {
            if (!lemburByNikDate[l.nik]) {
                lemburByNikDate[l.nik] = {};
            }
            const dateKey = l.tanggal;
            if (!lemburByNikDate[l.nik][dateKey]) {
                lemburByNikDate[l.nik][dateKey] = [];
            }
            lemburByNikDate[l.nik][dateKey].push(l);
        }
    });
    
    // Build calendar table - IMPROVED MOBILE RESPONSIVE WITH BETTER STICKY COLUMNS
    let calendarHtml = `
        <style>
            /* Sticky columns with proper z-index layering */
            .calendar-wrapper {
                position: relative;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            .calendar-table {
                border-collapse: separate;
                border-spacing: 0;
            }
            
            /* Sticky first column (NO) */
            .sticky-col-1 {
                position: sticky;
                left: 0;
                z-index: 3;
                background: white;
                box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            }
            
            .sticky-col-1.header {
                z-index: 5;
                background: #f3f4f6;
            }
            
            /* Sticky second column (NAMA) */
            .sticky-col-2 {
                position: sticky;
                left: 50px;
                z-index: 3;
                background: white;
                box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            }
            
            .sticky-col-2.header {
                z-index: 5;
                background: #f3f4f6;
            }
            
            /* Sticky third column (NIK) */
            .sticky-col-3 {
                position: sticky;
                left: 180px;
                z-index: 3;
                background: white;
                box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            }
            
            .sticky-col-3.header {
                z-index: 5;
                background: #f3f4f6;
            }
            
            /* Sticky fourth column (POSISI) */
            .sticky-col-4 {
                position: sticky;
                left: 280px;
                z-index: 3;
                background: white;
                box-shadow: 2px 0 5px rgba(0,0,0,0.05);
            }
            
            .sticky-col-4.header {
                z-index: 5;
                background: #f3f4f6;
            }
            
            /* Sticky header row */
            .calendar-table thead tr {
                position: sticky;
                top: 0;
                z-index: 4;
            }
            
            @media (max-width: 640px) {
                .sticky-col-1 { left: 0; width: 40px; min-width: 40px; }
                .sticky-col-2 { left: 40px; width: 110px; min-width: 110px; }
                .sticky-col-3 { left: 150px; width: 80px; min-width: 80px; }
                .sticky-col-4 { left: 230px; width: 90px; min-width: 90px; }
            }
        </style>
        
        <div class="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-6">
            ${periodSelectorHtml}
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <h3 class="text-lg sm:text-2xl font-bold text-gray-800 flex items-center">
                    <svg class="w-5 h-5 sm:w-7 sm:h-7 mr-2 sm:mr-3 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Kalender Lembur
                </h3>
                <button onclick="exportCalendarPDF()" class="px-3 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-md text-xs sm:text-sm flex items-center space-x-2 w-full sm:w-auto justify-center">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    <span>Export PDF</span>
                </button>
            </div>
            
            <div class="flex flex-wrap justify-center gap-3 sm:gap-8 text-xs sm:text-sm mb-4 sm:mb-6">
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 border-2 border-red-700 rounded shadow flex items-center justify-center text-white font-bold text-xs">7</div>
                    <span class="text-gray-700 font-medium">Hari Libur</span>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 border-2 border-emerald-400 rounded flex items-center justify-center text-gray-900 font-bold text-xs">3</div>
                    <span class="text-gray-700 font-medium">Hari Kerja</span>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 bg-gray-50 border border-gray-300 rounded"></div>
                    <span class="text-gray-700 font-medium">Tidak Ada Lembur</span>
                </div>
            </div>
            
            <div class="calendar-wrapper rounded-lg border border-gray-200" style="max-height: 600px; overflow-y: auto;">
                <table class="calendar-table w-full text-xs sm:text-sm">
                    <thead>
                        <tr>
                            <th class="sticky-col-1 header border border-gray-300 px-2 sm:px-3 py-2 text-left font-bold text-gray-700">NO</th>
                            <th class="sticky-col-2 header border border-gray-300 px-2 sm:px-3 py-2 text-left font-bold text-gray-700">NAMA</th>
                            <th class="sticky-col-3 header border border-gray-300 px-2 sm:px-3 py-2 text-left font-bold text-gray-700">NIK</th>
                            <th class="sticky-col-4 header border border-gray-300 px-2 sm:px-3 py-2 text-left font-bold text-gray-700">POSISI</th>
                            ${days.map(day => `
                                <th class="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 bg-gray-100" style="min-width: 45px;">
                                    ${day.getDate()}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${allKaryawan.map((karyawan, index) => {
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="sticky-col-1 border border-gray-300 px-2 sm:px-3 py-2 font-medium text-center">${index + 1}</td>
                                    <td class="sticky-col-2 border border-gray-300 px-2 sm:px-3 py-2 text-xs sm:text-sm" title="${karyawan.nama}">${karyawan.nama.length > 12 ? karyawan.nama.substring(0, 12) + '...' : karyawan.nama}</td>
                                    <td class="sticky-col-3 border border-gray-300 px-2 sm:px-3 py-2 text-xs sm:text-sm font-mono">${karyawan.nik}</td>
                                    <td class="sticky-col-4 border border-gray-300 px-2 sm:px-3 py-2 text-xs sm:text-sm" title="${karyawan.jabatan}">${karyawan.jabatan.length > 10 ? karyawan.jabatan.substring(0, 10) + '...' : karyawan.jabatan}</td>
                                    ${days.map(day => {
                                        const dateKey = day.toISOString().split('T')[0];
                                        const lemburRecords = lemburByNikDate[karyawan.nik] ? lemburByNikDate[karyawan.nik][dateKey] : null;
                                        
                                        if (lemburRecords && lemburRecords.length > 0) {
                                            const totalJam = lemburRecords.reduce((sum, l) => sum + parseJamLembur(l.jamLembur), 0);
                                            const isLibur = lemburRecords.some(l => l.jenisLembur && l.jenisLembur.toLowerCase().includes('libur'));
                                            
                                            return `
                                                <td class="border-2 px-2 py-2 sm:py-3 text-center font-extrabold text-sm sm:text-base ${
                                                    isLibur 
                                                        ? 'bg-red-500 text-white border-red-700 shadow-md' 
                                                        : 'bg-emerald-100 text-gray-900 border-emerald-400'
                                                }" 
                                                style="min-width: 45px;"
                                                title="${lemburRecords.map(l => `${l.jenisLembur}: ${l.jamLembur}`).join('\\n')}">
                                                    ${totalJam}
                                                </td>
                                            `;
                                        } else {
                                            return `<td class="border border-gray-300 px-2 py-2 bg-gray-50" style="min-width: 45px;"></td>`;
                                        }
                                    }).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div class="flex items-start">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                        <p class="text-xs sm:text-sm font-semibold text-blue-800 mb-1">💡 Cara Baca Kalender:</p>
                        <ul class="text-xs sm:text-sm text-blue-700 space-y-1">
                            <li>• <strong class="font-bold">Kotak Merah + Angka</strong> = Lembur Hari Libur</li>
                            <li>• <strong class="font-bold">Kotak Hijau + Angka</strong> = Lembur Hari Kerja</li>
                            <li>• <strong class="font-bold">Kotak Kosong</strong> = Tidak ada lembur</li>
                            <li>• <strong class="font-bold">Scroll horizontal</strong> untuk melihat semua tanggal</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    calendarContainer.innerHTML = calendarHtml;
}

function changeAdminPeriod(index) {
    selectedCutOff = activeCutOffs[parseInt(index)];
    renderAdminDashboard();
}

// ============================================
// KARYAWAN TAB - MOBILE RESPONSIVE
// ============================================
function renderKaryawanTab() {
    const tbody = document.getElementById('karyawanTable');
    if (!tbody) return;
    
    tbody.innerHTML = allKaryawan.map(k => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono font-semibold text-gray-800">${k.nik}</td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">${k.nama}</td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">${k.jabatan}</td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                <span class="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                    k.level === 'supervisor' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                }">
                    ${k.level.toUpperCase()}
                </span>
            </td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">
                <code class="bg-gray-100 px-2 sm:px-3 py-1 rounded border border-gray-300 font-mono text-xs">${k.password}</code>
            </td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                <button onclick="viewKaryawanDetail('${k.nik}')" class="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition text-xs sm:text-sm">
                    👁️ <span class="hidden sm:inline">Detail</span>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// LEMBUR TAB - MOBILE RESPONSIVE
// ============================================
function renderLemburTab() {
    const tbody = document.getElementById('lemburTable');
    if (!tbody) return;
    
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = displayPeriod ? filterLemburByPeriod(allLembur, displayPeriod) : allLembur;

    if (periodLembur.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-3 py-12 text-center text-gray-500">
                    <svg class="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-base sm:text-lg font-semibold">Belum ada data lembur</p>
                    <p class="text-xs sm:text-sm text-gray-400 mt-2">Import data Excel untuk menambahkan</p>
                </td>
            </tr>
        `;
        const recordCount = document.getElementById('recordCount');
        if (recordCount) recordCount.textContent = '0';
        
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
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700">${index + 1}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-800">${formatDate(l.tanggal)}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-mono font-semibold text-gray-800">${l.nik}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">${l.nama}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">${l.jabatan}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${
                        l.jenisLembur.toLowerCase().includes('libur') 
                            ? 'bg-red-100 text-red-800 border border-red-300' 
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }">
                        ${l.jenisLembur}
                    </span>
                </td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-bold text-indigo-600">${l.jamLembur}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-bold text-green-600">${formatCurrency(insentif)}</td>
                <td class="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">${l.keterangan || '-'}</td>
            </tr>
        `;
    }).join('');

    const recordCount = document.getElementById('recordCount');
    if (recordCount) recordCount.textContent = periodLembur.length;

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
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-5 rounded-lg shadow-md border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xl sm:text-3xl font-bold text-blue-600">${totalRecords}</p>
                            <p class="text-blue-700 font-medium text-xs sm:text-sm mt-1">Total Records</p>
                        </div>
                        <svg class="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 sm:p-5 rounded-lg shadow-md border border-indigo-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xl sm:text-3xl font-bold text-indigo-600">${totalHours}</p>
                            <p class="text-indigo-700 font-medium text-xs sm:text-sm mt-1">Total Jam</p>
                        </div>
                        <svg class="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-5 rounded-lg shadow-md border border-green-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-base sm:text-2xl font-bold text-green-600">${formatCurrency(totalInsentif)}</p>
                            <p class="text-green-700 font-medium text-xs sm:text-sm mt-1">Total Insentif</p>
                        </div>
                        <svg class="w-8 h-8 sm:w-10 sm:h-10 text-green-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-5 rounded-lg shadow-md border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xl sm:text-3xl font-bold text-purple-600">${allKaryawan.length}</p>
                            <p class="text-purple-700 font-medium text-xs sm:text-sm mt-1">Total Karyawan</p>
                        </div>
                        <svg class="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }
}

// ============================================
// CUT-OFF TAB - MOBILE RESPONSIVE
// ============================================
function renderCutOffTab() {
    const tbody = document.getElementById('cutoffTable');
    if (!tbody) return;
    
    tbody.innerHTML = allCutOff.map((c, index) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-800">${c.bulan}</td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">${formatDate(c.tanggalMulai)}</td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">${formatDate(c.tanggalAkhir)}</td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" 
                           ${c.status === 'Aktif' ? 'checked' : ''} 
                           onchange="toggleCutOffStatus(${index})"
                           class="sr-only peer">
                    <div class="relative w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span class="ms-2 sm:ms-3 text-xs sm:text-sm font-medium ${c.status === 'Aktif' ? 'text-green-700' : 'text-gray-600'}">
                        ${c.status === 'Aktif' ? '✓ Aktif' : 'Non-Aktif'}
                    </span>
                </label>
            </td>
            <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                <div class="flex flex-col sm:flex-row gap-1 sm:space-x-2">
                    <button onclick="showCutOffModal(true, ${index})" class="text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-2 sm:px-3 py-1 rounded-md hover:bg-indigo-50 transition border border-indigo-200">
                        ✏️ <span class="hidden sm:inline">Edit</span>
                    </button>
                    <button onclick="deleteCutOff(${index})" class="text-red-600 hover:text-red-800 font-semibold text-xs px-2 sm:px-3 py-1 rounded-md hover:bg-red-50 transition border border-red-200">
                        🗑️ <span class="hidden sm:inline">Hapus</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Toggle cut-off status (multi-active support)
async function toggleCutOffStatus(index) {
    const cutoff = allCutOff[index];
    const newStatus = cutoff.status === 'Aktif' ? '' : 'Aktif';
    
    cutoff.status = newStatus;
    activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
    
    // Save to localStorage
    saveToLocalStorage('cutoff', allCutOff);
    
    // Sync to Google Sheets
    try {
        showLoading();
        await callAppsScript('updateCutOff', { data: allCutOff });
        hideLoading();
        showAlert('✅ Status cut-off berhasil diubah!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Status diubah di sistem, tetapi gagal sync ke Google Sheets.', 'warning');
    }
    
    renderCutOffTab();
    renderOverviewTab();
    renderLemburTab();
}

// ============================================
// EMPLOYEE DETAIL MODAL
// ============================================
function viewKaryawanDetail(nik) {
    const karyawan = allKaryawan.find(k => k.nik === nik);
    if (!karyawan) {
        showAlert('Karyawan tidak ditemukan', 'error');
        return;
    }
    
    const lemburData = allLembur.filter(l => l.nik === nik);
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = displayPeriod ? filterLemburByPeriod(lemburData, displayPeriod) : lemburData;
    
    let totalJam = 0;
    let totalInsentif = 0;
    let totalHariKerja = 0;
    let totalHariLibur = 0;
    
    periodLembur.forEach(l => {
        const jam = parseJamLembur(l.jamLembur);
        totalJam += jam;
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
        
        if (l.jenisLembur.toLowerCase().includes('libur')) {
            totalHariLibur++;
        } else {
            totalHariKerja++;
        }
    });
    
    const modalContent = document.getElementById('employeeModalContent');
    modalContent.innerHTML = `
        <div class="space-y-4 sm:space-y-6">
            <!-- Profil Karyawan -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-5 border border-indigo-200">
                <h4 class="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Profil Karyawan
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">NIK</p>
                        <p class="font-bold text-gray-800 text-base sm:text-lg mt-1">${karyawan.nik}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Nama Lengkap</p>
                        <p class="font-bold text-gray-800 text-base sm:text-lg mt-1">${karyawan.nama}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Jabatan</p>
                        <p class="font-semibold text-gray-800 text-sm sm:text-base mt-1">${karyawan.jabatan}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Level</p>
                        <span class="inline-block px-3 py-1 mt-1 rounded-full text-xs sm:text-sm font-semibold ${
                            karyawan.level === 'supervisor' 
                                ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }">
                            ${karyawan.level.toUpperCase()}
                        </span>
                    </div>
                    <div class="md:col-span-2 bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Password</p>
                        <code class="bg-gray-100 px-3 py-1 rounded border border-gray-300 font-mono text-xs sm:text-sm inline-block mt-1">${karyawan.password}</code>
                    </div>
                </div>
            </div>

            <!-- Statistik Periode -->
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 sm:p-5 border border-purple-200">
                <h4 class="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Statistik ${displayPeriod ? displayPeriod.bulan : 'Semua'}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    <div class="text-center bg-white p-3 sm:p-4 rounded-lg shadow-md border border-indigo-100">
                        <p class="text-2xl sm:text-4xl font-bold text-indigo-600">${totalJam}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Total Jam</p>
                    </div>
                    <div class="text-center bg-white p-3 sm:p-4 rounded-lg shadow-md border border-green-100">
                        <p class="text-lg sm:text-2xl font-bold text-green-600">${formatCurrency(totalInsentif)}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Insentif</p>
                    </div>
                    <div class="text-center bg-white p-3 sm:p-4 rounded-lg shadow-md border border-blue-100">
                        <p class="text-2xl sm:text-4xl font-bold text-blue-600">${totalHariKerja}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Hari Kerja</p>
                    </div>
                    <div class="text-center bg-white p-3 sm:p-4 rounded-lg shadow-md border border-red-100">
                        <p class="text-2xl sm:text-4xl font-bold text-red-600">${totalHariLibur}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Hari Libur</p>
                    </div>
                </div>
            </div>

            <!-- Riwayat Lembur -->
            <div>
                <h4 class="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Riwayat Lembur Terbaru
                </h4>
                ${periodLembur.length > 0 ? `
                    <div class="overflow-x-auto rounded-lg border border-gray-200 shadow">
                        <table class="w-full text-xs sm:text-sm">
                            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th class="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-gray-700">Tanggal</th>
                                    <th class="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-gray-700">Jenis</th>
                                    <th class="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-gray-700">Jam</th>
                                    <th class="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-gray-700">Insentif</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${periodLembur.slice(0, 10).map(l => {
                                    const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
                                    return `
                                        <tr class="hover:bg-gray-50 transition-colors">
                                            <td class="px-3 sm:px-4 py-2 sm:py-3">${formatDate(l.tanggal)}</td>
                                            <td class="px-3 sm:px-4 py-2 sm:py-3">
                                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${
                                                    l.jenisLembur.toLowerCase().includes('libur') 
                                                        ? 'bg-red-100 text-red-800 border border-red-300' 
                                                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                                                }">
                                                    ${l.jenisLembur}
                                                </span>
                                            </td>
                                            <td class="px-3 sm:px-4 py-2 sm:py-3 font-bold text-indigo-600">${l.jamLembur}</td>
                                            <td class="px-3 sm:px-4 py-2 sm:py-3 font-bold text-green-600">${formatCurrency(insentif)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        ${periodLembur.length > 10 ? `
                            <div class="p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm bg-gray-50">
                                Menampilkan 10 dari ${periodLembur.length} records
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="text-center py-8 sm:py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <svg class="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="font-semibold text-sm sm:text-base">Belum ada data lembur</p>
                    </div>
                `}
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 border-t">
                <button onclick="exportKaryawanPDF('${nik}')" class="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition shadow-md text-sm sm:text-base flex items-center justify-center space-x-2 order-1">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    <span>Export PDF</span>
                </button>
                <button onclick="closeEmployeeModal()" class="px-4 sm:px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition shadow-md text-sm sm:text-base order-2">
                    Tutup
                </button>
            </div>
        </div>
    `;

    document.getElementById('employeeModal').style.display = 'flex';
}

function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================
// IMPORT EXCEL FEATURE (WITH AUTO-SYNC)
// ============================================
function showImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('importPreview');
    if (preview) preview.innerHTML = '';
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.disabled = true;
}

async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading();

    try {
        const data = await readExcelFile(file);
        console.log('Excel data loaded:', data.length, 'rows');
        displayImportPreview(data);
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.disabled = false;
        }
        hideLoading();
    } catch (error) {
        hideLoading();
        showAlert('Error membaca file Excel: ' + error.message, 'error');
        console.error('Excel read error:', error);
    }
}

async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    range: 3,
                    defval: ''
                });
                
                const filteredData = jsonData.filter(row => {
                    const nik = row.NIK || row.nik;
                    const tanggal = row.TANGGAL || row.Tanggal;
                    const jamLembur = row['JAM LEMBUR'] || row['JAM LEMBUR '] || row['Jam Lembur'];
                    return nik && tanggal && jamLembur;
                });
                
                console.log('Filtered data:', filteredData.length, 'rows');
                resolve(filteredData);
            } catch (error) {
                console.error('Error parsing Excel:', error);
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            reject(error);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

function displayImportPreview(data) {
    const preview = document.getElementById('importPreview');
    if (!data || data.length === 0) {
        preview.innerHTML = '<p class="text-red-600 font-semibold text-sm">❌ Tidak ada data yang ditemukan</p>';
        document.getElementById('importBtn').disabled = true;
        return;
    }

    const { duplicates, newRecords } = detectDuplicates(data);
    
    preview.innerHTML = `
        <div class="space-y-3 sm:space-y-4">
            <div class="bg-blue-50 border border-blue-300 rounded-lg p-3 sm:p-4 shadow-sm">
                <p class="text-blue-800 font-bold text-sm sm:text-base flex items-center">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    File valid
                </p>
                <div class="mt-2 space-y-1 text-xs sm:text-sm">
                    <p class="text-blue-700">📊 Total: <strong>${data.length}</strong></p>
                    <p class="text-green-700">➕ Baru: <strong>${newRecords.length}</strong></p>
                    <p class="text-yellow-700">⚠️ Duplikat: <strong>${duplicates.length}</strong></p>
                </div>
            </div>
            
            ${duplicates.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-3 sm:p-4 shadow-sm">
                    <p class="text-yellow-800 font-bold text-xs sm:text-sm mb-2">⚠️ Duplikat (5 pertama):</p>
                    <div class="max-h-32 overflow-y-auto text-xs space-y-1 bg-white rounded p-2 border border-yellow-200">
                        ${duplicates.slice(0, 5).map(d => {
                            const nik = d.NIK || d.nik;
                            const tanggal = d.TANGGAL || d.Tanggal;
                            const jam = d['JAM LEMBUR'] || d['JAM LEMBUR '] || d['Jam Lembur'];
                            return `<p class="text-yellow-700">• ${nik} - ${formatExcelDate(tanggal)} - ${jam}</p>`;
                        }).join('')}
                        ${duplicates.length > 5 ? `<p class="text-yellow-600 italic mt-1">...+${duplicates.length - 5} lagi</p>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="bg-gray-50 border border-gray-300 rounded-lg p-3 sm:p-4 shadow-sm">
                <p class="text-gray-800 font-bold text-xs sm:text-sm mb-2">👁️ Preview (3 pertama):</p>
                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="w-full text-xs bg-white">
                        <thead class="bg-gradient-to-r from-gray-100 to-gray-200">
                            <tr>
                                <th class="px-2 py-2 text-left font-bold text-gray-700">NIK</th>
                                <th class="px-2 py-2 text-left font-bold text-gray-700">Tanggal</th>
                                <th class="px-2 py-2 text-left font-bold text-gray-700">Jam</th>
                                <th class="px-2 py-2 text-left font-bold text-gray-700">Jenis</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${newRecords.slice(0, 3).map(row => {
                                const nik = row.NIK || row.nik;
                                const tanggal = row.TANGGAL || row.Tanggal;
                                const jam = row['JAM LEMBUR'] || row['JAM LEMBUR '] || row['Jam Lembur'];
                                const jenis = row['JENIS LEMBUR'] || row['Jenis Lembur'] || 'Hari Kerja';
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-2 py-2 font-mono">${nik}</td>
                                        <td class="px-2 py-2">${formatExcelDate(tanggal)}</td>
                                        <td class="px-2 py-2 font-semibold">${jam}</td>
                                        <td class="px-2 py-2">
                                            <span class="px-2 py-1 rounded-full text-xs ${jenis.toLowerCase().includes('libur') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                                                ${jenis}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    window.pendingImportData = newRecords;
}

function detectDuplicates(newData) {
    const duplicates = [];
    const newRecords = [];
    
    newData.forEach(row => {
        const nik = String(row.NIK || row.nik || '').trim();
        const tanggal = formatExcelDate(row.TANGGAL || row.Tanggal);
        const jamLembur = row['JAM LEMBUR'] || row['JAM LEMBUR '] || row['Jam Lembur'] || '0 Jam';
        
        if (!nik || !tanggal) {
            return;
        }
        
        const isDuplicate = allLembur.some(existing => {
            return existing.nik === nik && 
                   existing.tanggal === tanggal &&
                   existing.jamLembur === jamLembur;
        });
        
        if (isDuplicate) {
            duplicates.push(row);
        } else {
            newRecords.push(row);
        }
    });

    return { duplicates, newRecords };
}

function formatExcelDate(excelDate) {
    if (!excelDate) return '';
    if (excelDate instanceof Date) {
        const year = excelDate.getFullYear();
        const month = String(excelDate.getMonth() + 1).padStart(2, '0');
        const day = String(excelDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (typeof excelDate === 'string' && excelDate.includes('/')) {
        const parts = excelDate.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    }

    if (typeof excelDate === 'string' && excelDate.includes('-')) {
        return excelDate;
    }

    return String(excelDate);
}

async function importData() {
    console.log('importData() called');
    if (!window.pendingImportData || window.pendingImportData.length === 0) {
        showAlert('Tidak ada data untuk diimport', 'warning');
        return;
    }

    console.log('Processing', window.pendingImportData.length, 'records');

    showLoading();

    try {
        const processedData = window.pendingImportData.map((row, index) => {
            const nik = String(row.NIK || row.nik || '').trim();
            const tanggal = formatExcelDate(row.TANGGAL || row.Tanggal);
            const nama = row['NAMA LENGKAP'] || row['Nama Lengkap'] || row.NAMA || row.Nama || '';
            const departemen = row.DEPARTEMEN || row.Departemen || 'LABORATORIUM';
            const jabatan = row.JABATAN || row.Jabatan || '';
            const jenisLembur = row['JENIS LEMBUR'] || row['Jenis Lembur'] || 'Hari Kerja';
            const jamLembur = row['JAM LEMBUR'] || row['JAM LEMBUR '] || row['Jam Lembur'] || '0 Jam';
            const insentifKopi = row['INSENTIF KOPI'] || row['Insentif Kopi'] || 'Tidak';
            const keterangan = row.KETERANGAN || row.Keterangan || '';
            const pengecekan = row.PENGECEKAN || row.Pengecekan || 'Import';
            
            return {
                no: String(allLembur.length + index + 1),
                tanggal,
                nik,
                nama,
                departemen,
                jabatan,
                jenisLembur,
                jamLembur,
                insentifKopi,
                keterangan,
                pengecekan
            };
        });
        
        console.log('Processed data:', processedData.length, 'records');
        
        allLembur = [...allLembur, ...processedData];
        saveToLocalStorage('lembur', allLembur);
        
        try {
            await callAppsScript('importLembur', { data: processedData });
            hideLoading();
            showAlert(`✅ Berhasil mengimport ${processedData.length} data!`, 'success');
        } catch (error) {
            hideLoading();
            console.error('Error syncing to Sheets:', error);
            showAlert(`⚠️ Data tersimpan (${processedData.length} records), gagal sync ke Sheets.`, 'warning');
        }
        
        closeImportModal();
        renderAdminDashboard();
        
    } catch (error) {
        hideLoading();
        showAlert('Error saat import data: ' + error.message, 'error');
        console.error('Import error:', error);
    }
}

// ============================================
// CUT-OFF MANAGEMENT
// ============================================
function showCutOffModal(edit = false, index = null) {
    const modal = document.getElementById('cutoffModal');
    const modalTitle = document.getElementById('cutoffModalTitle');
    const form = document.getElementById('cutoffForm');
    
    if (edit && index !== null) {
        const cutoff = allCutOff[index];
        modalTitle.textContent = 'Edit Periode Cut-Off';
        document.getElementById('cutoffBulan').value = cutoff.bulan;
        document.getElementById('cutoffStart').value = cutoff.tanggalMulai;
        document.getElementById('cutoffEnd').value = cutoff.tanggalAkhir;
        document.getElementById('cutoffStatus').checked = cutoff.status === 'Aktif';
        form.dataset.editIndex = index;
    } else {
        modalTitle.textContent = 'Tambah Periode';
        form.reset();
        delete form.dataset.editIndex;
    }
    
    modal.style.display = 'flex';
}

function closeCutOffModal() {
    const modal = document.getElementById('cutoffModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('cutoffForm');
    if (form) {
        form.reset();
        delete form.dataset.editIndex;
    }
}

async function saveCutOff(event) {
    event.preventDefault();
    const form = event.target;
    const bulan = document.getElementById('cutoffBulan').value;
    const tanggalMulai = document.getElementById('cutoffStart').value;
    const tanggalAkhir = document.getElementById('cutoffEnd').value;
    const status = document.getElementById('cutoffStatus').checked ? 'Aktif' : '';

    if (!bulan || !tanggalMulai || !tanggalAkhir) {
        showAlert('Semua field harus diisi!', 'error');
        return;
    }

    if (new Date(tanggalMulai) >= new Date(tanggalAkhir)) {
        showAlert('Tanggal akhir harus lebih besar dari tanggal mulai!', 'error');
        return;
    }

    const newCutOff = {
        bulan,
        tanggalMulai,
        tanggalAkhir,
        status
    };

    if (form.dataset.editIndex !== undefined) {
        const index = parseInt(form.dataset.editIndex);
        allCutOff[index] = newCutOff;
    } else {
        allCutOff.push(newCutOff);
    }

    activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
    saveToLocalStorage('cutoff', allCutOff);

    try {
        showLoading();
        await callAppsScript('updateCutOff', { data: allCutOff });
        hideLoading();
        showAlert('✅ Periode berhasil disimpan!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Data tersimpan, gagal sync ke Sheets.', 'warning');
    }

    closeCutOffModal();
    renderCutOffTab();
    renderOverviewTab();
}

async function deleteCutOff(index) {
    if (!confirm('Hapus periode cut-off ini?')) return;
    
    allCutOff.splice(index, 1);
    activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
    saveToLocalStorage('cutoff', allCutOff);

    try {
        showLoading();
        await callAppsScript('updateCutOff', { data: allCutOff });
        hideLoading();
        showAlert('✅ Periode berhasil dihapus!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Data dihapus, gagal sync ke Sheets.', 'warning');
    }

    renderCutOffTab();
    renderOverviewTab();
}

// ============================================
// EXPORT FEATURES
// ============================================
function exportLemburToCSV() {
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = displayPeriod ? filterLemburByPeriod(allLembur, displayPeriod) : allLembur;
    
    if (periodLembur.length === 0) {
        showAlert('Tidak ada data untuk diexport', 'warning');
        return;
    }

    const csvData = periodLembur.map((l, index) => {
        const karyawan = allKaryawan.find(k => k.nik === l.nik);
        const level = karyawan ? karyawan.level : 'staff';
        const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, level);
        
        return {
            'No': index + 1,
            'Tanggal': formatDate(l.tanggal),
            'NIK': l.nik,
            'Nama': l.nama,
            'Departemen': l.departemen,
            'Jabatan': l.jabatan,
            'Jenis Lembur': l.jenisLembur,
            'Jam Lembur': l.jamLembur,
            'Insentif': insentif,
            'Keterangan': l.keterangan
        };
    });

    const headers = Object.keys(csvData[0]);
    let csv = '\uFEFF' + headers.join(',') + '\n';

    csvData.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        });
        csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_${displayPeriod ? displayPeriod.bulan.replace(/\s/g, '_') : 'All'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showAlert('✅ CSV berhasil diexport!', 'success');
}

async function exportKaryawanPDF(nik) {
    const karyawan = allKaryawan.find(k => k.nik === nik);
    if (!karyawan) {
        showAlert('Data karyawan tidak ditemukan', 'error');
        return;
    }
    
    const lemburData = allLembur.filter(l => l.nik === nik);
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = displayPeriod ? filterLemburByPeriod(lemburData, displayPeriod) : lemburData;

    let totalJam = 0;
    let totalInsentif = 0;

    periodLembur.forEach(l => {
        totalJam += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN LEMBUR KARYAWAN', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (displayPeriod) {
        doc.text(`Periode: ${formatDate(displayPeriod.tanggalMulai)} - ${formatDate(displayPeriod.tanggalAkhir)}`, 105, 28, { align: 'center' });
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI KARYAWAN', 20, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIK: ${karyawan.nik}`, 20, 48);
    doc.text(`Nama: ${karyawan.nama}`, 20, 55);
    doc.text(`Jabatan: ${karyawan.jabatan}`, 20, 62);
    doc.text(`Level: ${karyawan.level}`, 20, 69);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN', 20, 82);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Jam Lembur: ${totalJam} jam`, 20, 90);
    doc.text(`Total Insentif: ${formatCurrency(totalInsentif)}`, 20, 97);
    doc.text(`Jumlah Hari Lembur: ${periodLembur.length} hari`, 20, 104);

    if (periodLembur.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAIL LEMBUR', 20, 117);
        
        const headers = [['Tanggal', 'Jenis', 'Jam', 'Insentif']];
        const data = periodLembur.map(l => [
            formatDate(l.tanggal),
            l.jenisLembur,
            parseJamLembur(l.jamLembur) + ' jam',
            formatCurrency(calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level))
        ]);
        
        doc.autoTable({
            startY: 122,
            head: headers,
            body: data,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [79, 70, 229], textColor: 255 }
        });
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Halaman ${i} dari ${pageCount}`, 105, 290, { align: 'center' });
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 20, 290);
    }

    doc.save(`Laporan_${karyawan.nik}_${karyawan.nama.replace(/\s/g, '_')}.pdf`);
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600', 'bg-indigo-50');
        btn.classList.add('text-gray-500', 'border-transparent');
    });

    const tab = document.getElementById(`${tabName}-tab`);
    if (tab) tab.classList.remove('hidden');

    event.target.classList.add('border-indigo-600', 'text-indigo-600', 'bg-indigo-50');
    event.target.classList.remove('text-gray-500', 'border-transparent');
}

// ============================================
// EXPORT CALENDAR TO PDF
// ============================================
async function exportCalendarPDF() {
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    
    if (!displayPeriod) {
        showAlert('Tidak ada periode aktif untuk diexport', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('KALENDER LEMBUR KARYAWAN', doc.internal.pageSize.width / 2, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periode: ${displayPeriod.bulan} (${formatDate(displayPeriod.tanggalMulai)} - ${formatDate(displayPeriod.tanggalAkhir)})`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
        
        const startDate = new Date(displayPeriod.tanggalMulai);
        const endDate = new Date(displayPeriod.tanggalAkhir);
        
        const days = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        
        const lemburByNikDate = {};
        allLembur.forEach(l => {
            const lemburDate = new Date(l.tanggal);
            if (lemburDate >= startDate && lemburDate <= endDate) {
                if (!lemburByNikDate[l.nik]) {
                    lemburByNikDate[l.nik] = {};
                }
                const dateKey = l.tanggal;
                if (!lemburByNikDate[l.nik][dateKey]) {
                    lemburByNikDate[l.nik][dateKey] = [];
                }
                lemburByNikDate[l.nik][dateKey].push(l);
            }
        });
        
        const headers = ['No', 'Nama', 'NIK', 'Posisi', ...days.map(d => d.getDate())];
        
        const tableData = allKaryawan.map((karyawan, index) => {
            const row = [
                index + 1,
                karyawan.nama.substring(0, 20),
                karyawan.nik,
                karyawan.jabatan.substring(0, 15)
            ];
            
            days.forEach(day => {
                const dateKey = day.toISOString().split('T')[0];
                const lemburRecords = lemburByNikDate[karyawan.nik] ? lemburByNikDate[karyawan.nik][dateKey] : null;
                
                if (lemburRecords && lemburRecords.length > 0) {
                    const totalJam = lemburRecords.reduce((sum, l) => sum + parseJamLembur(l.jamLembur), 0);
                    row.push(totalJam.toString());
                } else {
                    row.push('-');
                }
            });
            
            return row;
        });
        
        doc.autoTable({
            startY: 28,
            head: [headers],
            body: tableData,
            theme: 'grid',
            styles: { 
                fontSize: 7,
                cellPadding: 1.5,
                overflow: 'linebreak'
            },
            headStyles: { 
                fillColor: [79, 70, 229],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 35 },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 30 }
            }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 15, doc.internal.pageSize.height - 10);
        }
        
        doc.save(`Kalender_${displayPeriod.bulan.replace(/\s/g, '_')}.pdf`);
        
        hideLoading();
        showAlert('✅ PDF berhasil diexport!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error exporting PDF:', error);
        showAlert('❌ Gagal export PDF: ' + error.message, 'error');
    }
}

console.log('✅ admin-features.js loaded');
