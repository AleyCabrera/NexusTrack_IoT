/**
 * ==========================================
 * SMART MONITOR - FIREBASE CONFIGURATION
 * ==========================================
 * 
 * Archivo: config/firebase-config.js
 * Propósito: Configuración de Firebase
 * 
 * Este archivo contiene:
 * - Credenciales de Firebase
 * - Inicialización
 * - Referencias a nodos de la base de datos
 * - Estructura alineada con la base de datos existente
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyDMPpvQT0SMzq4o8VjfKpJvqgzFA191LYA",
    authDomain: "smart-monitor-6ec58.firebaseapp.com",
    databaseURL: "https://smart-monitor-6ec58-default-rtdb.firebaseio.com",
    projectId: "smart-monitor-6ec58",
    storageBucket: "smart-monitor-6ec58.firebasestorage.app",
    messagingSenderId: "298178902558",
    appId: "1:298178902558:web:51f503baa9358068f74c0f",
    measurementId: "G-Z1418C0EL7"
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

let firebaseInitialized = false;
let database = null;

try {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK no está cargado correctamente');
    }
    
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    firebaseInitialized = true;
    
    console.log('🔥 Firebase inicializado correctamente');
    
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    firebaseInitialized = false;
}

// ==========================================
// REFERENCIAS A NODOS (Estructura existente)
// ==========================================

const db = database;

// === Nodos principales (ya existentes) ===
const devicesRef = database ? database.ref('devices') : null;
const sensorsRef = database ? database.ref('sensors') : null;
const alertsRef = database ? database.ref('alerts') : null;
const configRef = database ? database.ref('configuration') : null;

// === Nodos a agregar (para nuevas funcionalidades) ===
const historyRef = database ? database.ref('history') : null;
const securityRef = database ? database.ref('security') : null;
const usersRef = database ? database.ref('users') : null;
const logsRef = database ? database.ref('logs') : null;
const statisticsRef = database ? database.ref('statistics') : null;

// ==========================================
// REFERENCIAS POR DISPOSITIVO
// ==========================================

const DEFAULT_DEVICE_ID = 'esp32_001';

/**
 * Obtiene referencia a un nodo específico de un dispositivo
 * @param {string} deviceId - ID del dispositivo
 * @param {string} node - Nodo principal (sensors, alerts, etc.)
 * @param {string} subNode - Subnodo (live, config, etc.)
 * @returns {Object} - Referencia de Firebase
 */
function getDeviceRef(deviceId, node, subNode) {
    deviceId = deviceId || DEFAULT_DEVICE_ID;
    if (subNode) {
        return database ? database.ref(node + '/' + deviceId + '/' + subNode) : null;
    }
    return database ? database.ref(node + '/' + deviceId) : null;
}

// ==========================================
// EXPORTAR
// ==========================================

const FirebaseConfig = {
    config: firebaseConfig,
    isInitialized: firebaseInitialized,
    database: database,
    
    // Referencias principales
    devicesRef: devicesRef,
    sensorsRef: sensorsRef,
    alertsRef: alertsRef,
    configRef: configRef,
    historyRef: historyRef,
    securityRef: securityRef,
    usersRef: usersRef,
    logsRef: logsRef,
    statisticsRef: statisticsRef,
    
    // Utilidades
    getDeviceRef: getDeviceRef,
    DEFAULT_DEVICE_ID: DEFAULT_DEVICE_ID
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.FirebaseConfig = FirebaseConfig;
}

console.log('📦 Firebase Config exportado');