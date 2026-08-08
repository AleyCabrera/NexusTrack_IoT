/**
 * ==========================================
 * SMART MONITOR - ALERTS CONTROLLER
 * ==========================================
 * 
 * Archivo: controllers/alerts-controller.js
 * Propósito: Controlador de la sección de alertas
 * 
 * Este archivo maneja:
 * - Visualización de alertas en la UI
 * - Filtros y ordenamiento
 * - Interacciones del usuario
 * - Renderizado de la lista de alertas
 * 
 * Dependencias: alertService, FirebaseService
 */

// ==========================================
// ALERTS CONTROLLER
// ==========================================

class AlertsController {
    constructor() {
        this.alerts = [];
        this.filteredAlerts = [];
        this.currentFilter = 'all'; // all, unread, read, danger, warning, info
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        try {
            // Verificar Firebase
            if (typeof FirebaseService === 'undefined' || !FirebaseService.onAlerts) {
                console.warn('⚠️ FirebaseService no disponible para alertas');
                this.generateMockAlerts();
                this.isInitialized = true;
                return;
            }
            
            // Escuchar alertas en tiempo real
            var alertListener = FirebaseService.onAlerts(function(alerts) {
                if (alerts && Array.isArray(alerts)) {
                    this.processAlerts(alerts);
                }
            }.bind(this));
            
            // Guardar listener para limpieza
            this._alertListener = alertListener;
            
            // Configurar listeners de UI
            this.setupUIListeners();
            
            this.isInitialized = true;
            console.log('🔔 Alerts Controller inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando Alerts Controller:', error);
            this.generateMockAlerts();
            this.isInitialized = true;
        }
    }
    
    // ==========================================
    // PROCESAMIENTO DE ALERTAS
    // ==========================================
    
