/**
 * ==========================================
 * SMART MONITOR - ENERGY CONTROLLER
 * ==========================================
 * 
 * Archivo: controllers/energy-controller.js
 * Propósito: Controlador de monitoreo energético
 * 
 * Este archivo maneja:
 * - Datos del PZEM004T (voltaje, corriente, potencia, energía)
 * - Cálculo de factor de potencia
 * - Alertas eléctricas
 * - Estadísticas de consumo
 * 
 * @module controllers/energy-controller
 * @version 2.0.0
 */

class EnergyController {
    constructor() {
        this.data = {
            voltage: null,
            current: null,
            power: null,
            energy: null,
            powerFactor: null,
            frequency: null,
            timestamp: null
        };
        
        this.history = [];
        this.maxHistory = 100;
        this.isInitialized = false;
        this.listeners = [];
        this.alertCooldown = {};
        
        this.init();
    }
    
    init() {
        try {
            console.log('⚡ Inicializando Energy Controller...');
            
            // Configurar listeners de Firebase
            this.setupFirebaseListeners();
            
            // Configurar UI
            this.setupUI();
            
            this.isInitialized = true;
            console.log('✅ Energy Controller inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando Energy Controller:', error);
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
            
            // Escuchar datos eléctricos
            const listener = fb.onSensorData(this.handleElectricalData.bind(this));
            if (listener) this.listeners.push(listener);
            
        } catch (error) {
            console.error('❌ Error configurando listeners eléctricos:', error);
        }
    }
    
    handleElectricalData(data) {
        try {
            if (!data || typeof data !== 'object') return;
            
            // La estructura ahora incluye voltage, current, power, energy desde sensors/{deviceId}/live
            const validated = {
                voltage: this.validateVoltage(data.voltage),
                current: this.validateCurrent(data.current),
                power: this.validatePower(data.power),
                energy: this.validateEnergy(data.energy),
                powerFactor: this.validatePowerFactor(data.powerFactor),
                frequency: this.validateFrequency(data.frequency),
                timestamp: data.timestamp || Date.now()
            };
            
            // Verificar que hay al menos un valor eléctrico
            const hasValue = validated.voltage !== null || 
                        validated.current !== null || 
                        validated.power !== null;
            
            if (!hasValue) return;
            
            this.data = validated;
            
            // Guardar en histórico
            this.addToHistory(validated);
            
            // Actualizar UI
            this.updateUI();
            
            // Verificar alertas
            this.checkAlerts();
            
        } catch (error) {
            console.error('❌ Error procesando datos eléctricos:', error);
        }
    }
    
    // ==========================================
    // VALIDACIONES
    // ==========================================
    
