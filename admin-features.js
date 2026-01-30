// ============================================
// ADMIN FEATURES - ENHANCED VERSION
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
    const periodLembur = filterLemburByPeriod(allLembur, displayPeriod);
    
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
    
    // NEW: Render calendar view for all employees
    renderAdminCalendarView();
}

// NEW: Admin Calendar View (like image 1)
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
                <select id="adminPeriodSelector" onchange="changeAdminPeriod(this.value)" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
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
    
    // Build calendar table
    let calendarHtml = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            ${periodSelectorHtml}
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-2xl font-bold text-gray-800 flex items-center">
                    <svg class="w-7 h-7 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Kalender Lembur Semua Karyawan
                </h3>
                <button onclick="exportCalendarPDF()" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    <span>Export PDF</span>
                </button>
            </div>
            <div class="flex justify-center space-x-8 text-sm mb-6">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-red-500 border-2 border-red-700 rounded shadow flex items-center justify-center text-white font-bold text-xs">7</div>
                    <span class="text-gray-700 font-medium">Hari Libur</span>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-emerald-100 border-2 border-emerald-400 rounded flex items-center justify-center text-gray-900 font-bold text-xs">3</div>
                    <span class="text-gray-700 font-medium">Hari Kerja</span>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-gray-50 border border-gray-300 rounded"></div>
                    <span class="text-gray-700 font-medium">Tidak Ada Lembur</span>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-xs">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-10">NO</th>
                            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-10" style="left: 40px;">NAMA</th>
                            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-10" style="left: 180px;">NIK ERP</th>
                            <th class="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 sticky left-0 bg-gray-100 z-10" style="left: 280px;">POSISI</th>
                            ${days.map(day => `
                                <th class="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700 min-w-[40px]">
                                    ${day.getDate()}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${allKaryawan.map((karyawan, index) => {
                            return `
                                <tr class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-3 py-2 font-medium sticky left-0 bg-white">${index + 1}</td>
                                    <td class="border border-gray-300 px-3 py-2 sticky left-0 bg-white" style="left: 40px;">${karyawan.nama}</td>
                                    <td class="border border-gray-300 px-3 py-2 sticky left-0 bg-white" style="left: 180px;">${karyawan.nik}</td>
                                    <td class="border border-gray-300 px-3 py-2 sticky left-0 bg-white" style="left: 280px;">${karyawan.jabatan}</td>
                                    ${days.map(day => {
                                        const dateKey = day.toISOString().split('T')[0];
                                        const lemburRecords = lemburByNikDate[karyawan.nik] ? lemburByNikDate[karyawan.nik][dateKey] : null;
                                        
                                        if (lemburRecords && lemburRecords.length > 0) {
                                            const totalJam = lemburRecords.reduce((sum, l) => sum + parseJamLembur(l.jamLembur), 0);
                                            const isLibur = lemburRecords.some(l => l.jenisLembur && l.jenisLembur.toLowerCase().includes('libur'));
                                            
                                            return `
                                                <td class="border-2 px-3 py-3 text-center font-extrabold text-base ${
                                                    isLibur 
                                                        ? 'bg-red-500 text-white border-red-700 shadow-md' 
                                                        : 'bg-emerald-100 text-gray-900 border-emerald-400'
                                                }" 
                                                style="min-width: 50px;"
                                                title="${lemburRecords.map(l => `${l.jenisLembur}: ${l.jamLembur}`).join('\\n')}">
                                                    ${totalJam}
                                                </td>
                                            `;
                                        } else {
                                            return `<td class="border border-gray-300 px-3 py-3 bg-gray-50" style="min-width: 50px;"></td>`;
                                        }
                                    }).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                        <p class="text-sm font-semibold text-blue-800 mb-1">💡 Cara Baca Kalender:</p>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• <strong class="font-bold">Kotak Merah + Angka</strong> = Lembur Hari Libur (angka menunjukkan jumlah jam)</li>
                            <li>• <strong class="font-bold">Kotak Hijau + Angka</strong> = Lembur Hari Kerja (angka menunjukkan jumlah jam)</li>
                            <li>• <strong class="font-bold">Kotak Kosong</strong> = Tidak ada lembur di tanggal tersebut</li>
                            <li>• Scroll ke kanan untuk melihat tanggal lainnya dalam periode</li>
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
// KARYAWAN TAB
// ============================================
function renderKaryawanTab() {
    const tbody = document.getElementById('karyawanTable');
    if (!tbody) return;
    
    tbody.innerHTML = allKaryawan.map(k => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-sm font-mono font-semibold text-gray-800">${k.nik}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${k.nama}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${k.jabatan}</td>
            <td class="px-4 py-3 text-sm">
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                    k.level === 'supervisor' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                }">
                    ${k.level.toUpperCase()}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">
                <code class="bg-gray-100 px-3 py-1 rounded border border-gray-300 font-mono text-xs">${k.password}</code>
            </td>
            <td class="px-4 py-3 text-sm">
                <button onclick="viewKaryawanDetail('${k.nik}')" class="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition">
                    👁️ Lihat Detail
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// LEMBUR TAB
// ============================================
function renderLemburTab() {
    const tbody = document.getElementById('lemburTable');
    if (!tbody) return;
    
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = filterLemburByPeriod(allLembur, displayPeriod);

    if (periodLembur.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-3 py-12 text-center text-gray-500">
                    <svg class="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-semibold">Belum ada data lembur untuk periode ini</p>
                    <p class="text-sm text-gray-400 mt-2">Import data Excel untuk menambahkan data lembur</p>
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
                <td class="px-3 py-3 text-sm text-gray-700">${index + 1}</td>
                <td class="px-3 py-3 text-sm font-medium text-gray-800">${formatDate(l.tanggal)}</td>
                <td class="px-3 py-3 text-sm font-mono font-semibold text-gray-800">${l.nik}</td>
                <td class="px-3 py-3 text-sm font-medium text-gray-900">${l.nama}</td>
                <td class="px-3 py-3 text-sm text-gray-700">${l.jabatan}</td>
                <td class="px-3 py-3 text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${
                        l.jenisLembur.toLowerCase().includes('libur') 
                            ? 'bg-red-100 text-red-800 border border-red-300' 
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }">
                        ${l.jenisLembur}
                    </span>
                </td>
                <td class="px-3 py-3 text-sm font-bold text-indigo-600">${l.jamLembur}</td>
                <td class="px-3 py-3 text-sm font-bold text-green-600">${formatCurrency(insentif)}</td>
                <td class="px-3 py-3 text-sm text-gray-600">${l.keterangan || '-'}</td>
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
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg shadow-md border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-3xl font-bold text-blue-600">${totalRecords}</p>
                            <p class="text-blue-700 font-medium text-sm mt-1">Total Records</p>
                        </div>
                        <svg class="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-lg shadow-md border border-indigo-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-3xl font-bold text-indigo-600">${totalHours}</p>
                            <p class="text-indigo-700 font-medium text-sm mt-1">Total Jam Lembur</p>
                        </div>
                        <svg class="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg shadow-md border border-green-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-green-600">${formatCurrency(totalInsentif)}</p>
                            <p class="text-green-700 font-medium text-sm mt-1">Total Insentif</p>
                        </div>
                        <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>
                <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg shadow-md border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-3xl font-bold text-purple-600">${allKaryawan.length}</p>
                            <p class="text-purple-700 font-medium text-sm mt-1">Total Karyawan</p>
                        </div>
                        <svg class="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }
}

// ============================================
// CUT-OFF TAB (MULTI-ACTIVE SUPPORT)
// ============================================
function renderCutOffTab() {
    const tbody = document.getElementById('cutoffTable');
    if (!tbody) return;
    
    tbody.innerHTML = allCutOff.map((c, index) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-sm font-semibold text-gray-800">${c.bulan}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${formatDate(c.tanggalMulai)}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${formatDate(c.tanggalAkhir)}</td>
            <td class="px-4 py-3 text-sm">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" 
                           ${c.status === 'Aktif' ? 'checked' : ''} 
                           onchange="toggleCutOffStatus(${index})"
                           class="sr-only peer">
                    <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    <span class="ms-3 text-sm font-medium ${c.status === 'Aktif' ? 'text-green-700' : 'text-gray-600'}">
                        ${c.status === 'Aktif' ? '✓ Aktif' : 'Non-Aktif'}
                    </span>
                </label>
            </td>
            <td class="px-4 py-3 text-sm">
                <div class="flex space-x-2">
                    <button onclick="showCutOffModal(true, ${index})" class="text-indigo-600 hover:text-indigo-800 font-semibold text-xs px-3 py-1 rounded-md hover:bg-indigo-50 transition border border-indigo-200">
                        ✏️ Edit
                    </button>
                    <button onclick="deleteCutOff(${index})" class="text-red-600 hover:text-red-800 font-semibold text-xs px-3 py-1 rounded-md hover:bg-red-50 transition border border-red-200">
                        🗑️ Hapus
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// NEW: Toggle cut-off status (multi-active support)
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
        showAlert('✅ Status cut-off berhasil diubah dan tersimpan ke Google Sheets!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Status diubah di sistem, tetapi gagal sync ke Google Sheets. Silakan cek koneksi.', 'warning');
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
    const periodLembur = filterLemburByPeriod(lemburData, displayPeriod);
    
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
        <div class="space-y-6">
            <!-- Profil Karyawan -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-indigo-200">
                <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Profil Karyawan
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">NIK</p>
                        <p class="font-bold text-gray-800 text-lg mt-1">${karyawan.nik}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Nama Lengkap</p>
                        <p class="font-bold text-gray-800 text-lg mt-1">${karyawan.nama}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Jabatan</p>
                        <p class="font-semibold text-gray-800 mt-1">${karyawan.jabatan}</p>
                    </div>
                    <div class="bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Level</p>
                        <span class="inline-block px-3 py-1 mt-1 rounded-full text-sm font-semibold ${
                            karyawan.level === 'supervisor' 
                                ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }">
                            ${karyawan.level.toUpperCase()}
                        </span>
                    </div>
                    <div class="md:col-span-2 bg-white rounded-lg p-3 shadow-sm">
                        <p class="text-xs text-gray-600 font-medium">Password</p>
                        <code class="bg-gray-100 px-3 py-1 rounded border border-gray-300 font-mono text-sm inline-block mt-1">${karyawan.password}</code>
                    </div>
                </div>
            </div>

            <!-- Statistik Periode -->
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-200">
                <h4 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <svg class="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Statistik Periode ${displayPeriod ? displayPeriod.bulan : 'Aktif'}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="text-center bg-white p-4 rounded-lg shadow-md border border-indigo-100">
                        <p class="text-4xl font-bold text-indigo-600">${totalJam}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Total Jam</p>
                    </div>
                    <div class="text-center bg-white p-4 rounded-lg shadow-md border border-green-100">
                        <p class="text-2xl font-bold text-green-600">${formatCurrency(totalInsentif)}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Total Insentif</p>
                    </div>
                    <div class="text-center bg-white p-4 rounded-lg shadow-md border border-blue-100">
                        <p class="text-4xl font-bold text-blue-600">${totalHariKerja}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Hari Kerja</p>
                    </div>
                    <div class="text-center bg-white p-4 rounded-lg shadow-md border border-red-100">
                        <p class="text-4xl font-bold text-red-600">${totalHariLibur}</p>
                        <p class="text-xs text-gray-600 font-medium mt-1">Hari Libur</p>
                    </div>
                </div>
            </div>

            <!-- Riwayat Lembur -->
            <div>
                <h4 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Riwayat Lembur Terbaru
                </h4>
                ${periodLembur.length > 0 ? `
                    <div class="overflow-x-auto rounded-lg border border-gray-200 shadow">
                        <table class="w-full text-sm">
                            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th class="px-4 py-3 text-left font-bold text-gray-700">Tanggal</th>
                                    <th class="px-4 py-3 text-left font-bold text-gray-700">Jenis</th>
                                    <th class="px-4 py-3 text-left font-bold text-gray-700">Jam</th>
                                    <th class="px-4 py-3 text-left font-bold text-gray-700">Insentif</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${periodLembur.slice(0, 10).map(l => {
                                    const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
                                    return `
                                        <tr class="hover:bg-gray-50 transition-colors">
                                            <td class="px-4 py-3">${formatDate(l.tanggal)}</td>
                                            <td class="px-4 py-3">
                                                <span class="px-2 py-1 rounded-full text-xs font-semibold ${
                                                    l.jenisLembur.toLowerCase().includes('libur') 
                                                        ? 'bg-red-100 text-red-800 border border-red-300' 
                                                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                                                }">
                                                    ${l.jenisLembur}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 font-bold text-indigo-600">${l.jamLembur}</td>
                                            <td class="px-4 py-3 font-bold text-green-600">${formatCurrency(insentif)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        ${periodLembur.length > 10 ? `
                            <div class="p-4 text-center text-gray-500 text-sm bg-gray-50">
                                Menampilkan 10 dari ${periodLembur.length} records
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                        <svg class="w-20 h-20 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="font-semibold">Belum ada data lembur untuk periode ini</p>
                    </div>
                `}
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3 pt-4 border-t">
                <button onclick="exportKaryawanPDF('${nik}')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    <span>Export PDF</span>
                </button>
                <button onclick="closeEmployeeModal()" class="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition shadow-md">
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
                
                // Read with header at row 3 (0-indexed = 2)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    range: 3,
                    defval: ''
                });
                
                // Filter out empty rows
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
        preview.innerHTML = '<p class="text-red-600 font-semibold">❌ Tidak ada data yang ditemukan dalam file Excel</p>';
        document.getElementById('importBtn').disabled = true;
        return;
    }

    const { duplicates, newRecords } = detectDuplicates(data);
    
    preview.innerHTML = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-300 rounded-lg p-4 shadow-sm">
                <p class="text-blue-800 font-bold flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    File valid dan siap diimport
                </p>
                <div class="mt-3 space-y-1 text-sm">
                    <p class="text-blue-700">📊 Total rows dalam file: <strong>${data.length}</strong></p>
                    <p class="text-green-700">➕ Data baru yang akan ditambahkan: <strong>${newRecords.length}</strong></p>
                    <p class="text-yellow-700">⚠️ Data duplikat (akan diabaikan): <strong>${duplicates.length}</strong></p>
                </div>
            </div>
            
            ${duplicates.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
                    <p class="text-yellow-800 font-bold text-sm mb-2">⚠️ Data Duplikat (10 pertama):</p>
                    <div class="max-h-40 overflow-y-auto text-xs space-y-1 bg-white rounded p-2 border border-yellow-200">
                        ${duplicates.slice(0, 10).map(d => {
                            const nik = d.NIK || d.nik;
                            const tanggal = d.TANGGAL || d.Tanggal;
                            const jam = d['JAM LEMBUR'] || d['JAM LEMBUR '] || d['Jam Lembur'];
                            return `<p class="text-yellow-700">• NIK ${nik} - ${formatExcelDate(tanggal)} - ${jam}</p>`;
                        }).join('')}
                        ${duplicates.length > 10 ? `<p class="text-yellow-600 italic mt-2">...dan ${duplicates.length - 10} data duplikat lagi</p>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="bg-gray-50 border border-gray-300 rounded-lg p-4 shadow-sm">
                <p class="text-gray-800 font-bold text-sm mb-3">👁️ Preview Data Baru (5 pertama):</p>
                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="w-full text-xs bg-white">
                        <thead class="bg-gradient-to-r from-gray-100 to-gray-200">
                            <tr>
                                <th class="px-3 py-2 text-left font-bold text-gray-700">NIK</th>
                                <th class="px-3 py-2 text-left font-bold text-gray-700">Nama</th>
                                <th class="px-3 py-2 text-left font-bold text-gray-700">Tanggal</th>
                                <th class="px-3 py-2 text-left font-bold text-gray-700">Jam</th>
                                <th class="px-3 py-2 text-left font-bold text-gray-700">Jenis</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${newRecords.slice(0, 5).map(row => {
                                const nik = row.NIK || row.nik;
                                const nama = row['NAMA LENGKAP'] || row['Nama Lengkap'] || '-';
                                const tanggal = row.TANGGAL || row.Tanggal;
                                const jam = row['JAM LEMBUR'] || row['JAM LEMBUR '] || row['Jam Lembur'];
                                const jenis = row['JENIS LEMBUR'] || row['Jenis Lembur'] || 'Hari Kerja';
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-3 py-2 font-mono">${nik}</td>
                                        <td class="px-3 py-2">${nama}</td>
                                        <td class="px-3 py-2">${formatExcelDate(tanggal)}</td>
                                        <td class="px-3 py-2 font-semibold">${jam}</td>
                                        <td class="px-3 py-2">
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

// IMPROVED: Auto-sync to Google Sheets
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
        
        // Add to local data
        allLembur = [...allLembur, ...processedData];
        saveToLocalStorage('lembur', allLembur);
        
        // Sync to Google Sheets
        try {
            await callAppsScript('importLembur', { data: processedData });
            hideLoading();
            showAlert(`✅ Berhasil mengimport ${processedData.length} data dan tersimpan ke Google Sheets!`, 'success');
        } catch (error) {
            hideLoading();
            console.error('Error syncing to Sheets:', error);
            showAlert(`⚠️ Data tersimpan di sistem (${processedData.length} records), tetapi gagal sync ke Google Sheets. Silakan refresh halaman untuk memuat ulang data dari Sheets.`, 'warning');
        }
        
        closeImportModal();
        
        // Refresh display
        renderAdminDashboard();
        
    } catch (error) {
        hideLoading();
        showAlert('Error saat import data: ' + error.message, 'error');
        console.error('Import error:', error);
    }
}

// ============================================
// CUT-OFF MANAGEMENT (WITH AUTO-SYNC)
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
        modalTitle.textContent = 'Tambah Periode Cut-Off Baru';
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

    // Sync to Google Sheets
    try {
        showLoading();
        await callAppsScript('updateCutOff', { data: allCutOff });
        hideLoading();
        showAlert('✅ Periode cut-off berhasil disimpan ke Google Sheets!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Data tersimpan di sistem, tetapi gagal sync ke Google Sheets.', 'warning');
    }

    closeCutOffModal();
    renderCutOffTab();
    renderOverviewTab();
}

async function deleteCutOff(index) {
    if (!confirm('Hapus periode cut-off ini? Data lembur tidak akan dihapus.')) return;
    
    allCutOff.splice(index, 1);
    activeCutOffs = allCutOff.filter(c => c.status === 'Aktif');
    saveToLocalStorage('cutoff', allCutOff);

    // Sync to Google Sheets
    try {
        showLoading();
        await callAppsScript('updateCutOff', { data: allCutOff });
        hideLoading();
        showAlert('✅ Periode cut-off berhasil dihapus dari Google Sheets!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error syncing to Sheets:', error);
        showAlert('⚠️ Data dihapus di sistem, tetapi gagal sync ke Google Sheets.', 'warning');
    }

    renderCutOffTab();
    renderOverviewTab();
}

// ============================================
// EXPORT FEATURES
// ============================================
function exportLemburToCSV() {
    const displayPeriod = selectedCutOff || (activeCutOffs.length > 0 ? activeCutOffs[activeCutOffs.length - 1] : null);
    const periodLembur = filterLemburByPeriod(allLembur, displayPeriod);
    
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
            'Insentif Kopi': l.insentifKopi,
            'Keterangan': l.keterangan,
            'Pengecekan': l.pengecekan
        };
    });

    const headers = Object.keys(csvData[0]);
    let csv = '\uFEFF' + headers.join(',') + '\n'; // Add BOM for Excel

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
    a.download = `Laporan_Lembur_${displayPeriod ? displayPeriod.bulan.replace(/\s/g, '_') : 'All'}_${new Date().toISOString().split('T')[0]}.csv`;
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
    const periodLembur = filterLemburByPeriod(lemburData, displayPeriod);

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

    doc.save(`Laporan_Lembur_${karyawan.nik}_${karyawan.nama.replace(/\s/g, '_')}.pdf`);
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
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for wide table
        
        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('KALENDER LEMBUR KARYAWAN', doc.internal.pageSize.width / 2, 15, { align: 'center' });
        
        // Period info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periode: ${displayPeriod.bulan} (${formatDate(displayPeriod.tanggalMulai)} - ${formatDate(displayPeriod.tanggalAkhir)})`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
        
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
        
        // Prepare table data
        const headers = ['No', 'Nama', 'NIK', 'Posisi', ...days.map(d => d.getDate())];
        
        const tableData = allKaryawan.map((karyawan, index) => {
            const row = [
                index + 1,
                karyawan.nama.substring(0, 20), // Truncate long names
                karyawan.nik,
                karyawan.jabatan.substring(0, 15) // Truncate long positions
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
        
        // Add table
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
                // Date columns will auto-size
            },
            didDrawCell: function(data) {
                // Color cells with overtime
                if (data.section === 'body' && data.column.index > 3) {
                    const cellValue = data.cell.raw;
                    if (cellValue && cellValue !== '-') {
                        // Check if it's holiday overtime (you could enhance this)
                        doc.setFillColor(220, 252, 231); // Light green
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                        doc.setTextColor(0, 0, 0);
                        doc.text(cellValue, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center', baseline: 'middle' });
                    }
                }
            }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 15, doc.internal.pageSize.height - 10);
        }
        
        // Save PDF
        doc.save(`Kalender_Lembur_${displayPeriod.bulan.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        
        hideLoading();
        showAlert('✅ PDF berhasil diexport!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error exporting PDF:', error);
        showAlert('❌ Gagal export PDF: ' + error.message, 'error');
    }
}

console.log('✅ admin-features.js loaded');