    processAlerts(alerts) {
        try {
            // Validar y procesar alertas
            var processedAlerts = alerts
                .filter(function(alert) { return alert && typeof alert === 'object'; })
                .map(function(alert) {
                    return {
                        id: alert.id || alert._id || Date.now().toString(),
                        type: this.validateType(alert.type),
                        title: this.sanitizeText(alert.title || 'Alerta'),
                        message: this.sanitizeText(alert.message || ''),
                        timestamp: alert.timestamp || Date.now(),
                        read: alert.read === true
                    };
                }.bind(this))
                .sort(function(a, b) { return b.timestamp - a.timestamp; });
            
            // Prevenir duplicados
            var uniqueAlerts = this.removeDuplicates(processedAlerts);
            
            // Limitar cantidad
            if (uniqueAlerts.length > 100) {
                this.alerts = uniqueAlerts.slice(0, 100);
            } else {
                this.alerts = uniqueAlerts;
            }
            
            // Aplicar filtro actual
            this.applyFilter(this.currentFilter);
            
            // Actualizar UI
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Error procesando alertas:', error);
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
    
    removeDuplicates(alerts) {
        var seen = {};
        return alerts.filter(function(alert) {
            var key = alert.type + '-' + alert.message + '-' + Math.floor(alert.timestamp / 60000);
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }
    
    // ==========================================
    // FILTROS
    // ==========================================
    
    applyFilter(filter) {
        this.currentFilter = filter;
        var alerts = this.alerts;
        
        switch(filter) {
            case 'all':
                this.filteredAlerts = alerts;
                break;
            case 'unread':
                this.filteredAlerts = alerts.filter(function(a) { return !a.read; });
                break;
            case 'read':
                this.filteredAlerts = alerts.filter(function(a) { return a.read; });
                break;
            case 'danger':
                this.filteredAlerts = alerts.filter(function(a) { return a.type === 'danger'; });
                break;
            case 'warning':
                this.filteredAlerts = alerts.filter(function(a) { return a.type === 'warning'; });
                break;
            case 'info':
                this.filteredAlerts = alerts.filter(function(a) { return a.type === 'info'; });
                break;
            default:
                this.filteredAlerts = alerts;
        }
        
        this.updateUI();
    }
    
    // ==========================================
    // UI UPDATES
    // ==========================================
    
    updateUI() {
        // Actualizar contadores
        this.updateCounts();
        
        // Actualizar lista si está visible
        var alertContainer = document.getElementById('alertsContainer');
        var alertSection = document.getElementById('alertas');
        
        if (alertContainer && alertSection && alertSection.classList.contains('active')) {
            this.renderAlertsList();
        }
    }
    
    updateCounts() {
        var unreadCount = 0;
        for (var i = 0; i < this.alerts.length; i++) {
            if (!this.alerts[i].read) unreadCount++;
        }
        
        // Actualizar badge en sidebar
        var badge = document.getElementById('alertBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        }
        
        // Actualizar dot en header
        var dot = document.getElementById('notificationDot');
        if (dot) {
            if (unreadCount > 0) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        }
    }
    
    renderAlertsList() {
        var container = document.getElementById('alertsContainer');
        if (!container) return;
        
        try {
            var alerts = this.filteredAlerts || this.alerts;
            
            if (alerts.length === 0) {
                container.innerHTML = 
                    '<div class="alert-placeholder">' +
                        '<i class="fas fa-check-circle"></i>' +
                        '<p>' + (this.currentFilter === 'all' ? 'No hay alertas registradas' : 'No hay alertas con este filtro') + '</p>' +
                    '</div>';
                return;
            }
            
            // Mostrar máximo 20 alertas
            var displayAlerts = alerts.slice(0, 20);
            var html = '';
            
            for (var i = 0; i < displayAlerts.length; i++) {
                var alert = displayAlerts[i];
                var icon = this.getAlertIcon(alert.type);
                var typeLabel = this.getTypeLabel(alert.type);
                var time = this.formatTime(alert.timestamp);
                var badge = !alert.read ? '<span class="badge" style="position:static;">Nuevo</span>' : '';
                var readClass = alert.read ? 'read' : '';
                
                html += 
                    '<div class="alert-item ' + readClass + '" data-id="' + alert.id + '">' +
                        '<div class="alert-icon ' + alert.type + '">' +
                            '<i class="fas ' + icon + '"></i>' +
                        '</div>' +
                        '<div class="alert-content">' +
                            '<p><strong>' + typeLabel + '</strong> ' + alert.title + '</p>' +
                            '<p style="font-size:13px;color:var(--gray-500);margin-top:2px;">' + alert.message + '</p>' +
                            '<span class="alert-time">' + time + '</span>' +
                        '</div>' +
                        '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
                            badge +
                            '<span style="font-size:11px;color:var(--gray-400);cursor:pointer;" onclick="event.stopPropagation();">' +
                                '<i class="fas fa-times"></i>' +
                            '</span>' +
                        '</div>' +
                    '</div>';
            }
            
            container.innerHTML = html;
            
            // Agregar event listeners a los items
            var items = container.querySelectorAll('.alert-item');
            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                item.addEventListener('click', function(e) {
                    var id = this.dataset.id;
                    this.toggleRead(id);
                }.bind(this));
                
                var deleteBtn = item.querySelector('.fa-times');
                if (deleteBtn) {
                    deleteBtn.parentElement.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var id = this.closest('.alert-item').dataset.id;
                        this.deleteAlert(id);
                    }.bind(this));
                }
            }
            
        } catch (error) {
            console.error('❌ Error renderizando alertas:', error);
        }
    }
    
    // ==========================================
    // ACCIONES DE ALERTAS
    // ==========================================
    
    toggleRead(alertId) {
        for (var i = 0; i < this.alerts.length; i++) {
            if (this.alerts[i].id === alertId) {
                this.alerts[i].read = !this.alerts[i].read;
                break;
            }
        }
        
        // Actualizar en Firebase
        try {
            if (typeof FirebaseService !== 'undefined' && FirebaseService.database) {
                FirebaseService.database.ref('alerts/' + alertId).update({
                    read: this.alerts[i].read
                }).catch(function() {});
            }
        } catch (error) {
            // Silenciar error
        }
        
        this.updateCounts();
        this.renderAlertsList();
    }
    
    markAllAsRead() {
        for (var i = 0; i < this.alerts.length; i++) {
            this.alerts[i].read = true;
            
            // Actualizar en Firebase
            try {
                if (typeof FirebaseService !== 'undefined' && FirebaseService.database) {
                    FirebaseService.database.ref('alerts/' + this.alerts[i].id).update({
                        read: true
                    }).catch(function() {});
                }
            } catch (error) {
                // Silenciar error
            }
        }
        
        this.updateCounts();
        this.renderAlertsList();
        this.showToast('✅ Todas las alertas marcadas como leídas');
    }
    
    deleteAlert(alertId) {
        if (!confirm('¿Eliminar esta alerta?')) return;
        
        this.alerts = this.alerts.filter(function(a) { return a.id !== alertId; });
        this.filteredAlerts = this.filteredAlerts.filter(function(a) { return a.id !== alertId; });
        
        // Eliminar en Firebase
        try {
            if (typeof FirebaseService !== 'undefined' && FirebaseService.database) {
                FirebaseService.database.ref('alerts/' + alertId).remove().catch(function() {});
            }
        } catch (error) {
            // Silenciar error
        }
        
        this.updateCounts();
        this.renderAlertsList();
        this.showToast('🗑️ Alerta eliminada');
    }
    
    clearAllAlerts() {
        if (!confirm('¿Eliminar todas las alertas?')) return;
        
        this.alerts = [];
        this.filteredAlerts = [];
        
        // Eliminar en Firebase
        try {
            if (typeof FirebaseService !== 'undefined' && FirebaseService.database) {
                FirebaseService.database.ref('alerts').remove().catch(function() {});
            }
        } catch (error) {
            // Silenciar error
        }
        
        this.updateCounts();
        this.renderAlertsList();
        this.showToast('🗑️ Todas las alertas eliminadas');
    }

    addAlert(type, title, message) {
        try {
            const now = Date.now();
            const alert = {
                id: now.toString(),
                type: type,
                title: title,
                message: message,
                timestamp: now,
                read: false
            };
            
            // Verificar duplicados
            const exists = this.alerts.some(a => 
                a.message === message && 
                (now - a.timestamp) < 120000
            );
            
            if (exists) return;
            
            this.alerts.unshift(alert);
            
            if (this.alerts.length > 100) {
                this.alerts = this.alerts.slice(0, 100);
            }
            
            // Guardar en Firebase
            try {
                if (typeof FirebaseService !== 'undefined') {
                    FirebaseService.saveAlert({
                        type: type,
                        title: title,
                        message: message
                    }).catch(() => {});
                }
            } catch (error) {}
            
            this.updateUI();
            this.showToast(`${title}: ${message}`, type);
            
        } catch (error) {
            console.error('❌ Error agregando alerta:', error);
        }
    }

    showToast(message, type) {
        type = type || 'info';
        var existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        var color = type === 'danger' ? '#EF4444' : 
                    type === 'warning' ? '#F59E0B' : 
                    type === 'success' ? '#10B981' : '#3B82F6';
        
        var icon = type === 'danger' ? 'fa-exclamation-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 
                type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        
        var toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = 
            '<div style="display:flex;align-items:center;gap:10px;padding:12px 20px;background:#1E293B;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);border-left:4px solid ' + color + ';color:#F8FAFC;">' +
                '<i class="fas ' + icon + '" style="color:' + color + ';"></i>' +
                '<span>' + message + '</span>' +
                '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94A3B8;font-size:16px;">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>';
        
        toast.style.cssText = 
            'position:fixed;bottom:20px;right:20px;z-index:10001;animation:slideUp 0.3s ease;max-width:400px;';
        
        document.body.appendChild(toast);
        
        setTimeout(function() {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() { toast.remove(); }, 300);
            }
        }, 4000);
    }
    
