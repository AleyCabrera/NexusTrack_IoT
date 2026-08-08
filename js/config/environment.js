/**
 * ==========================================
 * SMART MONITOR - ENVIRONMENT CONFIGURATION
 * ==========================================
 * 
 * Archivo: environment.js
 * Propósito: Configuración por entorno (dev/test/prod)
 * 
 * Este archivo detecta el entorno automáticamente
 * y carga la configuración correspondiente.
 */

// ==========================================
// DETECCIÓN DE ENTORNO
// ==========================================

function detectEnvironment() {
    const hostname = window.location.hostname;
    
    // Desarrollo local
    const isLocalhost = hostname === 'localhost' || 
                       hostname === '127.0.0.1' ||
                       hostname === '0.0.0.0' ||
                       hostname.includes('.local');
    
    // Pruebas
    const isTest = hostname.includes('test') || 
                   hostname.includes('testing');
    
    // Firebase Hosting (producción)
    const isProduction = hostname.includes('firebaseapp.com') || 
                        hostname.includes('web.app');
    
    // Parámetro URL
    const urlParams = new URLSearchParams(window.location.search);
    const envParam = urlParams.get('env');
    
    if (envParam === 'production') return 'production';
    if (envParam === 'test') return 'test';
    if (envParam === 'development') return 'development';
    if (isProduction) return 'production';
    if (isTest) return 'test';
    if (isLocalhost) return 'development';
    
    return 'development'; // Por defecto
}

// ==========================================
// CONFIGURACIÓN POR ENTORNO
// ==========================================

const environments = {
    development: {
        environment: 'development',
        logging: {
            level: 'debug',
            console: true,
            remote: false
        },
        api: {
            timeout: 30000,
            retries: 3
        },
        ui: {
            refreshInterval: 2000,
            chartPoints: 30,
            animations: true,
            debug: true
        },
        features: {
            mockData: true,
            soundAlerts: true,
            pushNotifications: true
        }
    },
    
    test: {
        environment: 'test',
        logging: {
            level: 'warn',
            console: true,
            remote: false
        },
        api: {
            timeout: 15000,
            retries: 2
        },
        ui: {
            refreshInterval: 5000,
            chartPoints: 60,
            animations: false,
            debug: false
        },
        features: {
            mockData: true,
            soundAlerts: false,
            pushNotifications: false
        }
    },
    
    production: {
        environment: 'production',
        logging: {
            level: 'error',
            console: true,
            remote: true
        },
        api: {
            timeout: 10000,
            retries: 3
        },
        ui: {
            refreshInterval: 5000,
            chartPoints: 120,
            animations: true,
            debug: false
        },
        features: {
            mockData: false,
            soundAlerts: true,
            pushNotifications: true
        }
    }
};

// ==========================================
// CONFIGURACIÓN ACTIVA
// ==========================================

const currentEnv = detectEnvironment();
const config = environments[currentEnv] || environments.development;

// ==========================================
// EXPORTAR (VERSIÓN GLOBAL)
// ==========================================

const Environment = {
    current: currentEnv,
    config: config,
    
    isDevelopment: function() {
        return this.current === 'development';
    },
    
    isTest: function() {
        return this.current === 'test';
    },
    
    isProduction: function() {
        return this.current === 'production';
    },
    
    getLogLevel: function() {
        return this.config.logging.level;
    },
    
    getRefreshInterval: function() {
        return this.config.ui.refreshInterval;
    },
    
    shouldUseMockData: function() {
        return this.config.features.mockData === true;
    },
    
    hasSoundAlerts: function() {
        return this.config.features.soundAlerts === true;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Environment = Environment;
}

// NO usar 'export'