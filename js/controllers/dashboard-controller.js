/**
 * ==========================================
 * NexusTrack IoT - DASHBOARD CONTROLLER
 * ==========================================
 */

class DashboardController {
    constructor() {
        this.data = {
            temperature: null,
            humidity: null,
            gas: null,
            door: null,
            timestamp: null
        };
        
        this.alerts = [];
        this.isInitialized = false;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.alertCooldown = {};
        this.listeners = [];
        this._doorOpenTime = null;
        
        this.handleSensorData = this.handleSensorData.bind(this);
        this.handleAlerts = this.handleAlerts.bind(this);
        
        console.log('🔹 DashboardController constructor llamado');
        this.init();
    }
    
    init() {
        console.log('🔹 DashboardController.init() iniciado');
        
        try {
            // Verificar FirebaseService
            if (typeof window.FirebaseService === 'undefined') {
                console.warn('⚠️ FirebaseService no disponible, esperando...');
                setTimeout(this.init.bind(this), 1000);
                return;
            }
            
            console.log('✅ FirebaseService disponible');
            
            this.updateClock();
            this.clockInterval = setInterval(() => this.updateClock(), 1000);
            
            this.setupFirebaseListeners();
            this.setupNavigation();
            this.setupMenuToggle();
            this.setupChartButtons();
            this.setupClearAlerts();
            
            this.isInitialized = true;
            console.log('✅ Dashboard inicializado correctamente');
            
            this.checkConnection();
            
        } catch (error) {
            console.error('❌ Error inicializando dashboard:', error);
        } finally {
            // ✅ SIEMPRE ocultar loading screen
            this.hideLoadingScreen();
        }
    }

