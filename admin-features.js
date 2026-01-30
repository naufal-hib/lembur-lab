// ============================================
// IMPORT EXCEL FEATURE
// ============================================

async function showImportModal() {
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
    // Reset form
    document.getElementById('excelFileInput').value = '';
    document.getElementById('importPreview').innerHTML = '';
    document.getElementById('importBtn').disabled = true;
}

async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showLoading();
    
    try {
        const data = await readExcelFile(file);
        displayImportPreview(data);
        document.getElementById('importBtn').disabled = false;
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
                
                // Assume data lembur ada di sheet pertama
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            reject(error);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

function displayImportPreview(data) {
    const preview = document.getElementById('importPreview');
    
    if (!data || data.length === 0) {
        preview.innerHTML = '<p class="text-red-600">Tidak ada data yang ditemukan dalam file Excel</p>';
        return;
    }
    
    // Validate columns
    const requiredColumns = ['NIK', 'TANGGAL', 'JAM LEMBUR', 'JENIS LEMBUR'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
    
    if (missingColumns.length > 0) {
        preview.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-800 font-semibold">❌ Format file tidak sesuai!</p>
                <p class="text-red-700 text-sm mt-2">Kolom yang hilang: ${missingColumns.join(', ')}</p>
                <p class="text-red-600 text-xs mt-2">Pastikan file Excel memiliki kolom: NIK, TANGGAL, JAM LEMBUR, JENIS LEMBUR</p>
            </div>
        `;
        document.getElementById('importBtn').disabled = true;
        return;
    }
    
    // Check for duplicates
    const newDataCount = data.length;
    const { duplicates, newRecords } = detectDuplicates(data);
    
    preview.innerHTML = `
        <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-blue-800 font-semibold">✅ File valid dan siap diimport</p>
                <div class="mt-3 space-y-1 text-sm">
                    <p class="text-blue-700">📊 Total rows dalam file: <strong>${newDataCount}</strong></p>
                    <p class="text-green-700">➕ Data baru yang akan ditambahkan: <strong>${newRecords.length}</strong></p>
                    <p class="text-yellow-700">⚠️ Data duplikat (akan diabaikan): <strong>${duplicates.length}</strong></p>
                </div>
            </div>
            
            ${duplicates.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800 font-semibold text-sm mb-2">Data Duplikat:</p>
                    <div class="max-h-40 overflow-y-auto text-xs space-y-1">
                        ${duplicates.slice(0, 10).map(d => `
                            <p class="text-yellow-700">• NIK ${d.NIK} - ${formatExcelDate(d.TANGGAL)} - ${d['JAM LEMBUR']}</p>
                        `).join('')}
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
                            ${newRecords.slice(0, 5).map(row => `
                                <tr>
                                    <td class="px-2 py-1">${row.NIK}</td>
                                    <td class="px-2 py-1">${row['NAMA LENGKAP'] || '-'}</td>
                                    <td class="px-2 py-1">${formatExcelDate(row.TANGGAL)}</td>
                                    <td class="px-2 py-1">${row['JAM LEMBUR']}</td>
                                    <td class="px-2 py-1">${row['JENIS LEMBUR']}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // Store data for import
    window.pendingImportData = newRecords;
}

function detectDuplicates(newData) {
    const duplicates = [];
    const newRecords = [];
    
    newData.forEach(row => {
        const isDuplicate = allLembur.some(existing => {
            return existing.nik === String(row.NIK) && 
                   existing.tanggal === formatExcelDate(row.TANGGAL) &&
                   existing.jamLembur === row['JAM LEMBUR'];
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
    // Excel date serial number to JS date
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // If already string in format YYYY-MM-DD or DD/MM/YYYY
    if (typeof excelDate === 'string') {
        if (excelDate.includes('/')) {
            const parts = excelDate.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
        }
        return excelDate;
    }
    
    return excelDate;
}

async function importData() {
    if (!window.pendingImportData || window.pendingImportData.length === 0) {
        showAlert('Tidak ada data untuk diimport', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        // Process data
        const processedData = window.pendingImportData.map((row, index) => ({
            no: String(allLembur.length + index + 1),
            tanggal: formatExcelDate(row.TANGGAL),
            nik: String(row.NIK),
            nama: row['NAMA LENGKAP'] || row['NAMA'] || '',
            departemen: row.DEPARTEMEN || 'LABORATORIUM',
            jabatan: row.JABATAN || '',
            jenisLembur: row['JENIS LEMBUR'] || 'Hari Kerja',
            jamLembur: row['JAM LEMBUR'] || '0 Jam',
            insentifKopi: row['INSENTIF KOPI'] || 'Tidak',
            keterangan: row.KETERANGAN || '',
            pengecekan: row.PENGECEKAN || 'Import'
        }));
        
        // Add to allLembur
        allLembur = [...allLembur, ...processedData];
        
        // Save to localStorage
        saveToLocalStorage('lembur', allLembur);
        
        hideLoading();
        showAlert(`✅ Berhasil mengimport ${processedData.length} data baru!`, 'success');
        
        // Close modal
        closeImportModal();
        
        // Refresh dashboard
        renderAdminDashboard();
        
        // Show instruction to update Google Sheets
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
// MANAGE CUT-OFF PERIOD FEATURE
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
    document.getElementById('cutoffForm').reset();
}

async function saveCutOff(event) {
    event.preventDefault();
    
    const form = event.target;
    const bulan = document.getElementById('cutoffBulan').value;
    const tanggalMulai = document.getElementById('cutoffStart').value;
    const tanggalAkhir = document.getElementById('cutoffEnd').value;
    const status = document.getElementById('cutoffStatus').value;
    
    // Validate
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
    
    // If editing
    if (form.dataset.editIndex !== undefined) {
        const index = parseInt(form.dataset.editIndex);
        allCutOff[index] = newCutOff;
    } else {
        // Adding new
        allCutOff.push(newCutOff);
    }
    
    // If set as active, deactivate others
    if (status === 'Aktif') {
        allCutOff.forEach((c, i) => {
            if (c !== newCutOff) {
                c.status = '';
            }
        });
        activeCutOff = newCutOff;
    }
    
    // Save to localStorage
    saveToLocalStorage('cutoff', allCutOff);
    
    showAlert('✅ Periode cut-off berhasil disimpan!', 'success');
    closeCutOffModal();
    
    // Refresh display
    renderCutOffTab();
    renderOverviewTab();
    
    // Show instruction
    setTimeout(() => {
        showAlert('⚠️ PENTING: Update juga di Google Sheets agar data permanen!', 'warning');
    }, 2000);
}

function deleteCutOff(index) {
    if (!confirm('Hapus periode cut-off ini?')) return;
    
    allCutOff.splice(index, 1);
    saveToLocalStorage('cutoff', allCutOff);
    
    // Update active cut-off
    activeCutOff = allCutOff.find(c => c.status === 'Aktif');
    
    showAlert('✅ Periode cut-off berhasil dihapus!', 'success');
    renderCutOffTab();
    renderOverviewTab();
}

function setActiveCutOff(index) {
    // Deactivate all
    allCutOff.forEach(c => c.status = '');
    
    // Activate selected
    allCutOff[index].status = 'Aktif';
    activeCutOff = allCutOff[index];
    
    saveToLocalStorage('cutoff', allCutOff);
    
    showAlert('✅ Periode cut-off aktif berhasil diubah!', 'success');
    renderCutOffTab();
    renderOverviewTab();
    renderLemburTab();
}

// ============================================
// EXPORT PDF FEATURE
// ============================================

async function exportKaryawanPDF(nik) {
    const karyawan = allKaryawan.find(k => k.nik === nik);
    if (!karyawan) {
        showAlert('Data karyawan tidak ditemukan', 'error');
        return;
    }
    
    const lemburData = allLembur.filter(l => l.nik === nik);
    const periodLembur = filterLemburByPeriod(lemburData, activeCutOff);
    
    // Calculate stats
    let totalJam = 0;
    let totalInsentif = 0;
    
    periodLembur.forEach(l => {
        totalJam += parseJamLembur(l.jamLembur);
        totalInsentif += calculateInsentif(l.jamLembur, l.jenisLembur, karyawan.level);
    });
    
    // Create PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN LEMBUR KARYAWAN', 105, 20, { align: 'center' });
    
    // Periode
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (activeCutOff) {
        doc.text(`Periode: ${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`, 105, 28, { align: 'center' });
    }
    
    // Karyawan Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMASI KARYAWAN', 20, 40);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIK: ${karyawan.nik}`, 20, 48);
    doc.text(`Nama: ${karyawan.nama}`, 20, 55);
    doc.text(`Jabatan: ${karyawan.jabatan}`, 20, 62);
    doc.text(`Level: ${karyawan.level}`, 20, 69);
    
    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN', 20, 82);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Jam Lembur: ${totalJam} jam`, 20, 90);
    doc.text(`Total Insentif: ${formatCurrency(totalInsentif)}`, 20, 97);
    doc.text(`Jumlah Hari Lembur: ${periodLembur.length} hari`, 20, 104);
    
    // Table
    if (periodLembur.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAIL LEMBUR', 20, 117);
        
        // Table headers
        const headers = [['Tanggal', 'Jenis', 'Jam', 'Insentif']];
        
        // Table data
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
        
        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORAN LEMBUR SEMUA KARYAWAN', 148, 20, { align: 'center' });
        
        // Periode
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (activeCutOff) {
            doc.text(`Periode: ${formatDate(activeCutOff.tanggalMulai)} - ${formatDate(activeCutOff.tanggalAkhir)}`, 148, 28, { align: 'center' });
        }
        
        // Summary
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
        
        // Table
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
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Halaman ${i} dari ${pageCount}`, 148, 200, { align: 'center' });
            doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 20, 200);
        }
        
        // Save
        const filename = `Laporan_Lembur_All_${activeCutOff ? activeCutOff.bulan.replace(/\s/g, '_') : 'All'}.pdf`;
        doc.save(filename);
        
        hideLoading();
        showAlert('✅ PDF berhasil diexport!', 'success');
    }, 100);
}