    // ==========================================
    // UTILIDADES
    // ==========================================
    
    getTypeLabel(type) {
        var labels = {
            danger: '🚨',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✅'
        };
        return labels[type] || '📢';
    }
    
    getAlertIcon(type) {
        var icons = {
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };
        return icons[type] || 'fa-bell';
    }
    
    formatTime(timestamp) {
        if (!timestamp) return 'Hace un momento';
        try {
            var date = new Date(timestamp);
            var now = new Date();
            var diff = Math.floor((now - date) / 1000);
            
            if (diff < 60) return 'Hace un momento';
            if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + ' min';
            if (diff < 86400) return 'Hace ' + Math.floor(diff / 3600) + ' h';
            if (diff < 604800) return 'Hace ' + Math.floor(diff / 86400) + ' días';
            return date.toLocaleString('es-ES', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha desconocida';
        }
    }
    
    // ==========================================
    // UI SETUP
    // ==========================================
    
    setupUIListeners() {
        // Botón para marcar todas como leídas
        var markAllBtn = document.getElementById('markAllRead');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', this.markAllAsRead.bind(this));
        }
        
        // Botón para limpiar todas
        var clearAllBtn = document.getElementById('clearAllAlerts');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', this.clearAllAlerts.bind(this));
        }
        
        // Filtros
        var filterButtons = document.querySelectorAll('.alert-filter-btn');
        for (var i = 0; i < filterButtons.length; i++) {
            var btn = filterButtons[i];
            btn.addEventListener('click', function() {
                var buttons = document.querySelectorAll('.alert-filter-btn');
                for (var j = 0; j < buttons.length; j++) {
                    buttons[j].classList.remove('active');
                }
                this.classList.add('active');
                this.applyFilter(this.dataset.filter);
            }.bind(this));
        }
        
