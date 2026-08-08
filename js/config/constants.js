/**
 * ==========================================
 * SMART MONITOR - CONSTANTES GLOBALES
 * ==========================================
 * 
 * Archivo: constants.js
 * Propósito: Definir todas las constantes del sistema
 * 
 * Este archivo centraliza:
 * - Umbrales de sensores
 * - Estados y tipos
 * - Configuración de UI
 * - Mensajes del sistema
 */

// ==========================================
// UMBRALES DE SENSORES
// ==========================================

const TEMPERATURE_THRESHOLDS = {
    MIN: -5,
    MAX: 10,
    CRITICAL_LOW: -10,
    CRITICAL_HIGH: 15,
    WARNING_LOW: -2,
    WARNING_HIGH: 8,
    IDEAL_MIN: 2,
    IDEAL_MAX: 6
};

const HUMIDITY_THRESHOLDS = {
    MAX: 85,
    CRITICAL: 90,
    WARNING: 80,
    IDEAL_MIN: 40,
    IDEAL_MAX: 70
};

const GAS_THRESHOLDS = {
    MAX: 200,
    CRITICAL: 500,
    WARNING: 150,
    NORMAL_MAX: 100
};

// ==========================================
// ESTADOS Y TIPOS
// ==========================================

const SENSOR_STATUS = {
    NORMAL: 'normal',
    WARNING: 'warning',
    CRITICAL: 'critical',
    ERROR: 'error',
    OFFLINE: 'offline'
};

const ALERT_TYPES = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    INFO: 'info',
    SUCCESS: 'success'
};

const DOOR_STATES = {
    OPEN: 1,
    CLOSED: 0,
    UNKNOWN: -1
};

// ==========================================
// COLORES POR ESTADO
// ==========================================

const STATUS_COLORS = {
    normal: {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
        text: '#10B981',
        glow: 'rgba(16, 185, 129, 0.3)'
    },
    warning: {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: '#F59E0B',
        glow: 'rgba(245, 158, 11, 0.3)'
    },
    critical: {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)',
        text: '#EF4444',
        glow: 'rgba(239, 68, 68, 0.3)'
    }
};

// ==========================================
// INTERVALOS DE ACTUALIZACIÓN
// ==========================================

const UPDATE_INTERVALS = {
    REALTIME: 0,
    FAST: 1000,
    NORMAL: 5000,
    SLOW: 30000,
    CHART: 2000,
    CONNECTION_CHECK: 60000
};

// ==========================================
// MENSAJES DEL SISTEMA
// ==========================================

const ALERT_MESSAGES = {
    TEMPERATURE_HIGH: 'Temperatura excedió el límite máximo',
    TEMPERATURE_LOW: 'Temperatura cayó por debajo del límite mínimo',
    TEMPERATURE_CRITICAL: '⚠️ Temperatura CRÍTICA: {value}°C',
    GAS_DETECTED: '⚠️ Gas detectado: {value} ppm',
    GAS_CRITICAL: '🚨 GAS CRÍTICO: {value} ppm',
    DOOR_OPEN: '🚪 Puerta abierta',
    DOOR_OPEN_LONG: '⚠️ Puerta abierta por más de {time} minutos',
    CONNECTION_LOST: '📡 Conexión perdida',
    CONNECTION_RESTORED: '📡 Conexión restablecida'
};

const SUCCESS_MESSAGES = {
    CONFIG_SAVED: '✅ Configuración guardada correctamente',
    ALERT_ACKNOWLEDGED: '✅ Alerta reconocida',
    ALERT_CLEARED: '✅ Alertas limpiadas'
};

const ERROR_MESSAGES = {
    CONNECTION_ERROR: '❌ Error de conexión con Firebase',
    DATA_ERROR: '❌ Error al cargar los datos',
    SAVE_ERROR: '❌ Error al guardar la configuración'
};

// ==========================================
// EXPORTAR (VERSIÓN GLOBAL)
// ==========================================

// Crear objeto con todas las constantes
const Constants = {
    TEMPERATURE_THRESHOLDS,
    HUMIDITY_THRESHOLDS,
    GAS_THRESHOLDS,
    SENSOR_STATUS,
    ALERT_TYPES,
    DOOR_STATES,
    STATUS_COLORS,
    UPDATE_INTERVALS,
    ALERT_MESSAGES,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES
};

// Exportar para uso global (window)
if (typeof window !== 'undefined') {
    window.Constants = Constants;
}

// NO usar 'export' - usar variables globales