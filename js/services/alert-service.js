/**
 * ==========================================
 * SMART MONITOR - ALERT SERVICE
 * ==========================================
 *
 * Archivo: services/alert-service.js
 * Propósito: Servicio de gestión de alertas
 *
 * Este archivo maneja:
 * - Creación y gestión de alertas
 * - Filtrado y ordenamiento
 * - Persistencia local
 * - Notificaciones
 *
 * Dependencias: FirebaseService
 */

// ==========================================
// ALERT SERVICE
// ==========================================

class AlertService {
    constructor() {
        this.alerts = [];
        this.maxAlerts = 100;
        this.unreadCount = 0;
        this.isInitialized = false;
        this.listeners = [];
        
        // Configuración de sonidos
        this.sounds = {
            danger: new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFg=='),
            warning: new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFg=='),
            info: new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFg==')
        };
        
        // Sonidos precargados
        var soundKeys = Object.keys(this.sounds);
        for (var i = 0; i < soundKeys.length; i++) {
            var sound = this.sounds[soundKeys[i]];
            sound.load();
            sound.volume = 0.3;
        }
        
        this.init();
    }
    
    init() {
        try {
            // Cargar alertas locales
            this.loadLocalAlerts();
            
            // Configurar notificaciones
            this.setupNotifications();
            
            this.isInitialized = true;
            console.log('🔔 Alert Service inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando Alert Service:', error);
            this.isInitialized = true;
        }
    }
    
    // ==========================================
    // GESTIÓN DE ALERTAS
    // ==========================================
    
    addAlert(alertData) {
        try {
            // Validar datos
            var validated = {
                id: alertData.id || Date.now().toString(),
                type: this.validateType(alertData.type),
                title: this.sanitizeText(alertData.title || 'Alerta'),
                message: this.sanitizeText(alertData.message || ''),
                timestamp: alertData.timestamp || Date.now(),
                read: alertData.read === true,
                priority: this.calculatePriority(alertData)
            };
            
            // Verificar duplicados recientes
            var exists = this.alerts.some(function(a) {
                return a.message === validated.message && 
                       (Date.now() - a.timestamp) < 120000;
            });
            
            if (exists) return null;
            
            // Agregar al inicio
            this.alerts.unshift(validated);
            
            // Limitar cantidad
            if (this.alerts.length > this.maxAlerts) {
                this.alerts = this.alerts.slice(0, this.maxAlerts);
            }
            
            // Actualizar contadores
            this.updateCounts();
            
            // Guardar localmente
            this.saveLocalAlerts();
            
            // Reproducir sonido
            this.playSound(validated.type);
            
            // Mostrar notificación
            this.showNotification(validated);
            
            return validated;
            
        } catch (error) {
            console.error('❌ Error agregando alerta:', error);
            return null;
        }
    }
    
    validateType(type) {
        var validTypes = ['danger', 'warning', 'info', 'success'];
        return validTypes.indexOf(type) !== -1 ? type : 'info';
    }
    
    sanitizeText(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    calculatePriority(alert) {
        var priorities = {
            danger: 3,
            warning: 2,
            info: 1,
            success: 0
        };
        return priorities[alert.type] || 1;
    }
    
    // ==========================================
    // CONTADORES Y FILTROS
    // ==========================================
    
    updateCounts() {
        var unreadCount = 0;
        for (var i = 0; i < this.alerts.length; i++) {
            if (!this.alerts[i].read) unreadCount++;
        }
        this.unreadCount = unreadCount;
        return this.unreadCount;
    }
    
    getUnreadCount() {
        return this.unreadCount;
    }
    
    getAlertsByType(type) {
        return this.alerts.filter(function(a) { return a.type === type; });
    }
    
    getUnreadAlerts() {
        return this.alerts.filter(function(a) { return !a.read; });
    }
    
    getRecentAlerts(limit) {
        limit = limit || 10;
        return this.alerts.slice(0, limit);
    }
    
    // ==========================================
    // ACCIONES SOBRE ALERTAS
    // ==========================================
    
    markAsRead(alertId) {
        for (var i = 0; i < this.alerts.length; i++) {
            if (this.alerts[i].id === alertId) {
                this.alerts[i].read = true;
                this.updateCounts();
                this.saveLocalAlerts();
                return true;
            }
        }
        return false;
    }
    
    markAllAsRead() {
        for (var i = 0; i < this.alerts.length; i++) {
            this.alerts[i].read = true;
        }
        this.updateCounts();
        this.saveLocalAlerts();
        return true;
    }
    
    deleteAlert(alertId) {
        this.alerts = this.alerts.filter(function(a) { return a.id !== alertId; });
        this.updateCounts();
        this.saveLocalAlerts();
        return true;
    }
    
    clearAll() {
        this.alerts = [];
        this.updateCounts();
        this.saveLocalAlerts();
        return true;
    }
    
    // ==========================================
    // NOTIFICACIONES
    // ==========================================
    
    setupNotifications() {
        // Solicitar permiso para notificaciones
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(function() {
                Notification.requestPermission();
            }, 5000);
        }
    }
    
