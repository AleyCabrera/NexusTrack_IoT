/**
 * ==========================================
 * SMART MONITOR - FORMATTERS
 * ==========================================
 *
 * Archivo: utils/formatters.js
 * Propósito: Funciones de formateo de datos
 *
 * Este archivo contiene:
 * - Formateo de números
 * - Formateo de fechas
 * - Formateo de unidades
 * - Formateo de estados
 *
 * @module utils/formatters
 * @version 2.0.0
 */

// ==========================================
// FORMATTERS DE NÚMEROS
// ==========================================

const NumberFormatters = {
    /**
     * Formatea un número con decimales
     * @param {number} value - Valor a formatear
     * @param {number} decimals - Número de decimales
     * @param {string} fallback - Valor por defecto si es null
     * @returns {string} - Número formateado
     */
    decimal: function(value, decimals, fallback) {
        decimals = decimals || 1;
        fallback = fallback || '--';
        
        if (value === null || value === undefined) return fallback;
        const num = parseFloat(value);
        if (isNaN(num)) return fallback;
        return num.toFixed(decimals);
    },
    
    /**
     * Formatea un número entero
     * @param {number} value - Valor a formatear
     * @param {string} fallback - Valor por defecto si es null
     * @returns {string} - Número formateado
     */
    integer: function(value, fallback) {
        fallback = fallback || '--';
        
        if (value === null || value === undefined) return fallback;
        const num = parseInt(value);
        if (isNaN(num)) return fallback;
        return num.toString();
    },
    
    /**
     * Formatea un porcentaje
     * @param {number} value - Valor a formatear
     * @param {number} decimals - Número de decimales
     * @param {string} fallback - Valor por defecto si es null
     * @returns {string} - Porcentaje formateado
     */
    percentage: function(value, decimals, fallback) {
        decimals = decimals || 0;
        fallback = fallback || '--%';
        
        if (value === null || value === undefined) return fallback;
        const num = parseFloat(value);
        if (isNaN(num)) return fallback;
        return num.toFixed(decimals) + '%';
    },
    
    /**
     * Formatea un valor con su unidad
     * @param {number} value - Valor a formatear
     * @param {string} unit - Unidad (ej: '°C', '%', 'ppm')
     * @param {number} decimals - Número de decimales
     * @param {string} fallback - Valor por defecto si es null
     * @returns {string} - Valor formateado con unidad
     */
    withUnit: function(value, unit, decimals, fallback) {
        decimals = decimals || 1;
        fallback = fallback || '--' + unit;
        
        if (value === null || value === undefined) return fallback;
        const num = parseFloat(value);
        if (isNaN(num)) return fallback;
        return num.toFixed(decimals) + unit;
    }
};

// ==========================================
// FORMATTERS DE FECHAS
// ==========================================

