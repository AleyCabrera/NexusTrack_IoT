/**
 * ==========================================
 * SMART MONITOR - CONFIG CONTROLLER
 * ==========================================
 * 
 * Archivo: controllers/config-controller.js
 * Propósito: Controlador de configuración del sistema
 * 
 * Este archivo maneja:
 * - Configuración de umbrales
 * - Horarios de seguridad
 * - Preferencias de usuario
 * - Sincronización con Firebase
 * 
 * @module controllers/config-controller
 * @version 2.0.0
 */

class ConfigController {
    constructor() {
        this.config = {
            temperature: {
                min: -5,
                max: 10
            },
            humidity: {
                max: 85
            },
            gas: {
                max: 200
            },
            door: {
                maxOpenTime: 300
            },
            security: {
                startTime: '22:00',
                endTime: '06:00'
            },
            alerts: {
                sound: true,
                push: true,
                email: false
            }
        };
        
        this.isInitialized = false;
        this.listeners = [];
        this.defaultConfig = JSON.parse(JSON.stringify(this.config));
        
        this.init();
    }
    
    init() {
        try {
            console.log('⚙️ Inicializando Config Controller...');
            
            // Cargar configuración guardada
            this.loadConfig();
            
            // Configurar listeners de Firebase
            this.setupFirebaseListeners();
            
            // Configurar UI
            this.setupUI();
            
            this.isInitialized = true;
            console.log('✅ Config Controller inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando Config Controller:', error);
        }
    }
    
    // ==========================================
    // CARGA Y GUARDADO
    // ==========================================
    
    loadConfig() {
        try {
            // Cargar de localStorage
            var saved = localStorage.getItem('smartmonitor_config');
            if (saved) {
                var parsed = JSON.parse(saved);
                this.config = this.mergeConfig(this.config, parsed);
                console.log('📂 Configuración cargada de localStorage');
            }
            
            // Cargar de Firebase
            this.loadFromFirebase();
            
        } catch (error) {
            console.warn('⚠️ No se pudo cargar configuración:', error);
        }
    }
    
    saveConfig() {
        try {
            // Guardar en localStorage
            localStorage.setItem('smartmonitor_config', JSON.stringify(this.config));
            
            // Guardar en Firebase
            this.saveToFirebase();
            
            console.log('💾 Configuración guardada');
            this.showToast('✅ Configuración guardada correctamente');
            
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            this.showToast('❌ Error al guardar configuración', 'danger');
        }
    }
    
    mergeConfig(defaultConfig, newConfig) {
        var result = JSON.parse(JSON.stringify(defaultConfig));
        
        for (var key in newConfig) {
            if (result[key] && typeof result[key] === 'object') {
                for (var subKey in newConfig[key]) {
                    if (result[key][subKey] !== undefined) {
                        result[key][subKey] = newConfig[key][subKey];
                    }
                }
            }
        }
        
        return result;
    }
    
    // ==========================================
    // FIREBASE
    // ==========================================
    
    setupFirebaseListeners() {
        try {
            const fb = window.FirebaseService;
            if (!fb) {
                console.warn('⚠️ FirebaseService no disponible');
                return;
            }
            
            // Escuchar cambios en configuración
            const listener = fb.onConfigUpdate(this.handleConfigUpdate.bind(this));
            if (listener) this.listeners.push(listener);
            
        } catch (error) {
            console.error('❌ Error configurando listeners de configuración:', error);
        }
    }
    
    handleConfigUpdate(config) {
        try {
            if (!config || typeof config !== 'object') return;
            
            var updated = false;
            
            // Actualizar configuración
            for (var key in config) {
                if (this.config[key] && typeof this.config[key] === 'object') {
                    for (var subKey in config[key]) {
                        if (this.config[key][subKey] !== undefined) {
                            this.config[key][subKey] = config[key][subKey];
                            updated = true;
                        }
                    }
                }
            }
            
            if (updated) {
                this.saveConfig();
                this.updateUI();
                this.showToast('📥 Configuración actualizada desde Firebase');
            }
            
        } catch (error) {
            console.error('❌ Error procesando configuración:', error);
        }
    }
    
    loadFromFirebase() {
        try {
            const fb = window.FirebaseService;
            if (!fb) return;
            
            fb.getData('configuration').then(function(data) {
                if (data && typeof data === 'object') {
                    this.handleConfigUpdate(data);
                }
            }.bind(this)).catch(function() {});
            
        } catch (error) {
            // Silenciar error
        }
    }
    
    saveToFirebase() {
        try {
            const fb = window.FirebaseService;
            if (!fb) return;
            
            fb.setData('configuration', this.config).catch(function() {});
            
        } catch (error) {
            // Silenciar error
        }
    }
    
    // ==========================================
    // UI SETUP
    // ==========================================
    