    showNotification(alert) {
        try {
            if (!('Notification' in window) || Notification.permission !== 'granted') {
                return;
            }
            
            var typeLabel = this.getTypeLabel(alert.type);
            var notification = new Notification('🔔 Smart Monitor', {
                body: typeLabel + ' ' + alert.title + ': ' + alert.message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❄️</text></svg>',
                tag: alert.id,
                requireInteraction: true,
                silent: true
            });
            
            notification.onclick = function() {
                window.focus();
                notification.close();
                // Ir a la sección de alertas
                var alertLink = document.querySelector('a[href="#alertas"]');
                if (alertLink) alertLink.click();
            };
            
            setTimeout(function() { notification.close(); }, 10000);
            
        } catch (error) {
            // Silenciar error de notificaciones
        }
    }
    
    playSound(type) {
        try {
            var sound = this.sounds[type] || this.sounds.info;
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(function() {});
            }
        } catch (error) {
            // Silenciar error de audio
        }
    }
    
    getTypeLabel(type) {
        var labels = {
            danger: '🚨',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✅'
        };
        return labels[type] || '📢';
    }
    
    // ==========================================
    // PERSISTENCIA LOCAL
    // ==========================================
    
    saveLocalAlerts() {
        try {
            localStorage.setItem('smartmonitor_alerts', JSON.stringify({
                alerts: this.alerts,
                timestamp: Date.now()
            }));
        } catch (error) {
            // Silenciar error de localStorage
        }
    }
    
    loadLocalAlerts() {
        try {
            var stored = localStorage.getItem('smartmonitor_alerts');
            if (stored) {
                var data = JSON.parse(stored);
                if (data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0) {
                    this.alerts = data.alerts;
                    this.updateCounts();
                }
            }
        } catch (error) {
            // Silenciar error
        }
    }
    
    // ==========================================
    // EXPORTACIÓN
    // ==========================================
    
    exportAlerts(format) {
        format = format || 'json';
        try {
            if (format === 'json') {
                var data = JSON.stringify(this.alerts, null, 2);
                var blob = new Blob([data], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'alertas_' + new Date().toISOString().slice(0,10) + '.json';
                a.click();
                URL.revokeObjectURL(url);
                return true;
            } else if (format === 'csv') {
                var headers = ['ID', 'Tipo', 'Título', 'Mensaje', 'Fecha', 'Leído'];
                var rows = [];
                for (var i = 0; i < this.alerts.length; i++) {
                    var a = this.alerts[i];
                    rows.push([
                        a.id,
                        a.type,
                        a.title,
                        a.message,
                        new Date(a.timestamp).toLocaleString('es-ES'),
                        a.read ? 'Sí' : 'No'
                    ]);
                }
                var csv = [headers, ...rows].map(function(row) { return row.join(','); }).join('\n');
                var blob = new Blob([csv], { type: 'text/csv' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'alertas_' + new Date().toISOString().slice(0,10) + '.csv';
                a.click();
                URL.revokeObjectURL(url);
                return true;
            }
        } catch (error) {
            console.error('❌ Error exportando alertas:', error);
            return false;
        }
    }
    
    // ==========================================
    // LIMPIEZA
    // ==========================================
    
    destroy() {
        this.alerts = [];
        this.listeners = [];
        this.isInitialized = false;
        console.log('🧹 Alert Service limpiado');
    }
}

// ==========================================
// INSTANCIAR Y EXPORTAR
// ==========================================

var alertService = new AlertService();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.alertService = alertService;
    window.AlertService = AlertService;
}

console.log('🔔 Alert Service inicializado');