        // Notificación icon click
        var notificationIcon = document.querySelector('.notification-icon');
        if (notificationIcon) {
            notificationIcon.addEventListener('click', function() {
                var alertLink = document.querySelector('a[href="#alertas"]');
                if (alertLink) alertLink.click();
            });
        }
    }
    
    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    
    showToast(message, type) {
        type = type || 'info';
        var existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        var color = type === 'danger' ? '#EF4444' : 
                    type === 'warning' ? '#F59E0B' : 
                    type === 'success' ? '#10B981' : '#3B82F6';
        
        var icon = type === 'danger' ? 'fa-exclamation-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 
                    type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        
        var toast = document.createElement('div');
        toast.className = 'toast-notification ' + type;
        toast.innerHTML = 
            '<div style="display:flex;align-items:center;gap:10px;padding:12px 20px;background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-left:4px solid ' + color + ';">' +
                '<i class="fas ' + icon + '" style="color:' + color + ';"></i>' +
                '<span>' + message + '</span>' +
                '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:16px;">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>';
        
        toast.style.cssText = 
            'position: fixed;' +
            'bottom: 20px;' +
            'right: 20px;' +
            'z-index: 10000;' +
            'animation: slideUp 0.3s ease;' +
            'max-width: 400px;';
        
        document.body.appendChild(toast);
        
        setTimeout(function() {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() { toast.remove(); }, 300);
            }
        }, 4000);
    }
    
    // ==========================================
    // MOCK DATA
    // ==========================================
    
    generateMockAlerts() {
        var now = Date.now();
        var mockAlerts = [
            {
                id: '1',
                type: 'danger',
                title: 'Temperatura Crítica',
                message: 'La temperatura ha alcanzado 12.5°C',
                timestamp: now - 120000,
                read: false
            },
            {
                id: '2',
                type: 'warning',
                title: 'Puerta Abierta',
                message: 'La puerta de la cámara lleva 5 minutos abierta',
                timestamp: now - 300000,
                read: true
            },
            {
                id: '3',
                type: 'info',
                title: 'Sistema Iniciado',
                message: 'El sistema se ha reiniciado correctamente',
                timestamp: now - 3600000,
                read: true
            },
            {
                id: '4',
                type: 'warning',
                title: 'Nivel de Gas Elevado',
                message: 'Se ha detectado un nivel de gas de 250 ppm',
                timestamp: now - 7200000,
                read: true
            }
        ];
        
        this.alerts = mockAlerts;
        this.applyFilter(this.currentFilter);
        this.updateUI();
    }
    
    // ==========================================
    // LIMPIEZA
    // ==========================================
    
    destroy() {
        // Limpiar listener de Firebase
        if (this._alertListener && typeof this._alertListener === 'function') {
            try {
                this._alertListener();
            } catch (error) {
                // Silenciar error
            }
        }
        
        // Limpiar datos
        this.alerts = [];
        this.filteredAlerts = [];
        this.isInitialized = false;
        
        console.log('🧹 Alerts Controller limpiado');
    }
}

// ==========================================
// INSTANCIAR Y EXPORTAR
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    try {
        window.alertsController = new AlertsController();
        
        window.addEventListener('beforeunload', function() {
            if (window.alertsController && typeof window.alertsController.destroy === 'function') {
                window.alertsController.destroy();
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando Alerts Controller:', error);
    }
});

// Agregar estilos para toast y animaciones
var style = document.createElement('style');
style.textContent = 
    '@keyframes slideUp {' +
        'from { opacity: 0; transform: translateY(20px); }' +
        'to { opacity: 1; transform: translateY(0); }' +
    '}' +
    '.toast-notification { animation: slideUp 0.3s ease; }' +
    '.alert-item { cursor: pointer; transition: background 0.2s; }' +
    '.alert-item:hover { background: rgba(255,255,255,0.05); }' +
    '.alert-item.read { opacity: 0.7; }' +
    '.alert-item.read .alert-content p { color: var(--gray-500); }' +
    '.alert-filter-btn { padding: 4px 12px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s; color: var(--text-muted); }' +
    '.alert-filter-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }' +
    '.alert-filter-btn.active { background: var(--primary); color: white; border-color: var(--primary); }';
document.head.appendChild(style);