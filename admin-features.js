// ============================================
// ADMIN FEATURES - FIXED VERSION
// Tidak overwrite fungsi existing di app.js
// ============================================

// ============================================
// MODAL EMPLOYEE DETAIL (NEW)
// ============================================

function viewKaryawanDetail(nik) {
    const karyawan = allKaryawan.find(k => k.nik === nik);
    if (!karyawan) {
        showAlert('Karyawan tidak ditemukan', 'error');
        return;
    }
    
    const lemburData = allLembur.filter(l => l.nik === nik);
    const periodLembur = filterLemburByPeriod(lemburData, activeCutOff);
    
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
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Profil
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">NIK</p>
                        <p class="font-semibold text-gray-800">${karyawan.nik}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Nama Lengkap</p>
                        <p class="font-semibold text-gray-800">${karyawan.nama}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Jabatan</p>
                        <p class="font-semibold text-gray-800">${karyawan.jabatan}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Level</p>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${
                            karyawan.level === 'supervisor' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                        }">
                            ${karyawan.level}
                        </span>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Password</p>
                        <code class="bg-gray-200 px-2 py-1 rounded text-sm">${karyawan.password}</code>
                    </div>
                </div>
            </div>

            <!-- Stats Periode Aktif -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-indigo-200">
                <h4 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Statistik Periode ${activeCutOff ? activeCutOff.bulan : 'Aktif'}
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center">
                        <p class="text-3xl font-bold text-indigo-600">${totalJam}</p>
                        <p class="text-sm text-gray-600 mt-1">Total Jam</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-600">${formatCurrency(totalInsentif)}</p>
                        <p class="text-sm text-gray-600 mt-1">Total Insentif</p>
                    </div>
                    <div class="text-center">
                        <p class="text-3xl font-bold text-blue-600">${totalHariKerja}</p>
                        <p class="text-sm text-gray-600 mt-1">Hari Kerja</p>
                    </div>
                    <div class="text-center">
                        <p class="text-3xl font-bold text-red-600">${totalHariLibur}</p>
                        <p class="text-sm text-gray-600 mt-1">Hari Libur</p>
                    </div>
                </div>
            </div>

            <!-- Riwayat Lembur Recent -->
            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Riwayat Lembur Terbaru
                </h4>
                ${periodLembur.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-3 py-2 text-left">Tanggal</th>
                                    <th class="px-3 py-2 text-left">Jenis</th>
                                    <th class="px-3 py-2 text-left">Jam</th>
                                    <th class="px-3 py-2 text-left">Insentif</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${periodLembur.slice(0, 10).map(l => {
                                    const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
                                    return `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2">${formatDate(l.tanggal)}</td>
                                            <td class="px-3 py-2">
                                                <span class="px-2 py-1 rounded-full text-xs font-medium ${
                                                    l.jenisLembur.toLowerCase().includes('libur') 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : 'bg-blue-100 text-blue-800'
                                                }">
                                                    ${l.jenisLembur}
                                                </span>
                                            </td>
                                            <td class="px-3 py-2 font-semibold">${l.jamLembur}</td>
                                            <td class="px-3 py-2 font-semibold text-green-600">${formatCurrency(insentif)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        ${periodLembur.length > 10 ? `
                            <p class="text-sm text-gray-500 text-center mt-3">
                                Menampilkan 10 dari ${periodLembur.length} records
                            </p>
                        ` : ''}
                    </div>
                ` : `
                    <div class="text-center py-8 text-gray-500">
                        <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p>Belum ada data lembur untuk periode ini</p>
                    </div>
                `}
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3 pt-4 border-t">
                <button onclick="exportKaryawanPDF('${nik}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    <span>Export PDF</span>
                </button>
                <button onclick="closeEmployeeModal()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition">
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
// IMPORT EXCEL FEATURE (NEW)
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
        preview.innerHTML = '<p class="text-red-600">Tidak ada data yang ditemukan dalam file Excel</p>';
        document.getElementById('importBtn').disabled = true;
        return;
    }
    
    const { duplicates, newRecords } = detectDuplicates(data);
    
    console.log('Duplicates:', duplicates.length);
    console.log('New records:', newRecords.length);
    
    preview.innerHTML = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-blue-800 font-semibold">✅ File valid dan siap diimport</p>
                <div class="mt-3 space-y-1 text-sm">
                    <p class="text-blue-700">📊 Total rows dalam file: <strong>${data.length}</strong></p>
                    <p class="text-green-700">➕ Data baru yang akan ditambahkan: <strong>${newRecords.length}</strong></p>
                    <p class="text-yellow-700">⚠️ Data duplikat (akan diabaikan): <strong>${duplicates.length}</strong></p>
                </div>
            </div>
            
            ${duplicates.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800 font-semibold text-sm mb-2">Data Duplikat (10 pertama):</p>
                    <div class="max-h-40 overflow-y-auto text-xs space-y-1">
                        ${duplicates.slice(0, 10).map(d => {
                            const nik = d.NIK || d.nik;
                            const tanggal = d.TANGGAL || d.Tanggal;
                            const jam = d['JAM LEMBUR'] || d['JAM LEMBUR '] || d['Jam Lembur'];
                            return `<p class="text-yellow-700">• NIK ${nik} - ${formatExcelDate(tanggal)} - ${jam}</p>`;
                        }).join('')}
                        ${duplicates.length > 10 ? `<p class="text-yellow-600 italic">...dan ${duplicates.length - 10} lagi</p>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p class="text-gray-800 font-semibold text-sm mb-2">Preview Data Baru (5 pertama):</p>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="px-2 py-1 text-left">NIK</th>
                                <th class="px-2 py-1 text-left">Nama</th>
                                <th class="px-2 py-1 text-left">Tanggal</th>
                                <th class="px-2 py-1 text-left">Jam</th>
                                <th class="px-2 py-1 text-left">Jenis</th>
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
                                    <tr>
                                        <td class="px-2 py-1">${nik}</td>
                                        <td class="px-2 py-1">${nama}</td>
                                        <td class="px-2 py-1">${formatExcelDate(tanggal)}</td>
                                        <td class="px-2 py-1">${jam}</td>
                                        <td class="px-2 py-1">${jenis}</td>
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
        
        console.log('Data saved to localStorage. Total records:', allLembur.length);
        
        hideLoading();
        
        showAlert(`✅ Berhasil mengimport ${processedData.length} data baru!`, 'success');
        
        closeImportModal();
        
        // Refresh admin dashboard
        if (typeof renderAdminDashboard === 'function') {
            renderAdminDashboard();
        }
        if (typeof renderLemburTab === 'function') {
            renderLemburTab();
        }
        if (typeof renderOverviewTab === 'function') {
            renderOverviewTab();
        }
        
        setTimeout(() => {
            showAlert('⚠️ PENTING: Data sudah tersimpan di sistem. Jangan lupa update Google Sheets agar data permanen!', 'warning');
        }, 2000);
        
    } catch (error) {
        hideLoading();
        showAlert('Error saat import data: ' + error.message, 'error');
        console.error('Import error:', error);
    }
}

// ============================================
// MANAGE CUT-OFF PERIOD (NEW)
// ============================================

function showCutOffModal(edit = false, cutoff = null) {
    const modal = document.getElementById('cutoffModal');
    const modalTitle = document.getElementById('cutoffModalTitle');
    const form = document.getElementById('cutoffForm');
    
    if (edit && cutoff) {
        modalTitle.textContent = 'Edit Periode Cut-Off';
        document.getElementById('cutoffBulan').value = cutoff.bulan;
        document.getElementById('cutoffStart').value = cutoff.tanggalMulai;
        document.getElementById('cutoffEnd').value = cutoff.tanggalAkhir;
        document.getElementById('cutoffStatus').value = cutoff.status || '';
        form.dataset.editIndex = allCutOff.indexOf(cutoff);
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
    const status = document.getElementById('cutoffStatus').value;
    
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
    
    if (status === 'Aktif') {
        allCutOff.forEach((c) => {
            if (c !== newCutOff) {
                c.status = '';
            }
        });
        activeCutOff = newCutOff;
    }
    
    saveToLocalStorage('cutoff', allCutOff);
    
    showAlert('✅ Periode cut-off berhasil disimpan!', 'success');
    closeCutOffModal();
    
    // Refresh display
    if (typeof renderCutOffTab === 'function') {
        renderCutOffTab();
    }
    if (typeof renderOverviewTab === 'function') {
        renderOverviewTab();
    }
    
    setTimeout(() => {
        showAlert('⚠️ PENTING: Update juga di Google Sheets agar data permanen!', 'warning');
    }, 2000);
}

function deleteCutOff(index) {
    if (!confirm('Hapus periode cut-off ini?')) return;
    
    allCutOff.splice(index, 1);
    saveToLocalStorage('cutoff', allCutOff);
    
    activeCutOff = allCutOff.find(c => c.status === 'Aktif');
    
    showAlert('✅ Periode cut-off berhasil dihapus!', 'success');
    
    if (typeof renderCutOffTab === 'function') {
        renderCutOffTab();
    }
    if (typeof renderOverviewTab === 'function') {
        renderOverviewTab();
    }
}

function setActiveCutOff(index) {
    allCutOff.forEach(c => c.status = '');
    
    allCutOff[index].status = 'Aktif';
    activeCutOff = allCutOff[index];
    
    saveToLocalStorage('cutoff', allCutOff);
    
    showAlert('✅ Periode cut-off aktif berhasil diubah!', 'success');
    
    if (typeof renderCutOffTab === 'function') {
        renderCutOffTab();
    }
    if (typeof renderOverviewTab === 'function') {
        renderOverviewTab();
    }
    if (typeof renderLemburTab === 'function') {
        renderLemburTab();
    }
}

// Override renderCutOffTab to add action buttons
const originalRenderCutOffTab = window.renderCutOffTab;
window.renderCutOffTab = function() {
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
};

// ============================================
// EXPORT PDF (NEW)
// ============================================

async function exportKaryawanPDF(nik) {
    const karyawan = allKaryawan.find(k => k.nik === nik);
    if (!karyawan) {
        showAlert('Data karyawan tidak ditemukan', 'error');
        return;
    }
    
    const lemburData = allLembur.filter(l => l.nik === nik);
    const periodLembur = filterLemburByPeriod(lemburData, activeCutOff);
    
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
    if (activeCutOff) {
        doc.text(`Periode: ${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`, 105, 28, { align: 'center' });
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

async function exportAllLemburPDF() {
    const periodLembur = filterLemburByPeriod(allLembur, activeCutOff);
    
    if (periodLembur.length === 0) {
        showAlert('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN LEMBUR SEMUA KARYAWAN', 148, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (activeCutOff) {
            doc.text(`Periode: ${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`, 148, 28, { align: 'center' });
        }
        
        let totalJam = 0;
        let totalInsentif = 0;
        
        periodLembur.forEach(l => {
            const karyawan = allKaryawan.find(k => k.nik === l.nik);
            const level = karyawan ? karyawan.level : 'staff';
            totalJam += parseJamLembur(l.jamLembur);
            totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, level);
        });
        
        doc.setFontSize(10);
        doc.text(`Total Records: ${periodLembur.length}`, 20, 40);
        doc.text(`Total Jam: ${totalJam} jam`, 20, 46);
        doc.text(`Total Insentif: ${formatCurrency(totalInsentif)}`, 20, 52);
        
        const headers = [['No', 'Tanggal', 'NIK', 'Nama', 'Jabatan', 'Jenis', 'Jam', 'Insentif']];
        const data = periodLembur.map((l, index) => {
            const karyawan = allKaryawan.find(k => k.nik === l.nik);
            const level = karyawan ? karyawan.level : 'staff';
            const insentif = calculateInsentif(l.jamLembur, l.jenisLembur, level);
            
            return [
                index + 1,
                formatDate(l.tanggal),
                l.nik,
                l.nama,
                l.jabatan,
                l.jenisLembur,
                parseJamLembur(l.jamLembur) + ' jam',
                formatCurrency(insentif)
            ];
        });
        
        doc.autoTable({
            startY: 60,
            head: headers,
            body: data,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229], textColor: 255 }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Halaman ${i} dari ${pageCount}`, 148, 200, { align: 'center' });
            doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 20, 200);
        }
        
        const filename = `Laporan_Lembur_All_${activeCutOff ? activeCutOff.bulan.replace(/\s/g, '_') : 'All'}.pdf`;
        doc.save(filename);
        
        hideLoading();
        showAlert('✅ PDF berhasil diexport!', 'success');
    }, 100);
}

function exportLemburToCSV() {
    const periodLembur = filterLemburByPeriod(allLembur, activeCutOff);
    
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
    let csv = headers.join(',') + '\n';
    
    csvData.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Lembur_${activeCutOff ? activeCutOff.bulan.replace(/\s/g, '_') : 'All'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showAlert('✅ CSV berhasil diexport!', 'success');
}

console.log('admin-features.js loaded successfully');