const DateFormatters = {
    /**
     * Formatea una fecha relativa (hace X tiempo)
     * @param {number} timestamp - Timestamp en milisegundos
     * @param {string} locale - Locale para el formato
     * @returns {string} - Fecha formateada
     */
    relative: function(timestamp, locale) {
        locale = locale || 'es-ES';
        
        if (!timestamp) return 'Hace un momento';
        
        try {
            var date = new Date(timestamp);
            var now = new Date();
            var diff = Math.floor((now - date) / 1000);
            
            if (diff < 5) return 'Ahora mismo';
            if (diff < 60) return 'Hace ' + diff + ' segundos';
            if (diff < 120) return 'Hace 1 minuto';
            if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + ' minutos';
            if (diff < 7200) return 'Hace 1 hora';
            if (diff < 86400) return 'Hace ' + Math.floor(diff / 3600) + ' horas';
            if (diff < 172800) return 'Ayer';
            if (diff < 604800) return 'Hace ' + Math.floor(diff / 86400) + ' días';
            if (diff < 2592000) return 'Hace ' + Math.floor(diff / 604800) + ' semanas';
            if (diff < 31536000) return 'Hace ' + Math.floor(diff / 2592000) + ' meses';
            return 'Hace ' + Math.floor(diff / 31536000) + ' años';
        } catch (error) {
            return 'Fecha desconocida';
        }
    },
    
    /**
     * Formatea una fecha en formato corto
     * @param {number} timestamp - Timestamp en milisegundos
     * @param {string} locale - Locale para el formato
     * @returns {string} - Fecha formateada
     */
    short: function(timestamp, locale) {
        locale = locale || 'es-ES';
        
        if (!timestamp) return '--/--/----';
        
        try {
            var date = new Date(timestamp);
            return date.toLocaleDateString(locale, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return '--/--/----';
        }
    },
    
    /**
     * Formatea una fecha en formato largo
     * @param {number} timestamp - Timestamp en milisegundos
     * @param {string} locale - Locale para el formato
     * @returns {string} - Fecha formateada
     */
    long: function(timestamp, locale) {
        locale = locale || 'es-ES';
        
        if (!timestamp) return 'Fecha desconocida';
        
        try {
            var date = new Date(timestamp);
            return date.toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha desconocida';
        }
    },
    
    /**
     * Formatea una hora (HH:MM)
     * @param {number} timestamp - Timestamp en milisegundos
     * @param {string} locale - Locale para el formato
     * @returns {string} - Hora formateada
     */
    time: function(timestamp, locale) {
        locale = locale || 'es-ES';
        
        if (!timestamp) return '--:--';
        
        try {
            var date = new Date(timestamp);
            return date.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            return '--:--';
        }
    },
    
    /**
     * Formatea una duración en segundos a formato legible
     * @param {number} seconds - Duración en segundos
     * @returns {string} - Duración formateada
     */
    duration: function(seconds) {
        if (seconds === null || seconds === undefined) return '--';
        if (seconds < 0) return '--';
        
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var secs = Math.floor(seconds % 60);
        
        var parts = [];
        if (hours > 0) parts.push(hours + 'h');
        if (minutes > 0) parts.push(minutes + 'm');
        if (secs > 0 || parts.length === 0) parts.push(secs + 's');
        
        return parts.join(' ');
    }
};

// ==========================================
// FORMATTERS DE ESTADOS
// ==========================================

const StatusFormatters = {
    /**
     * Formatea un estado de sensor
     * @param {string} status - Estado del sensor
     * @param {Object} labels - Etiquetas personalizadas
     * @returns {Object} - Estado formateado con clase y texto
     */
    sensor: function(status, labels) {
        labels = labels || {};
        var defaultLabels = {
            normal: { text: '✅ Normal', class: 'normal' },
            warning: { text: '⚠️ Atención', class: 'warning' },
            critical: { text: '🚨 Crítico', class: 'danger' },
            error: { text: '❌ Error', class: 'error' },
            offline: { text: '📡 Offline', class: 'offline' }
        };
        
        var mergedLabels = { ...defaultLabels, ...labels };
        return mergedLabels[status] || { text: status, class: '' };
    },
    
    /**
     * Formatea el estado de la puerta
     * @param {number} state - Estado de la puerta (0=cerrada, 1=abierta)
     * @returns {Object} - Estado formateado
     */
    door: function(state) {
        if (state === 1) {
            return { text: '🔴 Abierta', class: 'door-open' };
        } else if (state === 0) {
            return { text: '🟢 Cerrada', class: 'door-closed' };
        } else {
            return { text: '❓ Desconocido', class: '' };
        }
    },
    
    /**
     * Formatea una prioridad de alerta
     * @param {string} priority - Prioridad de la alerta
     * @returns {Object} - Prioridad formateada
     */
    alertPriority: function(priority) {
        var priorities = {
            danger: { icon: '🚨', label: 'Crítica', class: 'danger' },
            warning: { icon: '⚠️', label: 'Advertencia', class: 'warning' },
            info: { icon: 'ℹ️', label: 'Información', class: 'info' },
            success: { icon: '✅', label: 'Éxito', class: 'success' }
        };
        return priorities[priority] || { icon: '📢', label: 'General', class: '' };
    }
};

// ==========================================
// FORMATTERS DE UNIDADES
// ==========================================

const UnitFormatters = {
    /**
     * Obtiene la unidad de una categoría
     * @param {string} category - Categoría del sensor
     * @returns {string} - Unidad correspondiente
     */
    getUnit: function(category) {
        var units = {
            temperature: '°C',
            humidity: '%',
            gas: 'ppm',
            voltage: 'V',
            current: 'A',
            power: 'W',
            energy: 'kWh',
            frequency: 'Hz',
            powerFactor: ''
        };
        return units[category] || '';
    },
    
    /**
     * Obtiene el símbolo de una categoría
     * @param {string} category - Categoría del sensor
     * @returns {string} - Símbolo correspondiente
     */
    getSymbol: function(category) {
        var symbols = {
            temperature: '🌡️',
            humidity: '💧',
            gas: '🔥',
            voltage: '⚡',
            current: '⚡',
            power: '⚡',
            energy: '⚡',
            door: '🚪',
            motion: '👤'
        };
        return symbols[category] || '📊';
    },
    
    /**
     * Obtiene la etiqueta de una categoría
     * @param {string} category - Categoría del sensor
     * @returns {string} - Etiqueta correspondiente
     */
    getLabel: function(category) {
        var labels = {
            temperature: 'Temperatura',
            humidity: 'Humedad',
            gas: 'Gas',
            door: 'Puerta',
            motion: 'Movimiento',
            voltage: 'Voltaje',
            current: 'Corriente',
            power: 'Potencia',
            energy: 'Energía'
        };
        return labels[category] || category;
    }
};

// ==========================================
// EXPORTAR
// ==========================================

const Formatters = {
    number: NumberFormatters,
    date: DateFormatters,
    status: StatusFormatters,
    units: UnitFormatters
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Formatters = Formatters;
}

console.log('📦 Formatters inicializados');