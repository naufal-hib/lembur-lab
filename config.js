// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================

// Google Sheets ID dari URL
const SPREADSHEET_ID = '1Us4RPm72oijMOnevEpnlxeO9g1wtpQ8jD5kmys_cGOk';

// API Key untuk akses Google Sheets
const API_KEY = 'AIzaSyBW6vyEQMJ5XoWm6ShpKYn4134aLWfpopQ';

// ============================================
// KONFIGURASI SHEET NAMES
// ============================================
const SHEET_CONFIG = {
    KARYAWAN: 'Karyawan',
    LEMBUR: 'Lembur',
    CUTOFF: 'CutOff',
    CONFIG: 'Config'
};

// ============================================
// KONFIGURASI ADMIN
// ============================================
const ADMIN_CONFIG = {
    NIK: 'admin',
    PASSWORD: 'admin123'
};

// ============================================
// BASE API URL
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
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'GANTI_DENGAN_SPREADSHEET_ID_ANDA') {
        return {
            valid: false,
            message: 'SPREADSHEET_ID belum dikonfigurasi!'
        };
    }
    
    if (!API_KEY || API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
        return {
            valid: false,
            message: 'API_KEY belum dikonfigurasi!'
        };
    }
    
    return { valid: true };
}

console.log('✅ config.js loaded');
