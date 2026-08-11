// ============================================
// NEXUS TRACK IoT - MÓDULOS COMPLETOS
// VERSIÓN CORREGIDA Y FUNCIONAL
// ============================================

class ModulesManager {
    constructor() {
        this.historyData = [];
        this.alertsData = [];
        this.sensorData = {};
        this.historyCharts = {};
        this.sensorCharts = {};
        this.isInitialized = false;
        this.currentAlertFilter = 'all';
        this.debug = true;
        this.updateInterval = null;
        
        // Esperar a que FirebaseService esté disponible
        this.waitForFirebase();
    }
    
    // ============================================
    // ESPERAR FIREBASE
    // ============================================
    waitForFirebase() {
        if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
            console.log('✅ FirebaseService disponible');
            this.init();
            return;
        }
        
        console.log('⏳ Esperando FirebaseService...');
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkFirebase = setInterval(() => {
            attempts++;
            if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
                clearInterval(checkFirebase);
                console.log('✅ FirebaseService disponible después de', attempts, 'intentos');
                this.init();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkFirebase);
                console.error('❌ FirebaseService no disponible después de', maxAttempts, 'intentos');
                // Inicializar con datos de prueba
                this.initWithMockData();
            }
        }, 500);
    }
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    init() {
        console.log('📦 Inicializando módulos...');
        console.log('🔍 Modo debug:', this.debug ? 'ACTIVADO' : 'DESACTIVADO');
        
        // Configurar listeners de Firebase
        this.setupFirebaseListeners();
        
        // Configurar eventos de UI
        this.setupUIEvents();
        
        // Cargar datos iniciales
        setTimeout(() => {
            this.loadHistory();
            this.loadAlerts();
            this.checkConnection();
        }, 1000);
        
        // Actualizar cada 30 segundos (fallback)
        this.updateInterval = setInterval(() => {
            this.refreshData();
        }, 30000);
        
        this.isInitialized = true;
        console.log('✅ Módulos inicializados');
    }
    
    // ============================================
    // INICIALIZAR CON DATOS DE PRUEBA
    // ============================================
    initWithMockData() {
        console.log('📦 Inicializando con datos de prueba...');
        
        // Generar datos de prueba
        const mockData = {
            temperature: 2.5 + Math.random() * 6,
            humidity: 60 + Math.random() * 20,
            gas: 50 + Math.random() * 150,
            door: Math.random() > 0.7 ? 1 : 0,
            voltage: 220 + Math.random() * 10 - 5,
            current: 1.0 + Math.random() * 0.6,
            power: 220 * 1.3,
            energy: 1.5 + Math.random() * 0.5,
            timestamp: Date.now()
        };
        
        console.log('📊 Datos de prueba:', mockData);
        this.sensorData = mockData;
        this.updateSensorUI(mockData);
        
        // Configurar eventos de UI
        this.setupUIEvents();
        
        this.isInitialized = true;
        console.log('✅ Módulos inicializados con datos de prueba');
        console.warn('⚠️ Modo de prueba - Los datos no son reales');
    }
    
    // ============================================
    // REFRESCAR DATOS
    // ============================================
    refreshData() {
        console.log('🔄 Refrescando datos...');
        this.loadHistory();
        this.loadAlerts();
        
        // Intentar obtener datos actualizados
        if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
            FirebaseService.getSensorData('esp32_001', false)
                .then(data => {
                    if (data) {
                        console.log('📊 Datos refrescados:', data);
                        this.sensorData = data;
                        this.updateSensorUI(data);
                    }
                })
                .catch(error => {
                    console.warn('⚠️ Error refrescando datos:', error);
                });
        }
    }
    
    // ============================================
    // VERIFICAR CONEXIÓN
    // ============================================
    async checkConnection() {
        console.log('🔍 Verificando conexión a Firebase...');
        
        try {
            if (typeof FirebaseService === 'undefined') {
                console.error('❌ FirebaseService no está definido');
                return;
            }
            
            if (!FirebaseService.isInitialized) {
                console.warn('⚠️ FirebaseService no inicializado');
                return;
            }
            
            // Verificar conexión
            const connected = await FirebaseService.checkConnection();
            console.log(`📡 Conexión: ${connected ? '✅ Conectado' : '❌ Desconectado'}`);
            
            // Verificar datos de sensores
            if (FirebaseService.sensorsRef) {
                console.log('📡 Verificando datos en sensors/esp32_001/live...');
                const snapshot = await FirebaseService.sensorsRef.once('value');
                const data = snapshot.val();
                
                if (data) {
                    console.log('✅ Datos encontrados:', JSON.stringify(data, null, 2));
                    this.sensorData = data;
                    this.updateSensorUI(data);
                } else {
                    console.warn('⚠️ No hay datos en sensors/esp32_001/live');
                    console.warn('   💡 Asegúrate de que el ESP32 esté enviando datos');
                }
            }
            
            // Verificar alertas
            if (FirebaseService.alertsRef) {
                console.log('📡 Verificando alertas...');
                const snapshot = await FirebaseService.alertsRef.once('value');
                const data = snapshot.val();
                
                if (data) {
                    const alerts = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    console.log(`✅ ${alerts.length} alertas encontradas`);
                    this.alertsData = alerts;
                    this.renderAlerts();
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando conexión:', error);
        }
    }
    
    // ============================================
    // FIREBASE LISTENERS
    // ============================================
    setupFirebaseListeners() {
        console.log('📡 Configurando listeners de Firebase...');
        
        if (typeof FirebaseService === 'undefined') {
            console.error('❌ FirebaseService no disponible');
            return;
        }
        
        if (!FirebaseService.isInitialized) {
            console.warn('⚠️ FirebaseService no inicializado');
            return;
        }
        
        // ✅ Escuchar datos de sensores
        console.log('📡 Escuchando datos en sensors/esp32_001/live...');
        
        try {
            const sensorListener = FirebaseService.onSensorData((data) => {
                console.log('📊 Datos de sensores RECIBIDOS:', data);
                
                if (data) {
                    this.sensorData = data;
                    this.updateSensorUI(data);
                } else {
                    console.warn('⚠️ Datos de sensores vacíos o nulos');
                }
            }, 'esp32_001', {
                useCache: true,
                errorHandler: (error) => {
                    console.error('❌ Error en listener de sensores:', error);
                }
            });
            
            this._sensorListener = sensorListener;
        } catch (error) {
            console.error('❌ Error configurando listener de sensores:', error);
        }
        
        // ✅ Escuchar alertas
        console.log('📡 Escuchando alertas...');
        
        try {
            const alertListener = FirebaseService.onAlerts((alerts) => {
                console.log(`🔔 ${alerts.length} alertas recibidas`);
                this.alertsData = alerts || [];
                this.renderAlerts();
            }, 'esp32_001', {
                errorHandler: (error) => {
                    console.error('❌ Error en listener de alertas:', error);
                }
            });
            
            this._alertListener = alertListener;
        } catch (error) {
            console.error('❌ Error configurando listener de alertas:', error);
        }
        
        console.log('✅ Listeners configurados');
    }
    
    // ============================================
    // SENSORES UI - CORREGIDA
    // ============================================
    updateSensorUI(data) {
        console.log('🔄 Actualizando UI de sensores...');
        
        if (!data || typeof data !== 'object') {
            console.warn('⚠️ Datos inválidos para UI:', data);
            return;
        }
        
        // ✅ Verificar que los elementos existan
        const elements = {
            temp: document.getElementById('sensorTempValue'),
            tempStatus: document.getElementById('sensorTempStatus'),
            tempTime: document.getElementById('sensorTempTime'),
            hum: document.getElementById('sensorHumValue'),
            humStatus: document.getElementById('sensorHumStatus'),
            humTime: document.getElementById('sensorHumTime'),
            gas: document.getElementById('sensorGasValue'),
            gasStatus: document.getElementById('sensorGasStatus'),
            gasTime: document.getElementById('sensorGasTime'),
            volt: document.getElementById('sensorVoltValue'),
            voltStatus: document.getElementById('sensorVoltStatus'),
            voltTime: document.getElementById('sensorVoltTime'),
            energy: document.getElementById('sensorEnergyValue'),
            energyTime: document.getElementById('sensorEnergyTime'),
            power: document.getElementById('sensorPowerValue'),
            current: document.getElementById('sensorCurrentValue'),
            doorValue: document.getElementById('sensorDoorValue'),
            doorStatus: document.getElementById('sensorDoorStatus'),
            doorText: document.getElementById('sensorDoorText'),
            doorTime: document.getElementById('sensorDoorTime'),
            doorFill: document.getElementById('doorTimelineFill')
        };
        
        // ✅ Verificar elementos faltantes
        const missing = Object.entries(elements)
            .filter(([key, el]) => !el)
            .map(([key]) => key);
        
        if (missing.length > 0) {
            console.warn('⚠️ Elementos faltantes en el DOM:', missing);
            console.warn('   💡 Asegúrate de que el HTML tenga estos IDs');
        }
        
        // ============================================
        // TEMPERATURA
        // ============================================
        if (elements.temp) {
            elements.temp.textContent = data.temperature !== null && data.temperature !== undefined 
                ? data.temperature.toFixed(1) 
                : '--';
        }
        if (elements.tempStatus) {
            this.updateSensorStatusElement(elements.tempStatus, data.temperature, 8, -2);
        }
        if (elements.tempTime) {
            elements.tempTime.textContent = `Última lectura: ${this.formatTime(data.timestamp)}`;
        }
        this.updateMiniChart('sensorTempMiniChart', 'temperature', data.temperature);
        
        // ============================================
        // HUMEDAD
        // ============================================
        if (elements.hum) {
            elements.hum.textContent = data.humidity !== null && data.humidity !== undefined 
                ? data.humidity.toFixed(1) 
                : '--';
        }
        if (elements.humStatus) {
            this.updateSensorStatusElement(elements.humStatus, data.humidity, 85);
        }
        if (elements.humTime) {
            elements.humTime.textContent = `Última lectura: ${this.formatTime(data.timestamp)}`;
        }
        this.updateMiniChart('sensorHumMiniChart', 'humidity', data.humidity);
        
        // ============================================
        // GAS
        // ============================================
        if (elements.gas) {
            elements.gas.textContent = data.gas !== null && data.gas !== undefined 
                ? data.gas.toFixed(0) 
                : '--';
        }
        if (elements.gasStatus) {
            this.updateSensorStatusElement(elements.gasStatus, data.gas, 200);
        }
        if (elements.gasTime) {
            elements.gasTime.textContent = `Última lectura: ${this.formatTime(data.timestamp)}`;
        }
        this.updateMiniChart('sensorGasMiniChart', 'gas', data.gas);
        
        // ============================================
        // PUERTA
        // ============================================
        const isOpen = data.door === 1;
        if (elements.doorValue) {
            elements.doorValue.innerHTML = isOpen 
                ? '<i class="fas fa-door-open" style="color:var(--status-danger);"></i> Abierta'
                : '<i class="fas fa-door-closed" style="color:var(--status-safe);"></i> Cerrada';
        }
        if (elements.doorStatus) {
            elements.doorStatus.textContent = isOpen ? 'Abierta' : 'Cerrada';
            elements.doorStatus.className = `sensor-status ${isOpen ? 'danger' : 'normal'}`;
        }
        if (elements.doorText) {
            elements.doorText.textContent = isOpen ? 'Abierta' : 'Cerrada';
        }
        if (elements.doorTime) {
            elements.doorTime.textContent = `Última lectura: ${this.formatTime(data.timestamp)}`;
        }
        if (elements.doorFill) {
            elements.doorFill.style.width = isOpen ? '100%' : '0%';
            elements.doorFill.style.background = isOpen ? 'var(--status-danger)' : 'var(--status-safe)';
        }
        
        // ============================================
        // VOLTAJE
        // ============================================
        if (elements.volt) {
            elements.volt.textContent = data.voltage !== null && data.voltage !== undefined 
                ? data.voltage.toFixed(1) 
                : '--';
        }
        if (elements.voltStatus) {
            this.updateSensorStatusElement(elements.voltStatus, data.voltage, 240, 190);
        }
        if (elements.voltTime) {
            elements.voltTime.textContent = `Última lectura: ${this.formatTime(data.timestamp)}`;
        }
        this.updateMiniChart('sensorVoltMiniChart', 'voltage', data.voltage);
        
        // ============================================
        // ENERGÍA
        // ============================================
        if (elements.energy) {
            elements.energy.textContent = data.energy !== null && data.energy !== undefined 
                ? data.energy.toFixed(2) 
                : '--';
        }
        if (elements.energyTime) {
            elements.energyTime.textContent = `Última lectura: ${this.formatTime(data.timestamp)}`;
        }
        if (elements.power) {
            elements.power.textContent = data.power !== null && data.power !== undefined 
                ? data.power.toFixed(1) + ' W' 
                : '-- W';
        }
        if (elements.current) {
            elements.current.textContent = data.current !== null && data.current !== undefined 
                ? data.current.toFixed(2) + ' A' 
                : '-- A';
        }
        
        console.log('✅ UI de sensores actualizada');
    }
    
    // ============================================
    // SENSOR STATUS ELEMENT
    // ============================================
    updateSensorStatusElement(el, value, max, min) {
        if (!el) return;
        
        if (value === null || value === undefined) {
            el.textContent = '--';
            el.className = 'sensor-status';
            return;
        }
        
        let status = 'normal';
        let text = 'Normal';
        
        if (max && value > max) {
            status = 'danger';
            text = '⚠️ Crítico';
        } else if (min !== undefined && value < min) {
            status = 'warning';
            text = '⚠️ Bajo';
        } else if (max && value > max * 0.8) {
            status = 'warning';
            text = '⚠️ Atención';
        }
        
        el.textContent = text;
        el.className = `sensor-status ${status}`;
    }
    
    // ============================================
    // MINI CHART - CORREGIDO
    // ============================================
    updateMiniChart(canvasId, type, value) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        try {
            const ctx = canvas.getContext('2d');
            const rect = canvas.parentElement?.getBoundingClientRect();
            const width = rect?.width || 200;
            const height = 50;
            
            canvas.width = width;
            canvas.height = height;
            
            const colors = {
                temperature: '#EF4444',
                humidity: '#3B82F6',
                gas: '#F59E0B',
                voltage: '#005F8A'
            };
            
            const color = colors[type] || '#6B7280';
            
            ctx.clearRect(0, 0, width, height);
            
            // Fondo
            ctx.fillStyle = 'rgba(0,0,0,0.03)';
            ctx.fillRect(0, 0, width, height);
            
            // Barra
            const maxValue = type === 'temperature' ? 10 : 
                            type === 'humidity' ? 100 :
                            type === 'gas' ? 500 : 250;
            
            const safeValue = value !== null && value !== undefined ? value : 0;
            const percent = Math.min((safeValue / maxValue) * 100, 100);
            const barWidth = width * 0.7;
            const barHeight = 20;
            const barX = (width - barWidth) / 2;
            const barY = (height - barHeight) / 2;
            
            // Fondo de la barra
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Barra de progreso
            const gradient = ctx.createLinearGradient(0, 0, barWidth, 0);
            if (percent > 80) {
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, '#EF4444');
            } else if (percent > 50) {
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, '#F59E0B');
            } else {
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, color);
            }
            
            ctx.fillStyle = gradient;
            ctx.fillRect(barX, barY, barWidth * (percent / 100), barHeight);
            
            // Valor
            ctx.fillStyle = '#6B7280';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(safeValue !== null && safeValue !== undefined ? safeValue.toFixed(1) : '--', width / 2, height - 4);
            
        } catch (error) {
            console.warn('⚠️ Error en mini chart:', error);
        }
    }
    
    // ============================================
    // ALERTAS - CORREGIDO
    // ============================================
    renderAlerts() {
        const container = document.getElementById('alertList');
        if (!container) {
            console.warn('⚠️ alertList no encontrado');
            return;
        }
        
        const filtered = this.filterAlerts();
        const count = document.getElementById('alertCount');
        if (count) count.textContent = filtered.length;
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="alert-placeholder">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay alertas para mostrar</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(alert => `
            <div class="alert-item ${alert.read ? 'read' : ''}" data-id="${alert.id}">
                <div class="alert-icon ${alert.type || 'info'}">
                    <i class="fas ${this.getAlertIcon(alert.type)}"></i>
                </div>
                <div class="alert-content">
                    <p><strong>${this.getTypeLabel(alert.type)}</strong> ${this.escapeHtml(alert.title || 'Alerta')}</p>
                    <p style="font-size:13px;color:var(--text-muted);margin-top:2px;">${this.escapeHtml(alert.message || '')}</p>
                    <span class="alert-time">${this.formatTime(alert.timestamp)}</span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                    ${!alert.read ? '<span class="badge" style="position:static;">Nuevo</span>' : ''}
                    <span style="font-size:11px;color:var(--text-muted);cursor:pointer;" 
                          onclick="if(window.modulesManager) window.modulesManager.deleteAlert('${alert.id}')">
                        <i class="fas fa-times"></i>
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    filterAlerts() {
        const filter = this.currentAlertFilter;
        if (filter === 'all') return this.alertsData || [];
        if (filter === 'unread') return (this.alertsData || []).filter(a => !a.read);
        return (this.alertsData || []).filter(a => a.type === filter);
    }
    
    getAlertIcon(type) {
        const icons = {
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };
        return icons[type] || 'fa-bell';
    }
    
    getTypeLabel(type) {
        const labels = {
            danger: '🚨',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✅'
        };
        return labels[type] || '📢';
    }
    
    deleteAlert(id) {
        if (!confirm('¿Eliminar esta alerta?')) return;
        this.alertsData = (this.alertsData || []).filter(a => a.id !== id);
        this.renderAlerts();
    }
    
    // ============================================
    // HISTÓRICO - CORREGIDO
    // ============================================
    async loadHistory() {
        try {
            if (typeof FirebaseService === 'undefined' || !FirebaseService.isInitialized) {
                console.warn('⚠️ FirebaseService no disponible para histórico');
                this.renderHistoryTable([]);
                return;
            }
            
            const period = document.getElementById('historyPeriod')?.value || 30;
            const data = await FirebaseService.getHistory(parseInt(period));
            
            if (data && data.length > 0) {
                this.historyData = data;
                this.renderHistoryTable(data);
                this.renderHistoryCharts(data);
            } else {
                console.warn('⚠️ No hay datos históricos');
                this.renderHistoryTable([]);
            }
        } catch (error) {
            console.error('❌ Error cargando histórico:', error);
            this.renderHistoryTable([]);
        }
    }
    
    loadAlerts() {
        // Las alertas se cargan a través del listener
        // Este método es un fallback
        if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
            FirebaseService.alertsRef?.once('value').then(snapshot => {
                const data = snapshot.val();
                if (data) {
                    const alerts = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    this.alertsData = alerts;
                    this.renderAlerts();
                }
            }).catch(error => {
                console.warn('⚠️ Error cargando alertas:', error);
            });
        }
    }
    
    renderHistoryTable(data) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay datos disponibles</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.slice(0, 100).map(entry => `
            <tr>
                <td>${this.formatTime(entry.timestamp)}</td>
                <td>${entry.temperature !== undefined ? entry.temperature.toFixed(1) : '--'}</td>
                <td>${entry.humidity !== undefined ? entry.humidity.toFixed(1) : '--'}</td>
                <td>${entry.gas !== undefined ? entry.gas.toFixed(0) : '--'}</td>
                <td>${entry.door !== undefined ? (entry.door === 1 ? '🔴 Abierta' : '🟢 Cerrada') : '--'}</td>
                <td>${entry.voltage !== undefined ? entry.voltage.toFixed(1) : '--'}</td>
                <td>${entry.current !== undefined ? entry.current.toFixed(2) : '--'}</td>
                <td>${entry.power !== undefined ? entry.power.toFixed(1) : '--'}</td>
            </tr>
        `).join('');
    }
    
    renderHistoryCharts(data) {
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js no disponible');
            return;
        }
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No hay datos para gráficos');
            return;
        }
        
        try {
            const labels = data.map(d => this.formatShortTime(d.timestamp));
            
            this.createHistoryChart('historyTempChart', labels, data.map(d => d.temperature || 0), '#EF4444', 'Temperatura (°C)');
            this.createHistoryChart('historyHumChart', labels, data.map(d => d.humidity || 0), '#3B82F6', 'Humedad (%)');
            this.createHistoryChart('historyGasChart', labels, data.map(d => d.gas || 0), '#F59E0B', 'Gas (ppm)');
            this.createHistoryChart('historyVoltChart', labels, data.map(d => d.voltage || 0), '#005F8A', 'Voltaje (V)');
        } catch (error) {
            console.error('❌ Error creando gráficos:', error);
        }
    }
    
    createHistoryChart(id, labels, data, color, label) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        
        try {
            // Destruir chart existente
            if (this.historyCharts[id]) {
                this.historyCharts[id].destroy();
                delete this.historyCharts[id];
            }
            
            const ctx = canvas.getContext('2d');
            this.historyCharts[id] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: data,
                        borderColor: color,
                        backgroundColor: color + '20',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 1,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { maxTicksLimit: 10, font: { size: 9 } }
                        },
                        y: {
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { font: { size: 9 } }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        } catch (error) {
            console.warn(`⚠️ Error creando gráfico ${id}:`, error);
        }
    }
    
    // ============================================
    // CONFIGURACIÓN - CORREGIDO
    // ============================================
    setupConfigForm() {
        // Cargar configuración desde Firebase
        document.getElementById('loadConfig')?.addEventListener('click', () => {
            this.loadConfigFromFirebase();
        });
        
        // Guardar configuración
        document.getElementById('saveConfig')?.addEventListener('click', () => {
            this.saveConfigToFirebase();
        });
        
        // Resetear configuración
        document.getElementById('resetConfig')?.addEventListener('click', () => {
            this.resetConfig();
        });
    }
    
    async loadConfigFromFirebase() {
        try {
            if (typeof FirebaseService === 'undefined' || !FirebaseService.isInitialized) {
                alert('Firebase no disponible');
                return;
            }
            
            const config = await FirebaseService.getData('configuration/esp32_001');
            if (config) {
                this.applyConfig(config);
                document.getElementById('configStatus').textContent = '✅ Configuración cargada desde Firebase';
                document.getElementById('configStatus').style.color = 'var(--status-safe)';
            } else {
                document.getElementById('configStatus').textContent = '⚠️ No hay configuración en Firebase';
                document.getElementById('configStatus').style.color = 'var(--status-warning)';
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            document.getElementById('configStatus').textContent = '❌ Error cargando configuración';
            document.getElementById('configStatus').style.color = 'var(--status-danger)';
        }
    }
    
    async saveConfigToFirebase() {
        try {
            if (typeof FirebaseService === 'undefined' || !FirebaseService.isInitialized) {
                alert('Firebase no disponible');
                return;
            }
            
            const config = {
                temperature: {
                    min: parseFloat(document.getElementById('tempMin')?.value) || -5,
                    max: parseFloat(document.getElementById('tempMax')?.value) || 10
                },
                humidity: {
                    max: parseFloat(document.getElementById('humMax')?.value) || 85
                },
                gas: {
                    max: parseInt(document.getElementById('gasMax')?.value) || 200
                },
                door: {
                    maxOpenTime: parseInt(document.getElementById('doorMaxOpenTime')?.value) || 300
                },
                security: {
                    start: document.getElementById('secStart')?.value || '22:00',
                    end: document.getElementById('secEnd')?.value || '06:00'
                },
                alerts: {
                    sound: document.getElementById('soundAlert')?.checked || false,
                    push: document.getElementById('pushAlert')?.checked || false,
                    email: document.getElementById('emailAlert')?.checked || false
                }
            };
            
            await FirebaseService.setData('configuration/esp32_001', config);
            document.getElementById('configStatus').textContent = '✅ Configuración guardada en Firebase';
            document.getElementById('configStatus').style.color = 'var(--status-safe)';
            
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            document.getElementById('configStatus').textContent = '❌ Error guardando configuración';
            document.getElementById('configStatus').style.color = 'var(--status-danger)';
        }
    }
    
    applyConfig(config) {
        if (config.temperature) {
            if (document.getElementById('tempMin')) {
                document.getElementById('tempMin').value = config.temperature.min || -5;
            }
            if (document.getElementById('tempMax')) {
                document.getElementById('tempMax').value = config.temperature.max || 10;
            }
        }
        if (config.humidity && document.getElementById('humMax')) {
            document.getElementById('humMax').value = config.humidity.max || 85;
        }
        if (config.gas && document.getElementById('gasMax')) {
            document.getElementById('gasMax').value = config.gas.max || 200;
        }
        if (config.door && document.getElementById('doorMaxOpenTime')) {
            document.getElementById('doorMaxOpenTime').value = config.door.maxOpenTime || 300;
        }
        if (config.security) {
            if (document.getElementById('secStart')) {
                document.getElementById('secStart').value = config.security.start || '22:00';
            }
            if (document.getElementById('secEnd')) {
                document.getElementById('secEnd').value = config.security.end || '06:00';
            }
        }
        if (config.alerts) {
            if (document.getElementById('soundAlert')) {
                document.getElementById('soundAlert').checked = config.alerts.sound !== false;
            }
            if (document.getElementById('pushAlert')) {
                document.getElementById('pushAlert').checked = config.alerts.push !== false;
            }
            if (document.getElementById('emailAlert')) {
                document.getElementById('emailAlert').checked = config.alerts.email === true;
            }
        }
    }
    
    resetConfig() {
        if (!confirm('¿Restaurar configuración por defecto?')) return;
        
        const defaultConfig = {
            temperature: { min: -5, max: 10 },
            humidity: { max: 85 },
            gas: { max: 200 },
            door: { maxOpenTime: 300 },
            security: { start: '22:00', end: '06:00' },
            alerts: { sound: true, push: true, email: false }
        };
        
        this.applyConfig(defaultConfig);
        document.getElementById('configStatus').textContent = '🔄 Configuración restaurada a valores por defecto';
        document.getElementById('configStatus').style.color = 'var(--status-info)';
    }
    
    // ============================================
    // UI EVENTS - CORREGIDO
    // ============================================
    setupUIEvents() {
        console.log('🎯 Configurando eventos de UI...');
        
        // Filtros de alertas
        document.querySelectorAll('.alert-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentAlertFilter = btn.dataset.filter;
                this.renderAlerts();
            });
        });
        
        // Marcar todas como leídas
        document.getElementById('markAllRead')?.addEventListener('click', () => {
            this.alertsData.forEach(a => a.read = true);
            this.renderAlerts();
            console.log('✅ Todas las alertas marcadas como leídas');
        });
        
        // Limpiar todas las alertas
        document.getElementById('clearAllAlerts')?.addEventListener('click', () => {
            if (confirm('¿Eliminar todas las alertas?')) {
                this.alertsData = [];
                this.renderAlerts();
                console.log('🗑️ Todas las alertas eliminadas');
            }
        });
        
        // Exportar alertas
        document.getElementById('exportAlerts')?.addEventListener('click', () => {
            this.exportAlerts();
        });
        
        // Histórico - cambio de período
        document.getElementById('historyPeriod')?.addEventListener('change', () => {
            this.loadHistory();
        });
        
        // Refrescar histórico
        document.getElementById('refreshHistory')?.addEventListener('click', () => {
            this.loadHistory();
        });
        
        // Exportar histórico
        document.getElementById('exportHistory')?.addEventListener('click', () => {
            this.exportHistory();
        });
        
        // Configuración
        this.setupConfigForm();
        
        console.log('✅ Eventos de UI configurados');
    }
    
    // ============================================
    // EXPORTACIONES
    // ============================================
    exportAlerts() {
        if (!this.alertsData || this.alertsData.length === 0) {
            alert('No hay alertas para exportar');
            return;
        }
        
        const headers = 'Fecha,Tipo,Título,Mensaje,Estado\n';
        const rows = this.alertsData.map(a => 
            `${this.formatTime(a.timestamp)},${a.type},${a.title},${a.message},${a.read ? 'Leída' : 'No leída'}`
        ).join('\n');
        
        this.downloadFile('alertas.csv', headers + rows);
    }
    
    exportHistory() {
        if (!this.historyData || this.historyData.length === 0) {
            alert('No hay datos históricos para exportar');
            return;
        }
        
        const headers = 'Fecha,Temperatura,Humedad,Gas,Puerta,Voltaje,Corriente,Potencia\n';
        const rows = this.historyData.map(d => 
            `${this.formatTime(d.timestamp)},${d.temperature || ''},${d.humidity || ''},${d.gas || ''},${d.door !== undefined ? (d.door === 1 ? 'Abierta' : 'Cerrada') : ''},${d.voltage || ''},${d.current || ''},${d.power || ''}`
        ).join('\n');
        
        this.downloadFile('historico.csv', headers + rows);
    }
    
    downloadFile(filename, content) {
        try {
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`✅ Archivo ${filename} descargado`);
        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            alert('Error al descargar el archivo');
        }
    }
    
    // ============================================
    // UTILIDADES
    // ============================================
    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return '--:--';
        }
    }
    
    formatShortTime(timestamp) {
        if (!timestamp) return '--:--';
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '--:--';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============================================
    // DESTRUIR
    // ============================================
    destroy() {
        console.log('🧹 Limpiando módulos...');
        
        // Limpiar listeners
        if (this._sensorListener && typeof this._sensorListener === 'function') {
            try {
                this._sensorListener();
            } catch (error) {}
        }
        
        if (this._alertListener && typeof this._alertListener === 'function') {
            try {
                this._alertListener();
            } catch (error) {}
        }
        
        // Limpiar intervalos
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Destruir gráficos
        Object.keys(this.historyCharts).forEach(key => {
            try {
                if (this.historyCharts[key] && typeof this.historyCharts[key].destroy === 'function') {
                    this.historyCharts[key].destroy();
                }
            } catch (error) {}
        });
        this.historyCharts = {};
        
        this.isInitialized = false;
        console.log('✅ Módulos limpiados');
    }
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Inicializando módulos...');
    
    // Evitar duplicados
    if (window.modulesManager) {
        console.warn('⚠️ modulesManager ya existe, limpiando...');
        try {
            window.modulesManager.destroy();
        } catch (error) {}
        delete window.modulesManager;
    }
    
    window.modulesManager = new ModulesManager();
    
    // Limpiar al cerrar la página
    window.addEventListener('beforeunload', () => {
        if (window.modulesManager && typeof window.modulesManager.destroy === 'function') {
            window.modulesManager.destroy();
        }
    });
    
    console.log('✅ ModulesManager inicializado globalmente');
});

console.log('📦 modules.js cargado');