    validateVoltage(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(300, num));
    }
    
    validateCurrent(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(50, num));
    }
    
    validatePower(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(5000, num));
    }
    
    validateEnergy(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(999999, num));
    }
    
    validatePowerFactor(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(1, num));
    }
    
    validateFrequency(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        return Math.max(0, Math.min(100, num));
    }
    
    // ==========================================
    // HISTÓRICO
    // ==========================================
    
    addToHistory(data) {
        this.history.push({
            ...data,
            timestamp: data.timestamp || Date.now()
        });
        
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
    }
    
    getHistory(limit) {
        limit = limit || 20;
        return this.history.slice(-limit);
    }
    
    getStats() {
        if (this.history.length === 0) {
            return {
                avgVoltage: 0,
                avgCurrent: 0,
                avgPower: 0,
                maxPower: 0,
                minPower: 0,
                totalEnergy: 0
            };
        }
        
        var totalVoltage = 0;
        var totalCurrent = 0;
        var totalPower = 0;
        var maxPower = 0;
        var minPower = Infinity;
        
        for (var i = 0; i < this.history.length; i++) {
            var entry = this.history[i];
            if (entry.voltage !== null) totalVoltage += entry.voltage;
            if (entry.current !== null) totalCurrent += entry.current;
            if (entry.power !== null) {
                totalPower += entry.power;
                if (entry.power > maxPower) maxPower = entry.power;
                if (entry.power < minPower) minPower = entry.power;
            }
        }
        
        var count = this.history.length;
        var lastEntry = this.history[this.history.length - 1];
        
        return {
            avgVoltage: totalVoltage / count,
            avgCurrent: totalCurrent / count,
            avgPower: totalPower / count,
            maxPower: maxPower,
            minPower: minPower === Infinity ? 0 : minPower,
            totalEnergy: lastEntry && lastEntry.energy ? lastEntry.energy : 0
        };
    }
    
    // ==========================================
    // ALERTAS
    // ==========================================
    
    checkAlerts() {
        try {
            const now = Date.now();
            
            // Verificar voltaje
            if (this.data.voltage !== null) {
                if (this.data.voltage < 190) {
                    this.addAlert('warning', '⚠️ Bajo voltaje', 
                        'Voltaje: ' + this.data.voltage.toFixed(1) + 'V');
                } else if (this.data.voltage > 240) {
                    this.addAlert('warning', '⚠️ Alto voltaje', 
                        'Voltaje: ' + this.data.voltage.toFixed(1) + 'V');
                } else if (this.data.voltage < 170 || this.data.voltage > 260) {
                    this.addAlert('danger', '🚨 Voltaje crítico', 
                        'Voltaje: ' + this.data.voltage.toFixed(1) + 'V');
                }
            }
            
            // Verificar corriente
            if (this.data.current !== null && this.data.current > 15) {
                this.addAlert('danger', '🚨 Sobrecorriente', 
                    'Corriente: ' + this.data.current.toFixed(2) + 'A');
            } else if (this.data.current !== null && this.data.current > 10) {
                this.addAlert('warning', '⚠️ Corriente elevada', 
                    'Corriente: ' + this.data.current.toFixed(2) + 'A');
            }
            
            // Verificar potencia
            if (this.data.power !== null && this.data.power > 3500) {
                this.addAlert('danger', '🚨 Alta potencia', 
                    'Potencia: ' + this.data.power.toFixed(0) + 'W');
            } else if (this.data.power !== null && this.data.power > 2500) {
                this.addAlert('warning', '⚠️ Potencia elevada', 
                    'Potencia: ' + this.data.power.toFixed(0) + 'W');
            }
            
        } catch (error) {
            console.error('❌ Error verificando alertas eléctricas:', error);
        }
    }
    
    addAlert(type, title, message) {
        try {
            const alertKey = type + '-energy-' + message;
            const now = Date.now();
            
            if (this.alertCooldown[alertKey] && 
                (now - this.alertCooldown[alertKey]) < 120000) {
                return;
            }
            
            this.alertCooldown[alertKey] = now;
            
            // Usar el sistema de alertas global
            if (window.alertsController) {
                window.alertsController.addAlert(type, title, message);
            } else if (window.dashboard) {
                window.dashboard.addAlert(type, title, message);
            }
            
        } catch (error) {
            console.error('❌ Error agregando alerta eléctrica:', error);
        }
    }
    
    // ==========================================
    // UI UPDATES
    // ==========================================
    
    setupUI() {
        // Actualizar cada 5 segundos
        setInterval(this.updateUI.bind(this), 5000);
    }
    
    updateUI() {
        try {
            this.updateEnergyKPIs();
            this.updateEnergyCharts();
        } catch (error) {
            console.error('❌ Error actualizando UI energética:', error);
        }
    }
    
    updateEnergyKPIs() {
        // Actualizar voltaje
        var voltageEl = document.getElementById('voltageValue');
        if (voltageEl) {
            voltageEl.textContent = this.data.voltage !== null ? 
                this.data.voltage.toFixed(1) : '--';
        }
        
        // Actualizar corriente
        var currentEl = document.getElementById('currentValue');
        if (currentEl) {
            currentEl.textContent = this.data.current !== null ? 
                this.data.current.toFixed(2) : '--';
        }
        
        // Actualizar potencia
        var powerEl = document.getElementById('powerValue');
        if (powerEl) {
            powerEl.textContent = this.data.power !== null ? 
                this.data.power.toFixed(0) : '--';
        }
        
        // Actualizar energía
        var energyEl = document.getElementById('energyValue');
        if (energyEl) {
            energyEl.textContent = this.data.energy !== null ? 
                this.data.energy.toFixed(2) : '--';
        }
        
        // Actualizar factor de potencia
        var pfEl = document.getElementById('powerFactorValue');
        if (pfEl) {
            pfEl.textContent = this.data.powerFactor !== null ? 
                this.data.powerFactor.toFixed(2) : '--';
        }
        
        // Actualizar estado del voltaje
        var voltageStatus = document.getElementById('voltageStatus');
        if (voltageStatus && this.data.voltage !== null) {
            if (this.data.voltage < 170 || this.data.voltage > 260) {
                voltageStatus.textContent = '🚨 Crítico';
                voltageStatus.className = 'status-label danger';
            } else if (this.data.voltage < 190 || this.data.voltage > 240) {
                voltageStatus.textContent = '⚠️ Atención';
                voltageStatus.className = 'status-label warning';
            } else {
                voltageStatus.textContent = '✅ Normal';
                voltageStatus.className = 'status-label normal';
            }
        }
    }
    
    updateEnergyCharts() {
        // Actualizar gráfico de voltaje
        if (window.chartManager && window.chartManager.charts.voltage) {
            var labels = [];
            var data = [];
            var history = this.getHistory(30);
            
            for (var i = 0; i < history.length; i++) {
                var entry = history[i];
                var time = new Date(entry.timestamp);
                labels.push(time.getHours() + ':' + 
                           String(time.getMinutes()).padStart(2, '0'));
                data.push(entry.voltage !== null ? entry.voltage : 0);
            }
            
            var chart = window.chartManager.charts.voltage;
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update('none');
        }
    }
    
    // ==========================================
    // EXPORTACIÓN DE DATOS
    // ==========================================
    
    exportData(format) {
        format = format || 'json';
        try {
            var data = {
                current: this.data,
                history: this.history,
                stats: this.getStats(),
                exportedAt: new Date().toISOString()
            };
            
            if (format === 'json') {
                var json = JSON.stringify(data, null, 2);
                var blob = new Blob([json], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'energia_' + new Date().toISOString().slice(0,10) + '.json';
                a.click();
                URL.revokeObjectURL(url);
                return true;
            } else if (format === 'csv') {
                var headers = ['Timestamp', 'Voltaje(V)', 'Corriente(A)', 'Potencia(W)', 'Energía(kWh)'];
                var rows = [];
                for (var i = 0; i < this.history.length; i++) {
                    var entry = this.history[i];
                    rows.push([
                        new Date(entry.timestamp).toISOString(),
                        entry.voltage !== null ? entry.voltage.toFixed(1) : '',
                        entry.current !== null ? entry.current.toFixed(2) : '',
                        entry.power !== null ? entry.power.toFixed(0) : '',
                        entry.energy !== null ? entry.energy.toFixed(2) : ''
                    ]);
                }
                var csv = [headers, ...rows].map(function(row) { return row.join(','); }).join('\n');
                var blob = new Blob([csv], { type: 'text/csv' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'energia_' + new Date().toISOString().slice(0,10) + '.csv';
                a.click();
                URL.revokeObjectURL(url);
                return true;
            }
        } catch (error) {
            console.error('❌ Error exportando datos energéticos:', error);
            return false;
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
        this.history = [];
        this.isInitialized = false;
        console.log('🧹 Energy Controller limpiado');
    }
}

// ==========================================
// INSTANCIAR
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    try {
        window.energyController = new EnergyController();
        
        window.addEventListener('beforeunload', function() {
            if (window.energyController && typeof window.energyController.destroy === 'function') {
                window.energyController.destroy();
            }
        });
        
    } catch (error) {
        console.error('❌ Error inicializando Energy Controller:', error);
    }
});