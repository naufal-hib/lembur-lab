// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================

// Google Sheets ID dari URL
const SPREADSHEET_ID = '1Us4RPm72oijMOnevEpnlxeO9g1wtpQ8jD5kmys_cGOk';

// API Key untuk akses Google Sheets
const API_KEY = 'AIzaSyBW6vyEQMJ5XoWm6ShpKYn4134aLWfpopQ';

// ============================================
// GOOGLE APPS SCRIPT URL (untuk write access)
// ============================================
// CARA SETUP:
// 1. Buka Google Sheets Anda
// 2. Extensions > Apps Script
// 3. Copy paste code dari GoogleAppsScript.js
// 4. Deploy > New deployment > Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Copy URL dan paste di bawah
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxC-Wc_5F8FkCmgAqi-F8jM-kKjq7gVPSCadVmvgK27u_lb6Py-rbIwQtoxnk5JvP55/exec';

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

// Call Google Apps Script
async function callAppsScript(action, data) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'GANTI_DENGAN_APPS_SCRIPT_URL_ANDA') {
        throw new Error('APPS_SCRIPT_URL belum dikonfigurasi! Lihat GoogleAppsScript.js untuk setup.');
    }
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });
        
        // Note: no-cors mode doesn't allow reading response
        // We'll assume success and reload data
        return { success: true };
        
    } catch (error) {
        console.error('Apps Script error:', error);
        throw error;
    }
}

console.log('✅ config.js loaded');
