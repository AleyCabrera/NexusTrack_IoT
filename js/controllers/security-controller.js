/**
 * ==========================================
 * SMART MONITOR - SECURITY CONTROLLER
 * ==========================================
 * 
 * Archivo: controllers/security-controller.js
 * Propósito: Controlador de seguridad y vigilancia
 * 
 * Este archivo maneja:
 * - Detección de movimiento (PIR)
 * - Sistema de armado/desarmado
 * - Horarios de vigilancia
 * - Registro de eventos
 * - Alertas de seguridad
 * 
 * @module controllers/security-controller
 * @version 2.0.0
 */

class SecurityController {
    constructor() {
        this.data = {
            armed: false,
            motion: 0,
            startTime: '22:00',
            endTime: '06:00',
            status: 'disarmed',
            lastMotion: null,
            timestamp: null
        };
        
        this.events = [];
        this.maxEvents = 100;
        this.isInitialized = false;
        this.listeners = [];
        this.alertCooldown = {};
        this.isInSchedule = false;
        
        // Cargar configuración
        this.loadConfig();
        
        this.init();
    }
    
    init() {
        try {
            console.log('🔒 Inicializando Security Controller...');
            
            // Configurar listeners de Firebase
            this.setupFirebaseListeners();
            
            // Configurar UI
            this.setupUI();
            
            // Verificar estado inicial
            this.checkSchedule();
            
            this.isInitialized = true;
            console.log('✅ Security Controller inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando Security Controller:', error);
        }
    }
    
    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    
    loadConfig() {
        try {
            var saved = localStorage.getItem('smartmonitor_security');
            if (saved) {
                var config = JSON.parse(saved);
                if (config.startTime) this.data.startTime = config.startTime;
                if (config.endTime) this.data.endTime = config.endTime;
            }
        } catch (error) {
            console.warn('⚠️ No se pudo cargar configuración de seguridad:', error);
        }
    }
    
    saveConfig() {
        try {
            localStorage.setItem('smartmonitor_security', JSON.stringify({
                startTime: this.data.startTime,
                endTime: this.data.endTime
            }));
        } catch (error) {
            console.warn('⚠️ No se pudo guardar configuración de seguridad:', error);
        }
    }
    
    // ==========================================
    // FIREBASE LISTENERS
    // ==========================================
    
    setupFirebaseListeners() {
        try {
            const fb = window.FirebaseService;
            if (!fb) {
                console.warn('⚠️ FirebaseService no disponible');
                return;
            }
            
            // Escuchar datos de sensores (incluye PIR)
            const listener = fb.onSensorData(this.handleSensorData.bind(this));
            if (listener) this.listeners.push(listener);
            
            // Escuchar configuración de seguridad
            const configListener = fb.onSecurityConfig(this.handleConfigUpdate.bind(this));
            if (configListener) this.listeners.push(configListener);
            
        } catch (error) {
            console.error('❌ Error configurando listeners de seguridad:', error);
        }
    }
    
    handleSensorData(data) {
        try {
            if (!data || typeof data !== 'object') return;
            
            // Detectar movimiento
            if (data.motion !== undefined && data.motion !== null) {
                var motion = data.motion === 1 || data.motion === true;
                this.data.motion = motion ? 1 : 0;
                this.data.timestamp = data.timestamp || Date.now();
                
                // Registrar evento si hay movimiento y el sistema está armado
                if (motion) {
                    this.handleMotionDetected();
                }
            }
            
            // Actualizar UI
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Error procesando datos de seguridad:', error);
        }
    }
    
    handleConfigUpdate(config) {
        try {
            if (!config || typeof config !== 'object') return;
            
            if (config.startTime) {
                this.data.startTime = config.startTime;
            }
            if (config.endTime) {
                this.data.endTime = config.endTime;
            }
            if (config.armed !== undefined) {
                this.data.armed = config.armed === true;
            }
            
            this.saveConfig();
            this.checkSchedule();
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Error procesando configuración de seguridad:', error);
        }
    }
    
    // ==========================================
    // DETECCIÓN DE MOVIMIENTO
    // ==========================================
    
    handleMotionDetected() {
        var now = Date.now();
        this.data.lastMotion = now;
        
        // Verificar si está en horario de vigilancia
        var inSchedule = this.isInSchedule;
        
        // Registrar evento
        var event = {
            id: now,
            timestamp: now,
            type: 'motion',
            armed: this.data.armed,
            inSchedule: inSchedule,
            status: 'detected'
        };
        
        this.events.unshift(event);
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }
        