    hideLoadingScreen() {
        console.log('🔹 Ocultando loading screen...');
        var loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            // ✅ FORZAR OCULTAMIENTO
            loadingScreen.classList.add('hidden');
            loadingScreen.style.display = 'none';
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.pointerEvents = 'none';
            console.log('✅ Loading screen ocultada (forzado)');
        } else {
            console.warn('⚠️ Loading screen no encontrada');
        }
    }
    
    setupFirebaseListeners() {
        try {
            const fb = window.FirebaseService;
            if (!fb) {
                console.error('❌ FirebaseService no está definido');
                return;
            }
            
            const sensorListener = fb.onSensorData(this.handleSensorData);
            if (sensorListener) this.listeners.push(sensorListener);
            
            const alertsListener = fb.onAlerts(this.handleAlerts);
            if (alertsListener) this.listeners.push(alertsListener);
            
            console.log('📡 Listeners configurados');
            
        } catch (error) {
            console.error('❌ Error configurando listeners:', error);
        }
    }
    
    handleSensorData(data) {
        try {
            if (!data || typeof data !== 'object') return;
            
            // La estructura ahora es: { temperature, humidity, gas, door, motion, voltage, current, power, energy, timestamp }
            this.data = {
                temperature: this.validateNumber(data.temperature, -40, 80),
                humidity: this.validateNumber(data.humidity, 0, 100),
                gas: this.validateNumber(data.gas, 0, 1000),
                door: this.validateDoor(data.door),
                motion: this.validateDoor(data.motion),
                voltage: this.validateNumber(data.voltage, 0, 300),
                current: this.validateNumber(data.current, 0, 50),
                power: this.validateNumber(data.power, 0, 5000),
                energy: this.validateNumber(data.energy, 0, 999999),
                timestamp: data.timestamp || Date.now()
            };
            
            // Actualizar UI
            this.updateKPIs();
            this.updateChamber();
            
            // Actualizar gráficos
            if (window.chartManager) {
                window.chartManager.addDataPoint(this.data);
            }
            
            // Verificar alertas
            this.checkAlerts();
            
            // Actualizar estado de conexión
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.retryCount = 0;
            
        } catch (error) {
            console.error('❌ Error procesando datos:', error);
        }
    }
    
    handleAlerts(alerts) {
        try {
            if (!alerts || !Array.isArray(alerts)) return;
            this.alerts = alerts;
            this.renderAlerts();
            this.updateAlertBadge();
        } catch (error) {
            console.error('❌ Error procesando alertas:', error);
        }
    }
    
    validateNumber(value, min, max) {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        if (isNaN(num)) return null;
        return Math.max(min, Math.min(max, num));
    }
    
    validateDoor(value) {
        if (value === null || value === undefined) return null;
        return value === 1 || value === true ? 1 : 0;
    }
    
    async checkConnection() {
        try {
            const fb = window.FirebaseService;
            if (!fb) {
                this.handleConnectionError();
                return;
            }
            
            this.isConnected = await fb.checkConnection();
            this.updateConnectionStatus(this.isConnected);
            
            if (!this.isConnected) {
                this.handleConnectionError();
            }
        } catch (error) {
            this.handleConnectionError();
        }
    }
    
    handleConnectionError() {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log('🔄 Intentando reconectar... (' + this.retryCount + '/' + this.maxRetries + ')');
            
            setTimeout(() => {
                this.checkConnection();
            }, 5000 * this.retryCount);
        }
    }
    
    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-indicator span:last-child');
        
        if (statusDot) {
            statusDot.className = 'status-dot ' + (connected ? 'online' : 'offline');
        }
        
        if (statusText) {
            statusText.textContent = connected ? 'Sistema Online' : '⚠️ Sin conexión';
        }
    }
    
    updateClock() {
        try {
            const now = new Date();
            const options = {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            
            const datetimeEl = document.getElementById('datetime');
            if (datetimeEl) {
                const span = datetimeEl.querySelector('span');
                if (span) {
                    span.textContent = now.toLocaleDateString('es-ES', options);
                }
            }
        } catch (error) {}
    }
    
    updateKPIs() {
        try {
            this.updateTemperatureKPI();
            this.updateHumidityKPI();
            this.updateGasKPI();
            this.updateDoorKPI();
        } catch (error) {
            console.error('❌ Error actualizando KPIs:', error);
        }
    }
    
    updateTemperatureKPI() {
        const tempEl = document.getElementById('tempValue');
        const tempStatus = document.getElementById('tempStatus');
        
        if (!tempEl || !tempStatus) return;
        
        if (this.data.temperature === null) {
            tempEl.textContent = '--';
            tempStatus.textContent = 'Esperando...';
            tempStatus.className = 'status-label';
            return;
        }
        
        const temp = this.data.temperature;
        tempEl.textContent = temp.toFixed(1);
        
        const threshold = window.Constants ? window.Constants.TEMPERATURE_THRESHOLDS : { CRITICAL_HIGH: 15, WARNING_HIGH: 8, CRITICAL_LOW: -10 };
        
        if (temp > threshold.CRITICAL_HIGH) {
            tempStatus.textContent = '⚠️ Crítica';
            tempStatus.className = 'status-label danger';
        } else if (temp > threshold.WARNING_HIGH) {
            tempStatus.textContent = '⚠️ Alta';
            tempStatus.className = 'status-label warning';
        } else if (temp < threshold.CRITICAL_LOW) {
            tempStatus.textContent = '⚠️ Baja';
            tempStatus.className = 'status-label warning';
        } else {
            tempStatus.textContent = '✅ Normal';
            tempStatus.className = 'status-label normal';
        }
    }
    
    updateHumidityKPI() {
        const humEl = document.getElementById('humidityValue');
        const humStatus = document.getElementById('humidityStatus');
        
        if (!humEl || !humStatus) return;
        
        if (this.data.humidity === null) {
            humEl.textContent = '--';
            humStatus.textContent = 'Esperando...';
            humStatus.className = 'status-label';
            return;
        }
        
        const hum = this.data.humidity;
        humEl.textContent = hum.toFixed(1);
        
        const threshold = window.Constants ? window.Constants.HUMIDITY_THRESHOLDS : { CRITICAL: 90, WARNING: 80 };
        
        if (hum > threshold.CRITICAL) {
            humStatus.textContent = '⚠️ Crítica';
            humStatus.className = 'status-label danger';
        } else if (hum > threshold.WARNING) {
            humStatus.textContent = '⚠️ Alta';
            humStatus.className = 'status-label warning';
        } else {
            humStatus.textContent = '✅ Normal';
            humStatus.className = 'status-label normal';
        }
    }
    
    updateGasKPI() {
        const gasEl = document.getElementById('gasValue');
        const gasStatus = document.getElementById('gasStatus');
        
        if (!gasEl || !gasStatus) return;
        
        if (this.data.gas === null) {
            gasEl.textContent = '--';
            gasStatus.textContent = 'Esperando...';
            gasStatus.className = 'status-label';
            return;
        }
        
        const gas = this.data.gas;
        gasEl.textContent = gas.toFixed(0);
        
        const threshold = window.Constants ? window.Constants.GAS_THRESHOLDS : { CRITICAL: 500, WARNING: 200 };
        
        if (gas > threshold.CRITICAL) {
            gasStatus.textContent = '🚨 Alerta';
            gasStatus.className = 'status-label danger';
        } else if (gas > threshold.WARNING) {
            gasStatus.textContent = '⚠️ Atención';
            gasStatus.className = 'status-label warning';
        } else {
            gasStatus.textContent = '✅ Normal';
            gasStatus.className = 'status-label normal';
        }
    }
    
    updateDoorKPI() {
        const doorEl = document.getElementById('doorValue');
        const doorStatus = document.getElementById('doorStatus');
        
        if (!doorEl || !doorStatus) return;
        
        if (this.data.door === null) {
            doorEl.textContent = '--';
            doorStatus.textContent = 'Esperando...';
            doorStatus.className = 'status-label';
            return;
        }
        
        const isOpen = this.data.door === 1;
        doorEl.textContent = isOpen ? 'Abierta' : 'Cerrada';
        doorStatus.textContent = isOpen ? '🔴 Abierta' : '🟢 Cerrada';
        doorStatus.className = 'status-label ' + (isOpen ? 'door-open' : 'door-closed');
    }
    
    updateChamber() {
        try {
            const doorPanel = document.getElementById('doorPanel');
            if (doorPanel && this.data.door !== null) {
                const isOpen = this.data.door === 1;
                if (isOpen) {
                    doorPanel.classList.add('open');
                } else {
                    doorPanel.classList.remove('open');
                }
            }
            
            const tempEl = document.getElementById('chamberTemp');
            const humEl = document.getElementById('chamberHumidity');
            const gasEl = document.getElementById('chamberGas');
            
            if (tempEl) {
                tempEl.textContent = this.data.temperature !== null ? 
                    this.data.temperature.toFixed(1) + '°C' : '--°C';
            }
            
            if (humEl) {
                humEl.textContent = this.data.humidity !== null ? 
                    this.data.humidity.toFixed(1) + '%' : '--%';
            }
            
            if (gasEl && this.data.gas !== null) {
                const gasValue = this.data.gas;
                const threshold = window.Constants ? window.Constants.GAS_THRESHOLDS : { CRITICAL: 500, WARNING: 200 };
                
                if (gasValue > threshold.CRITICAL) {
                    gasEl.textContent = '🚨 Peligro';
                    gasEl.style.color = '#EF4444';
                } else if (gasValue > threshold.WARNING) {
                    gasEl.textContent = '⚠️ Atención';
                    gasEl.style.color = '#F59E0B';
                } else {
                    gasEl.textContent = '✅ Normal';
                    gasEl.style.color = '#10B981';
                }
            }
            
            const chamberStatus = document.getElementById('chamberStatus');
            if (chamberStatus) {
                if (this.data.temperature === null) {
                    chamberStatus.textContent = '⏳ Cargando...';
                    chamberStatus.className = 'chamber-status';
                    return;
                }
                
                const threshold = window.Constants ? window.Constants.TEMPERATURE_THRESHOLDS : { CRITICAL_HIGH: 15, WARNING_HIGH: 8 };
                
                if (this.data.temperature > threshold.CRITICAL_HIGH) {
                    chamberStatus.textContent = '⚠️ Alerta Temperatura';
                    chamberStatus.className = 'chamber-status danger';
                } else if (this.data.temperature > threshold.WARNING_HIGH) {
                    chamberStatus.textContent = '⚠️ Temperatura Elevada';
                    chamberStatus.className = 'chamber-status warning';
                } else {
                    chamberStatus.textContent = '✅ Operativa';
                    chamberStatus.className = 'chamber-status';
                }
            }
            
        } catch (error) {
            console.error('❌ Error actualizando cámara:', error);
        }
    }

    // ==========================================
// AGREGAR NUEVOS KPIs
// ==========================================

updateVoltageKPI() {
        const voltageEl = document.getElementById('voltageValue');
        const voltageStatus = document.getElementById('voltageStatus');
        
        if (!voltageEl || !voltageStatus) return;
        
        if (this.data.voltage === null) {
            voltageEl.textContent = '--';
            voltageStatus.textContent = 'Esperando...';
            voltageStatus.className = 'status-label';
            return;
        }
        
        const voltage = this.data.voltage;
        voltageEl.textContent = voltage.toFixed(1);
        
        if (voltage < 170 || voltage > 260) {
            voltageStatus.textContent = '🚨 Crítico';
            voltageStatus.className = 'status-label danger';
        } else if (voltage < 190 || voltage > 240) {
            voltageStatus.textContent = '⚠️ Atención';
            voltageStatus.className = 'status-label warning';
        } else {
            voltageStatus.textContent = '✅ Normal';
            voltageStatus.className = 'status-label normal';
        }
    }

updatePowerKPI() {
        const powerEl = document.getElementById('powerValue');
        const powerStatus = document.getElementById('powerStatus');
        
        if (!powerEl || !powerStatus) return;
        
        if (this.data.power === null) {
            powerEl.textContent = '--';
            powerStatus.textContent = 'Esperando...';
            powerStatus.className = 'status-label';
            return;
        }
        
        const power = this.data.power;
        powerEl.textContent = power.toFixed(0);
        
        if (power > 3500) {
            powerStatus.textContent = '🚨 Crítico';
            powerStatus.className = 'status-label danger';
        } else if (power > 2500) {
            powerStatus.textContent = '⚠️ Atención';
            powerStatus.className = 'status-label warning';
        } else {
            powerStatus.textContent = '✅ Normal';
            powerStatus.className = 'status-label normal';
        }
    }

updateMotionKPI() {
        const motionEl = document.getElementById('motionValue');
        const motionStatus = document.getElementById('motionStatus');
        
        if (!motionEl || !motionStatus) return;
        
        if (this.data.motion === null) {
            motionEl.textContent = '--';
            motionStatus.textContent = 'Esperando...';
            motionStatus.className = 'status-label';
            return;
        }
        
        const isMotion = this.data.motion === 1;
        motionEl.textContent = isMotion ? '🔴 Detectado' : '🟢 Sin detección';
        motionStatus.textContent = isMotion ? '● Movimiento' : '● Sin movimiento';
        motionStatus.className = isMotion ? 'status-label danger' : 'status-label normal';
    }
    
    checkAlerts() {
        try {
            let hasAlert = false;
            const timestamp = Date.now();
            const threshold = window.Constants ? window.Constants.TEMPERATURE_THRESHOLDS : { CRITICAL_HIGH: 15 };
            const gasThreshold = window.Constants ? window.Constants.GAS_THRESHOLDS : { CRITICAL: 500, WARNING: 200 };
            
            if (this.data.temperature !== null && this.data.temperature > threshold.CRITICAL_HIGH) {
                this.addAlert('danger', '🌡️ Temperatura crítica', 
                    'La temperatura ha alcanzado ' + this.data.temperature.toFixed(1) + '°C');
                hasAlert = true;
            }
            
            if (this.data.gas !== null) {
                if (this.data.gas > gasThreshold.CRITICAL) {
                    this.addAlert('danger', '💨 Fuga de gas detectada', 
                        'Nivel de gas: ' + this.data.gas.toFixed(0) + ' ppm');
                    hasAlert = true;
                } else if (this.data.gas > gasThreshold.WARNING) {
                    this.addAlert('warning', '⚠️ Nivel de gas elevado', 
                        'Nivel de gas: ' + this.data.gas.toFixed(0) + ' ppm');
                    hasAlert = true;
                }
            }
            
            if (this.data.door !== null && this.data.door === 1) {
                if (this._doorOpenTime === null) {
                    this._doorOpenTime = timestamp;
                }
                const doorOpenTime = timestamp - this._doorOpenTime;
                if (doorOpenTime > 60000) {
                    this.addAlert('warning', '🚪 Puerta abierta', 
                        'La puerta de la cámara lleva más de 1 minuto abierta');
                    hasAlert = true;
                }
            } else if (this.data.door === 0) {
                this._doorOpenTime = null;
            }
            
            this.updateAlertBadge();
            
        } catch (error) {
            console.error('❌ Error verificando alertas:', error);
        }
    }
    
    addAlert(type, title, message) {
        try {
            const alertKey = type + '-' + message;
            const now = Date.now();
            
            if (this.alertCooldown[alertKey] && 
                (now - this.alertCooldown[alertKey]) < 120000) {
                return;
            }
            
            this.alertCooldown[alertKey] = now;
            
            const alert = {
                id: now,
                type: type,
                title: title,
                message: message,
                timestamp: now,
                read: false
            };
            
            const exists = this.alerts.some(function(a) {
                return a.message === message && (now - a.timestamp) < 120000;
            });
            
            if (exists) return;
            
            this.alerts.unshift(alert);
            
            if (this.alerts.length > 50) {
                this.alerts = this.alerts.slice(0, 50);
            }
            
            try {
                const fb = window.FirebaseService;
                if (fb) {
                    fb.saveAlert({
                        type: type,
                        title: title,
                        message: message
                    }).catch(function() {});
                }
            } catch (error) {}
            
            this.renderAlerts();
            this.showBrowserNotification(title, message);
            
        } catch (error) {
            console.error('❌ Error agregando alerta:', error);
        }
    }
    
    showBrowserNotification(title, message) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🔔 NexusTrack IoT', {
                    body: title + ': ' + message,
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❄️</text></svg>',
                    silent: true
                });
            }
        } catch (error) {}
    }
    
    renderAlerts() {
        const container = document.getElementById('alertsContainer');
        if (!container) return;
        
        try {
            if (this.alerts.length === 0) {
                container.innerHTML = 
                    '<div class="alert-placeholder">' +
                        '<i class="fas fa-check-circle"></i>' +
                        '<p>No hay alertas activas</p>' +
                    '</div>';
                return;
            }
            
            const recentAlerts = this.alerts.slice(0, 5);
            var html = '';
            
            for (var i = 0; i < recentAlerts.length; i++) {
                var alert = recentAlerts[i];
                var icon = this.getAlertIcon(alert.type);
                var time = this.formatTime(alert.timestamp);
                var badge = !alert.read ? '<span class="badge">Nuevo</span>' : '';
                
                html += 
                    '<div class="alert-item ' + (alert.read ? 'read' : '') + '">' +
                        '<div class="alert-icon ' + (alert.type || 'info') + '">' +
                            '<i class="fas ' + icon + '"></i>' +
                        '</div>' +
                        '<div class="alert-content">' +
                            '<p>' + this.escapeHtml(alert.title || alert.message) + '</p>' +
                            '<span class="alert-time">' + time + '</span>' +
                        '</div>' +
                        badge +
                    '</div>';
            }
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Error renderizando alertas:', error);
        }
    }
    
    updateAlertBadge() {
        var badge = document.getElementById('alertBadge');
        var dot = document.getElementById('notificationDot');
        var unreadCount = 0;
        
        for (var i = 0; i < this.alerts.length; i++) {
            if (!this.alerts[i].read) unreadCount++;
        }
        
        if (badge) {
            badge.textContent = unreadCount || '0';
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
        
        if (dot) {
            if (unreadCount > 0) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        }
    }
    
    getAlertIcon(type) {
        var icons = {
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
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
            return date.toLocaleString('es-ES');
        } catch (error) {
            return 'Fecha desconocida';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    hideLoadingScreen() {
        var loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            console.log('🔹 Ocultando loading screen...');
            // ✅ FORZAR OCULTAMIENTO COMPLETO
            loadingScreen.classList.add('hidden');
            loadingScreen.style.display = 'none';
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.pointerEvents = 'none';
            console.log('✅ Loading screen ocultada (forzado)');
        } else {
            console.warn('⚠️ Loading screen no encontrada');
        }
    }
        
    setupNavigation() {
        var navLinks = document.querySelectorAll('.sidebar-nav ul li a');
        var sections = {
            dashboard: document.getElementById('dashboard'),
            sensores: document.getElementById('sensores'),
            alertas: document.getElementById('alertas'),
            historico: document.getElementById('historico'),
            configuracion: document.getElementById('configuracion')
        };
        
        for (var i = 0; i < navLinks.length; i++) {
            var link = navLinks[i];
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var href = this.getAttribute('href').replace('#', '');
                
                for (var j = 0; j < navLinks.length; j++) {
                    navLinks[j].closest('li').classList.remove('active');
                }
                this.closest('li').classList.add('active');
                
                var keys = Object.keys(sections);
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    if (sections[key]) {
                        if (key === href) {
                            sections[key].classList.add('active');
                        } else {
                            sections[key].classList.remove('active');
                        }
                    }
                }
                
                var sidebar = document.querySelector('.sidebar');
                if (window.innerWidth <= 992) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }
    
    setupMenuToggle() {
        var toggle = document.getElementById('menuToggle');
        var sidebar = document.querySelector('.sidebar');
        
        if (toggle && sidebar) {
            toggle.addEventListener('click', function() {
                var isOpen = sidebar.classList.toggle('open');
                toggle.setAttribute('aria-expanded', isOpen);
            });
            
            document.addEventListener('click', function(e) {
                if (window.innerWidth <= 992) {
                    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                        sidebar.classList.remove('open');
                        toggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }
    }
    
    setupChartButtons() {
        var buttons = document.querySelectorAll('.chart-btn');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            btn.addEventListener('click', function() {
                var parent = this.closest('.chart-controls');
                if (parent) {
                    var btns = parent.querySelectorAll('.chart-btn');
                    for (var j = 0; j < btns.length; j++) {
                        btns[j].classList.remove('active');
                        btns[j].setAttribute('aria-pressed', 'false');
                    }
                    this.classList.add('active');
                    this.setAttribute('aria-pressed', 'true');
                }
                
                var period = parseInt(this.dataset.period);
                if (window.chartManager) {
                    window.chartManager.updatePeriod(period);
                }
            });
        }
    }
    
    setupClearAlerts() {
        var clearBtn = document.getElementById('clearAlerts');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                for (var i = 0; i < this.alerts.length; i++) {
                    this.alerts[i].read = true;
                }
                this.renderAlerts();
                this.updateAlertBadge();
            }.bind(this));
        }
    }
    
    destroy() {
        for (var i = 0; i < this.listeners.length; i++) {
            var listener = this.listeners[i];
            if (listener && typeof listener === 'function') {
                try { listener(); } catch (error) {}
            }
        }
        this.listeners = [];
        
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        
        console.log('🧹 Dashboard limpiado correctamente');
    }
}

// ==========================================
// INICIALIZAR
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔹 DOMContentLoaded - Inicializando Dashboard...');
    try {
        window.dashboard = new DashboardController();
        console.log('✅ Dashboard Controller instanciado');
    } catch (error) {
        console.error('❌ Error instanciando Dashboard:', error);
        // Ocultar loading screen incluso si falla
        var ls = document.getElementById('loadingScreen');
        if (ls) ls.classList.add('hidden');
    }
});

// 🔹 EMERGENCIA: Ocultar después de 3 segundos si no se ocultó
setTimeout(function() {
    var ls = document.getElementById('loadingScreen');
    if (ls && !ls.classList.contains('hidden')) {
        ls.classList.add('hidden');
        console.log('⚠️ Loading screen ocultada por timeout de emergencia');
    }
}, 3000);