    setupUI() {
        // Rellenar formularios
        this.populateForm();
        
        // Configurar eventos
        this.setupFormEvents();
        
        // Botón de guardar
        var saveBtn = document.getElementById('saveConfig');
        if (saveBtn) {
            saveBtn.addEventListener('click', this.saveConfig.bind(this));
        }
        
        // Botón de reset
        var resetBtn = document.getElementById('resetConfig');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetConfig.bind(this));
        }
        
        // Actualizar cada 30 segundos
        setInterval(this.updateUI.bind(this), 30000);
    }
    
    populateForm() {
        // Temperatura
        var tempMin = document.getElementById('tempMin');
        var tempMax = document.getElementById('tempMax');
        if (tempMin) tempMin.value = this.config.temperature.min;
        if (tempMax) tempMax.value = this.config.temperature.max;
        
        // Humedad
        var humMax = document.getElementById('humMax');
        if (humMax) humMax.value = this.config.humidity.max;
        
        // Gas
        var gasMax = document.getElementById('gasMax');
        if (gasMax) gasMax.value = this.config.gas.max;
        
        // Puerta
        var doorTime = document.getElementById('doorMaxOpenTime');
        if (doorTime) doorTime.value = this.config.door.maxOpenTime;
        
        // Seguridad
        var secStart = document.getElementById('secStart');
        var secEnd = document.getElementById('secEnd');
        if (secStart) secStart.value = this.config.security.startTime;
        if (secEnd) secEnd.value = this.config.security.endTime;
        
        // Alertas
        var soundAlert = document.getElementById('soundAlert');
        var pushAlert = document.getElementById('pushAlert');
        var emailAlert = document.getElementById('emailAlert');
        if (soundAlert) soundAlert.checked = this.config.alerts.sound;
        if (pushAlert) pushAlert.checked = this.config.alerts.push;
        if (emailAlert) emailAlert.checked = this.config.alerts.email;
    }
    
    setupFormEvents() {
        var form = document.getElementById('configForm');
        if (form) {
            form.addEventListener('change', this.handleFormChange.bind(this));
        }
    }
    
    handleFormChange(event) {
        var target = event.target;
        var value = target.type === 'checkbox' ? target.checked : parseFloat(target.value);
        
        // Mapear campos a configuración
        var map = {
            'tempMin': ['temperature', 'min'],
            'tempMax': ['temperature', 'max'],
            'humMax': ['humidity', 'max'],
            'gasMax': ['gas', 'max'],
            'doorMaxOpenTime': ['door', 'maxOpenTime'],
            'secStart': ['security', 'startTime'],
            'secEnd': ['security', 'endTime'],
            'soundAlert': ['alerts', 'sound'],
            'pushAlert': ['alerts', 'push'],
            'emailAlert': ['alerts', 'email']
        };
        
        var path = map[target.id];
        if (path) {
            this.config[path[0]][path[1]] = value;
            
            // Si es un campo de tiempo, asegurar formato
            if (path[1] === 'startTime' || path[1] === 'endTime') {
                this.config[path[0]][path[1]] = this.formatTimeString(value);
            }
        }
    }
    
    formatTimeString(value) {
        // Asegurar formato HH:MM
        if (typeof value === 'string') {
            var parts = value.split(':');
            if (parts.length === 2) {
                var hours = String(parseInt(parts[0])).padStart(2, '0');
                var minutes = String(parseInt(parts[1])).padStart(2, '0');
                return hours + ':' + minutes;
            }
        }
        return value;
    }
    
    // ==========================================
    // ACCIONES
    // ==========================================
    
    resetConfig() {
        if (!confirm('¿Restaurar configuración por defecto?')) return;
        
        this.config = JSON.parse(JSON.stringify(this.defaultConfig));
        this.saveConfig();
        this.populateForm();
        this.updateUI();
        this.showToast('🔄 Configuración restaurada');
    }
    
    // ==========================================
    // UI UPDATES
    // ==========================================
    
    updateUI() {
        // Actualizar valores mostrados en la UI
        var elements = {
            'displayTempMin': this.config.temperature.min + '°C',
            'displayTempMax': this.config.temperature.max + '°C',
            'displayHumMax': this.config.humidity.max + '%',
            'displayGasMax': this.config.gas.max + ' ppm',
            'displayDoorTime': this.config.door.maxOpenTime + 's',
            'displaySecStart': this.config.security.startTime,
            'displaySecEnd': this.config.security.endTime
        };
        
        for (var id in elements) {
            var el = document.getElementById(id);
            if (el) {
                el.textContent = elements[id];
            }
        }
    }
    
    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    
    showToast(message, type) {
        type = type || 'info';
        var existing = document.querySelector('.config-toast');
        if (existing) existing.remove();
        
        var color = type === 'danger' ? '#EF4444' : 
                    type === 'warning' ? '#F59E0B' : 
                    type === 'success' ? '#10B981' : '#3B82F6';
        
        var icon = type === 'danger' ? 'fa-exclamation-circle' : 
                   type === 'warning' ? 'fa-exclamation-triangle' : 
                   type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        
        var toast = document.createElement('div');
        toast.className = 'config-toast';
        toast.innerHTML = 
            '<div style="display:flex;align-items:center;gap:10px;padding:12px 20px;background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-left:4px solid ' + color + ';">' +
                '<i class="fas ' + icon + '" style="color:' + color + ';"></i>' +
                '<span>' + message + '</span>' +
                '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:16px;">' +
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
    // LIMPIEZA
    // ==========================================
    
    destroy() {
        this.listeners.forEach(function(listener) {
            if (listener && typeof listener === 'function') {
                try { listener(); } catch (error) {}
            }
        });
        this.listeners = [];
        this.isInitialized = false;
        console.log('🧹 Config Controller limpiado');
    }
}

// ==========================================
// INSTANCIAR
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    try {
        window.configController = new ConfigController();
        
        window.addEventListener('beforeunload', function() {
            if (window.configController && typeof window.configController.destroy === 'function') {
                window.configController.destroy();
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando Config Controller:', error);
    }
});