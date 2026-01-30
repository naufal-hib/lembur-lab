// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================

// STEP 1: Ganti dengan Google Sheets ID Anda
// Cara mendapatkan: Buka Google Sheets, lihat URL:
// https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_ID = '1Us4RPm72oijMOnevEpnlxeO9g1wtpQ8jD5kmys_cGOk';

// STEP 2: Ganti dengan API Key Anda
// Cara mendapatkan: Lihat panduan di SETUP-GUIDE.md
const API_KEY = 'AIzaSyBW6vyEQMJ5XoWm6ShpKYn4134aLWfpopQ';

// ============================================
// KONFIGURASI SHEET NAMES
// ============================================
// Pastikan nama sheet di Google Sheets SAMA PERSIS dengan ini
const SHEET_CONFIG = {
    KARYAWAN: 'Karyawan',      // Sheet data karyawan
    LEMBUR: 'Lembur',          // Sheet data lembur
    CUTOFF: 'CutOff',          // Sheet periode cut-off
    CONFIG: 'Config'           // Sheet konfigurasi (opsional)
};

// ============================================
// KONFIGURASI ADMIN
// ============================================
const ADMIN_CONFIG = {
    NIK: 'admin',              // NIK untuk login admin
    PASSWORD: 'admin123'       // Password admin (bisa diubah)
};

// ============================================
// BASE API URL - JANGAN DIUBAH
// ============================================
const SHEETS_API_BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

// ============================================
// HELPER FUNCTIONS
// ============================================
function getSheetUrl(sheetName, range = '') {
    const fullRange = range ? `${sheetName}!${range}` : sheetName;
    return `${SHEETS_API_BASE}/values/${fullRange}?key=${API_KEY}`;
}

function getBatchGetUrl(ranges) {
    const rangeParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    return `${SHEETS_API_BASE}/values:batchGet?${rangeParams}&key=${API_KEY}`;
}

// Validate configuration
function validateConfig() {
    if (SPREADSHEET_ID === 'GANTI_DENGAN_SPREADSHEET_ID_ANDA') {
        return {
            valid: false,
            message: 'SPREADSHEET_ID belum dikonfigurasi! Silakan baca SETUP-GUIDE.md'
        };
    }
    
    if (API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
        return {
            valid: false,
            message: 'API_KEY belum dikonfigurasi! Silakan baca SETUP-GUIDE.md'
        };
    }
    
    return { valid: true };
}