        // Mostrar en UI
        this.showMotionAlert();
        
        // Generar alerta si está armado y en horario
        if (this.data.armed && inSchedule) {
            this.triggerSecurityAlert(event);
        }
        
        // Actualizar UI
        this.updateUI();
        this.updateEventsUI();
    }
    
    triggerSecurityAlert(event) {
        try {
            var time = new Date(event.timestamp);
            var timeStr = time.getHours() + ':' + 
                         String(time.getMinutes()).padStart(2, '0');
            
            var message = 'Movimiento detectado a las ' + timeStr;
            
            this.addAlert('danger', '🚨 ALERTA DE SEGURIDAD', message);
            
            // Sonido de alarma
            this.playAlarmSound();
            
            // Notificación
            this.showSecurityNotification('🚨 Alarma de Seguridad', message);
            
        } catch (error) {
            console.error('❌ Error activando alerta de seguridad:', error);
        }
    }
    
    // ==========================================
    // HORARIO DE VIGILANCIA
    // ==========================================
    
    checkSchedule() {
        try {
            var now = new Date();
            var currentHour = now.getHours();
            var currentMinute = now.getMinutes();
            var currentTime = currentHour * 60 + currentMinute;
            
            var startParts = this.data.startTime.split(':');
            var endParts = this.data.endTime.split(':');
            
            var startTime = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            var endTime = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
            
            // Verificar si está dentro del horario
            if (startTime < endTime) {
                this.isInSchedule = currentTime >= startTime && currentTime < endTime;
            } else {
                // Cruza la medianoche
                this.isInSchedule = currentTime >= startTime || currentTime < endTime;
            }
            
            // Actualizar estado
            this.data.status = this.isInSchedule ? 'armed' : 'disarmed';
            
            // Actualizar UI
            this.updateScheduleUI();
            
        } catch (error) {
            console.error('❌ Error verificando horario:', error);
        }
    }
    
    // ==========================================
    // ACCIONES DE SEGURIDAD
    // ==========================================
    
    arm() {
        this.data.armed = true;
        this.saveConfig();
        this.updateUI();
        
        // Mostrar notificación
        this.showSecurityNotification('🔒 Sistema Armado', 
            'El sistema de seguridad ha sido activado');
        
        // Guardar en Firebase
        this.saveToFirebase('armed', true);
    }
    
    disarm() {
        this.data.armed = false;
        this.saveConfig();
        this.updateUI();
        
        // Mostrar notificación
        this.showSecurityNotification('🔓 Sistema Desarmado', 
            'El sistema de seguridad ha sido desactivado');
        
        // Guardar en Firebase
        this.saveToFirebase('armed', false);
    }
    
    toggleArm() {
        if (this.data.armed) {
            this.disarm();
        } else {
            this.arm();
        }
    }
    
    // ==========================================
    // UI UPDATES
    // ==========================================
    
    setupUI() {
        // Actualizar cada minuto para verificar horario
        setInterval(this.checkSchedule.bind(this), 60000);
        
        // Actualizar cada 5 segundos
        setInterval(this.updateUI.bind(this), 5000);
    }
    
    updateUI() {
        try {
            this.updateStatusUI();
            this.updateMotionUI();
            this.updateScheduleUI();
        } catch (error) {
            console.error('❌ Error actualizando UI de seguridad:', error);
        }
    }
    
    updateStatusUI() {
        var statusEl = document.getElementById('securityStatus');
        if (!statusEl) return;
        
        var status = this.data.armed && this.isInSchedule ? 'armed' : 'disarmed';
        var statusText = '';
        var statusClass = '';
        
        if (status === 'armed') {
            statusText = '🔒 Armado';
            statusClass = 'status-label danger';
        } else if (this.data.armed) {
            statusText = '⏳ Esperando horario';
            statusClass = 'status-label warning';
        } else {
            statusText = '🔓 Desarmado';
            statusClass = 'status-label normal';
        }
        
        statusEl.textContent = statusText;
        statusEl.className = statusClass;
    }
    
    updateMotionUI() {
        var motionEl = document.getElementById('motionStatus');
        if (!motionEl) return;
        
        if (this.data.motion === 1) {
            motionEl.textContent = '🔴 Movimiento detectado';
            motionEl.className = 'status-label danger';
            motionEl.style.animation = 'pulse-danger 1s ease-in-out infinite';
        } else {
            motionEl.textContent = '🟢 Sin movimiento';
            motionEl.className = 'status-label normal';
            motionEl.style.animation = '';
        }
    }
    
    updateScheduleUI() {
        var scheduleEl = document.getElementById('securitySchedule');
        if (!scheduleEl) return;
        
        var status = this.isInSchedule ? '🟢 Activo' : '⏳ Inactivo';
        var timeStr = this.data.startTime + ' - ' + this.data.endTime;
        
        scheduleEl.textContent = status + ' (' + timeStr + ')';
        scheduleEl.className = this.isInSchedule ? 'status-label warning' : 'status-label normal';
    }
    
    updateEventsUI() {
        var container = document.getElementById('securityEvents');
        if (!container) return;
        
        if (this.events.length === 0) {
            container.innerHTML = 
                '<div class="event-placeholder">' +
                    '<i class="fas fa-shield-alt"></i>' +
                    '<p>No hay eventos registrados</p>' +
                '</div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < Math.min(this.events.length, 10); i++) {
            var event = this.events[i];
            var time = this.formatTime(event.timestamp);
            var icon = event.type === 'motion' ? 'fa-running' : 'fa-info-circle';
            var color = event.armed && event.inSchedule ? 'danger' : 'info';
            
            html += 
                '<div class="event-item">' +
                    '<div class="event-icon ' + color + '">' +
                        '<i class="fas ' + icon + '"></i>' +
                    '</div>' +
                    '<div class="event-content">' +
                        '<p><strong>' + time + '</strong> - Movimiento detectado</p>' +
                        '<span class="event-status">' + 
                            (event.armed && event.inSchedule ? '🚨 Alerta' : 'ℹ️ Registrado') +
                        '</span>' +
                    '</div>' +
                '</div>';
        }
        
        container.innerHTML = html;
    }
    
    showMotionAlert() {
        // Mostrar notificación visual en la UI
        var alertContainer = document.getElementById('motionAlert');
        if (alertContainer) {
            alertContainer.style.display = 'block';
            alertContainer.style.animation = 'slideIn 0.3s ease';
            
            setTimeout(function() {
                alertContainer.style.display = 'none';
            }, 5000);
        }
    }
    
    // ==========================================
    // ALERTAS Y NOTIFICACIONES
    // ==========================================
    
    addAlert(type, title, message) {
        try {
            const alertKey = 'security-' + type + '-' + message;
            const now = Date.now();
            
            if (this.alertCooldown[alertKey] && 
                (now - this.alertCooldown[alertKey]) < 300000) { // 5 minutos
                return;
            }
            
            this.alertCooldown[alertKey] = now;
            
            if (window.alertsController) {
                window.alertsController.addAlert(type, title, message);
            } else if (window.dashboard) {
                window.dashboard.addAlert(type, title, message);
            }
            
        } catch (error) {
            console.error('❌ Error agregando alerta de seguridad:', error);
        }
    }
    
    playAlarmSound() {
        try {
            var audio = new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFg==');
            audio.volume = 0.5;
            audio.play().catch(function() {});
        } catch (error) {
            // Silenciar error
        }
    }
    
    showSecurityNotification(title, message) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🔒 ' + title, {
                    body: message,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔒</text></svg>',
                    requireInteraction: true
                });
            }
        } catch (error) {}
    }
    
    // ==========================================
    // FIREBASE
    // ==========================================
    
    saveToFirebase(path, value) {
        try {
            const fb = window.FirebaseService;
            if (!fb) return;
            
            fb.setData('security/' + path, value).catch(function() {});
        } catch (error) {
            // Silenciar error
        }
    }
    
    // ==========================================
    // UTILIDADES
    // ==========================================
    
    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        try {
            var date = new Date(timestamp);
            return date.getHours() + ':' + 
                   String(date.getMinutes()).padStart(2, '0') + ':' +
                   String(date.getSeconds()).padStart(2, '0');
        } catch (error) {
            return '--:--';
        }
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
        this.events = [];
        this.isInitialized = false;
        console.log('🧹 Security Controller limpiado');
    }
}

// ==========================================
// INSTANCIAR
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    try {
        window.securityController = new SecurityController();
        
        window.addEventListener('beforeunload', function() {
            if (window.securityController && typeof window.securityController.destroy === 'function') {
                window.securityController.destroy();
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando Security Controller:', error);
    }
});