/**
 * ==========================================
 * SMART MONITOR - VALIDATORS
 * ==========================================
 * 
 * Archivo: utils/validators.js
 * Propósito: Funciones de validación de datos
 * 
 * Este archivo contiene:
 * - Validación de sensores
 * - Validación de configuraciones
 * - Sanitización de datos
 * - Verificación de tipos
 * 
 * @module utils/validators
 * @version 2.0.0
 */

// ==========================================
// VALIDADORES DE SENSORES
// ==========================================

const SensorValidators = {
    /**
     * Valida un valor de temperatura
     * @param {any} value - Valor a validar
     * @param {number} min - Temperatura mínima permitida
     * @param {number} max - Temperatura máxima permitida
     * @returns {number|null} - Valor validado o null
     */
    temperature: function(value, min, max) {
        min = min || -40;
        max = max || 80;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida un valor de humedad
     * @param {any} value - Valor a validar
     * @param {number} min - Humedad mínima permitida
     * @param {number} max - Humedad máxima permitida
     * @returns {number|null} - Valor validado o null
     */
    humidity: function(value, min, max) {
        min = min || 0;
        max = max || 100;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida un valor de gas
     * @param {any} value - Valor a validar
     * @param {number} min - Gas mínimo permitido
     * @param {number} max - Gas máximo permitido
     * @returns {number|null} - Valor validado o null
     */
    gas: function(value, min, max) {
        min = min || 0;
        max = max || 1000;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida el estado de la puerta
     * @param {any} value - Valor a validar
     * @returns {number|null} - 1 (abierta), 0 (cerrada) o null
     */
    door: function(value) {
        if (value === null || value === undefined) return null;
        return value === 1 || value === true ? 1 : 0;
    },
    
    /**
     * Valida un valor de voltaje
     * @param {any} value - Valor a validar
     * @param {number} min - Voltaje mínimo permitido
     * @param {number} max - Voltaje máximo permitido
     * @returns {number|null} - Valor validado o null
     */
    voltage: function(value, min, max) {
        min = min || 0;
        max = max || 300;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida un valor de corriente
     * @param {any} value - Valor a validar
     * @param {number} min - Corriente mínima permitida
     * @param {number} max - Corriente máxima permitida
     * @returns {number|null} - Valor validado o null
     */
    current: function(value, min, max) {
        min = min || 0;
        max = max || 50;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida un valor de potencia
     * @param {any} value - Valor a validar
     * @param {number} min - Potencia mínima permitida
     * @param {number} max - Potencia máxima permitida
     * @returns {number|null} - Valor validado o null
     */
    power: function(value, min, max) {
        min = min || 0;
        max = max || 5000;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    }
};

// ==========================================
// VALIDADORES DE CONFIGURACIÓN
// ==========================================

const ConfigValidators = {
    /**
     * Valida un umbral de temperatura
     * @param {any} value - Valor a validar
     * @param {number} min - Mínimo permitido
     * @param {number} max - Máximo permitido
     * @returns {number|null} - Valor validado o null
     */
    temperatureThreshold: function(value, min, max) {
        min = min || -20;
        max = max || 50;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida un umbral de humedad
     * @param {any} value - Valor a validar
     * @param {number} min - Mínimo permitido
     * @param {number} max - Máximo permitido
     * @returns {number|null} - Valor validado o null
     */
    humidityThreshold: function(value, min, max) {
        min = min || 0;
        max = max || 100;
        
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    },
    
    /**
     * Valida una hora (formato HH:MM)
     * @param {string} value - Hora a validar
     * @returns {string|null} - Hora validada o null
     */
    time: function(value) {
        if (!value || typeof value !== 'string') return null;
        const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!regex.test(value)) return null;
        return value;
    },
    
    /**
     * Valida un número entero positivo
     * @param {any} value - Valor a validar
     * @param {number} min - Mínimo permitido
     * @param {number} max - Máximo permitido
     * @returns {number|null} - Valor validado o null
     */
    positiveInteger: function(value, min, max) {
        min = min || 0;
        max = max || 9999;
        
        if (value === null || value === undefined) return null;
        const num = parseInt(value);
        if (isNaN(num) || num < min || num > max) return null;
        return num;
    }
};

// ==========================================
// SANITIZADORES
// ==========================================

const Sanitizers = {
    /**
     * Sanitiza un string (previene XSS)
     * @param {string} text - Texto a sanitizar
     * @returns {string} - Texto sanitizado
     */
    string: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Sanitiza un email
     * @param {string} email - Email a sanitizar
     * @returns {string|null} - Email sanitizado o null
     */
    email: function(email) {
        if (!email) return null;
        const sanitized = email.trim().toLowerCase();
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(sanitized)) return null;
        return sanitized;
    },
    
    /**
     * Sanitiza un número
     * @param {any} value - Valor a sanitizar
     * @param {number} decimals - Número de decimales
     * @returns {number|null} - Número sanitizado o null
     */
    number: function(value, decimals) {
        decimals = decimals || 2;
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return parseFloat(num.toFixed(decimals));
    },
    
    /**
     * Sanitiza un objeto (elimina propiedades undefined)
     * @param {Object} obj - Objeto a sanitizar
     * @returns {Object} - Objeto sanitizado
     */
    object: function(obj) {
        if (!obj || typeof obj !== 'object') return {};
        const result = {};
        for (var key in obj) {
            if (obj[key] !== undefined && obj[key] !== null) {
                result[key] = obj[key];
            }
        }
        return result;
    }
};

// ==========================================
// VALIDADORES DE DATOS COMPUESTOS
// ==========================================

const DataValidators = {
    /**
     * Valida datos completos de sensores
     * @param {Object} data - Datos a validar
     * @returns {Object|null} - Datos validados o null
     */
    sensorData: function(data) {
        if (!data || typeof data !== 'object') return null;
        
        const validated = {};
        
        // Validar cada campo
        if (data.temperature !== undefined) {
            validated.temperature = SensorValidators.temperature(data.temperature);
        }
        if (data.humidity !== undefined) {
            validated.humidity = SensorValidators.humidity(data.humidity);
        }
        if (data.gas !== undefined) {
            validated.gas = SensorValidators.gas(data.gas);
        }
        if (data.door !== undefined) {
            validated.door = SensorValidators.door(data.door);
        }
        if (data.voltage !== undefined) {
            validated.voltage = SensorValidators.voltage(data.voltage);
        }
        if (data.current !== undefined) {
            validated.current = SensorValidators.current(data.current);
        }
        if (data.power !== undefined) {
            validated.power = SensorValidators.power(data.power);
        }
        
        // Timestamp
        validated.timestamp = data.timestamp || Date.now();
        
        // Verificar que hay al menos un valor
        var hasValue = false;
        for (var key in validated) {
            if (key !== 'timestamp' && validated[key] !== null) {
                hasValue = true;
                break;
            }
        }
        
        return hasValue ? validated : null;
    },
    
    /**
     * Valida datos de alerta
     * @param {Object} data - Datos a validar
     * @returns {Object|null} - Datos validados o null
     */
    alertData: function(data) {
        if (!data || typeof data !== 'object') return null;
        
        const validated = {
            type: this.alertType(data.type),
            title: Sanitizers.string(data.title || 'Alerta'),
            message: Sanitizers.string(data.message || ''),
            timestamp: data.timestamp || Date.now(),
            read: data.read === true
        };
        
        // Verificar que hay título o mensaje
        if (!validated.title && !validated.message) return null;
        
        return validated;
    },
    
    /**
     * Valida el tipo de alerta
     * @param {string} type - Tipo de alerta
     * @returns {string} - Tipo validado
     */
    alertType: function(type) {
        var validTypes = ['danger', 'warning', 'info', 'success'];
        return validTypes.indexOf(type) !== -1 ? type : 'info';
    },
    
    /**
     * Valida configuración del sistema
     * @param {Object} config - Configuración a validar
     * @returns {Object|null} - Configuración validada o null
     */
    systemConfig: function(config) {
        if (!config || typeof config !== 'object') return null;
        
        const validated = {};
        
        if (config.temperature) {
            validated.temperature = {
                min: ConfigValidators.temperatureThreshold(config.temperature.min),
                max: ConfigValidators.temperatureThreshold(config.temperature.max)
            };
        }
        
        if (config.humidity) {
            validated.humidity = {
                max: ConfigValidators.humidityThreshold(config.humidity.max)
            };
        }
        
        if (config.gas) {
            validated.gas = {
                max: ConfigValidators.positiveInteger(config.gas.max, 0, 1000)
            };
        }
        
        if (config.door) {
            validated.door = {
                maxOpenTime: ConfigValidators.positiveInteger(config.door.maxOpenTime, 0, 3600)
            };
        }
        
        if (config.security) {
            validated.security = {
                start: ConfigValidators.time(config.security.start),
                end: ConfigValidators.time(config.security.end)
            };
        }
        
        return Object.keys(validated).length > 0 ? validated : null;
    }
};

// ==========================================
// EXPORTAR
// ==========================================

const Validators = {
    sensor: SensorValidators,
    config: ConfigValidators,
    sanitize: Sanitizers,
    data: DataValidators
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Validators = Validators;
}

console.log('📦 Validators inicializados');