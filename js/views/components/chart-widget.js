/**
 * ==========================================
 * SMART MONITOR - CHART WIDGET
 * ==========================================
 * 
 * Archivo: views/components/chart-widget.js
 * Propósito: Componente de gráficos con Chart.js
 * 
 * Este archivo maneja:
 * - Inicialización de gráficos
 * - Actualización en tiempo real
 * - Gestión de períodos
 * - Exportación de gráficos
 * - Datos mock para desarrollo
 * 
 * Dependencias: Chart.js (CDN), FirebaseService
 */

// ==========================================
// CHART MANAGER
// ==========================================

class ChartManager {
    constructor() {
        this.charts = {};
        this.data = {
            temperature: [],
            humidity: [],
            gas: [],
            timestamps: []
        };
        this.maxDataPoints = 60;
        this.currentPeriod = 10; // minutos
        this.isInitialized = false;
        this.updateQueue = [];
        this.isUpdating = false;
        this.batchSize = 5;
        this.lastUpdateTime = 0;
        this.updateThrottle = 100; // ms entre actualizaciones
        
        // Configuración de colores
        this.colors = {
            temperature: {
                border: '#EF4444',
                background: 'rgba(239, 68, 68, 0.1)',
                fill: 'rgba(239, 68, 68, 0.05)'
            },
            humidity: {
                border: '#3B82F6',
                background: 'rgba(59, 130, 246, 0.1)',
                fill: 'rgba(59, 130, 246, 0.05)'
            },
            gas: {
                border: '#F59E0B',
                background: 'rgba(245, 158, 11, 0.1)',
                fill: 'rgba(245, 158, 11, 0.05)'
            }
        };
        
        // Umbrales para zonas de alerta
        this.thresholds = {
            temperature: {
                warning: 4,
                danger: 8
            },
            humidity: {
                warning: 80,
                danger: 90
            },
            gas: {
                warning: 200,
                danger: 500
            }
        };
        
        this.initCharts();
        this.setupResizeHandler();
    }
    
    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    
    initCharts() {
        try {
            // Verificar que Chart.js está disponible
            if (typeof Chart === 'undefined') {
                console.error('❌ Chart.js no está cargado');
                this.showChartError('Chart.js no está disponible');
                return;
            }
            
            console.log('📊 Inicializando gráficos...');
            
            // Configuración común de gráficos
            const commonOptions = this.getCommonOptions();
            
            // Inicializar gráficos
            this.initTemperatureChart(commonOptions);
            this.initHumidityChart(commonOptions);
            this.initGasChart(commonOptions);
            
            this.isInitialized = true;
            console.log('📊 Gráficos inicializados correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando gráficos:', error);
            this.showChartError('Error al cargar los gráficos');
        }
    }
    
    // ==========================================
    // CONFIGURACIÓN DE GRÁFICOS
    // ==========================================
    
    getCommonOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 300,
                easing: 'easeOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        boxWidth: 12,
                        padding: 12,
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: {
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 12
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                                if (context.dataset.label === 'Temperatura') {
                                    label += '°C';
                                } else if (context.dataset.label === 'Humedad') {
                                    label += '%';
                                } else if (context.dataset.label === 'Gas') {
                                    label += ' ppm';
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 12,
                        font: {
                            size: 10
                        },
                        color: '#9CA3AF'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        },
                        color: '#9CA3AF',
                        padding: 8
                    }
                }
            }
        };
    }
    
    // ==========================================
    // INICIALIZAR GRÁFICOS INDIVIDUALES
    // ==========================================
    
    initTemperatureChart(commonOptions) {
        var ctx = document.getElementById('tempChart');
        if (!ctx) return;
        
        var options = {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    min: -5,
                    max: 15,
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                }
            }
        };
        
        this.charts.temperature = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Temperatura',
                        data: [],
                        borderColor: this.colors.temperature.border,
                        backgroundColor: this.colors.temperature.fill,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: this.colors.temperature.border,
                        spanGaps: false
                    }
                ]
            },
            options: options
        });
    }
    
    initHumidityChart(commonOptions) {
        var ctx = document.getElementById('humidityChart');
        if (!ctx) return;
        
        var options = {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humedad (%)',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                }
            }
        };
        
        this.charts.humidity = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Humedad',
                        data: [],
                        borderColor: this.colors.humidity.border,
                        backgroundColor: this.colors.humidity.fill,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: this.colors.humidity.border,
                        spanGaps: false
                    }
                ]
            },
            options: options
        });
    }
    
    initGasChart(commonOptions) {
        var ctx = document.getElementById('gasChart');
        if (!ctx) return;
        
        var options = {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    ...commonOptions.scales.y,
                    min: 0,
                    max: 1000,
                    title: {
                        display: true,
                        text: 'Gas (ppm)',
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#6B7280'
                    }
                }
            }
        };
        
        this.charts.gas = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Gas',
                        data: [],
                        borderColor: this.colors.gas.border,
                        backgroundColor: this.colors.gas.fill,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: this.colors.gas.border,
                        spanGaps: false
                    }
                ]
            },
            options: options
        });
    }
    
    // ==========================================
    // MANEJO DE DATOS
    // ==========================================
    
    addDataPoint(data) {
        try {
            // Validar datos
            if (!data || typeof data !== 'object') {
                console.warn('⚠️ Datos inválidos para gráfico:', data);
                return;
            }
            
            // Verificar que hay al menos un valor
            var hasValue = data.temperature !== null || 
                          data.humidity !== null || 
                          data.gas !== null;
            if (!hasValue) return;
            
            // Prevenir duplicados (mismo timestamp)
            var timestamp = data.timestamp || Date.now();
            var lastTimestamp = this.data.timestamps.length > 0 ? 
                this.data.timestamps[this.data.timestamps.length - 1] : null;
            
            // Si el timestamp es igual al último, actualizar en lugar de agregar
            if (lastTimestamp === timestamp) {
                this.updateLastDataPoint(data);
                return;
            }
            
            // Formatear timestamp
            var time = new Date(timestamp);
            var label = time.getHours().toString().padStart(2, '0') + ':' + 
                       time.getMinutes().toString().padStart(2, '0');
            
            // Agregar a la cola de actualización
            this.updateQueue.push({
                timestamp: timestamp,
                label: label,
                temperature: data.temperature,
                humidity: data.humidity,
                gas: data.gas
            });
            
            // Procesar cola si no está actualizando
            if (!this.isUpdating) {
                this.processUpdateQueue();
            }
            
        } catch (error) {
            console.error('❌ Error agregando punto de datos:', error);
        }
    }
    
    processUpdateQueue() {
        if (this.updateQueue.length === 0) {
            this.isUpdating = false;
            return;
        }
        
        this.isUpdating = true;
        
        // Tomar un lote de datos
        var batch = this.updateQueue.splice(0, this.batchSize);
        
        for (var i = 0; i < batch.length; i++) {
            var item = batch[i];
            // Agregar datos
            if (item.temperature !== null && item.temperature !== undefined) {
                this.data.temperature.push(item.temperature);
            }
            if (item.humidity !== null && item.humidity !== undefined) {
                this.data.humidity.push(item.humidity);
            }
            if (item.gas !== null && item.gas !== undefined) {
                this.data.gas.push(item.gas);
            }
            this.data.timestamps.push(item.label);
        }
        
        // Limitar tamaño
        this.trimData();
        
        // Actualizar gráficos con throttling
        this.throttledUpdate();
        
        // Procesar siguiente lote
        if (this.updateQueue.length > 0) {
            setTimeout(this.processUpdateQueue.bind(this), 50);
        } else {
            this.isUpdating = false;
        }
    }
    
    updateLastDataPoint(data) {
        // Actualizar el último punto en lugar de agregar uno nuevo
        var lastIndex = this.data.temperature.length - 1;
        if (lastIndex >= 0) {
            if (data.temperature !== null && data.temperature !== undefined) {
                this.data.temperature[lastIndex] = data.temperature;
            }
            if (data.humidity !== null && data.humidity !== undefined) {
                this.data.humidity[lastIndex] = data.humidity;
            }
            if (data.gas !== null && data.gas !== undefined) {
                this.data.gas[lastIndex] = data.gas;
            }
            this.throttledUpdate();
        }
    }
    
    trimData() {
        var maxPoints = this.maxDataPoints;
        var dataKeys = ['temperature', 'humidity', 'gas'];
        
        for (var i = 0; i < dataKeys.length; i++) {
            var key = dataKeys[i];
            if (this.data[key].length > maxPoints) {
                this.data[key] = this.data[key].slice(-maxPoints);
            }
        }
        
        if (this.data.timestamps.length > maxPoints) {
            this.data.timestamps = this.data.timestamps.slice(-maxPoints);
        }
        
        // Asegurar que todos los arrays tengan la misma longitud
        var maxLength = Math.max(
            this.data.temperature.length,
            this.data.humidity.length,
            this.data.gas.length,
            this.data.timestamps.length
        );
        
        for (var j = 0; j < dataKeys.length; j++) {
            var key2 = dataKeys[j];
            while (this.data[key2].length < maxLength) {
                this.data[key2].unshift(null);
            }
        }
        while (this.data.timestamps.length < maxLength) {
            this.data.timestamps.unshift('');
        }
    }
    
    // ==========================================
    // ACTUALIZACIÓN DE GRÁFICOS
    // ==========================================
    
    throttledUpdate() {
        var now = Date.now();
        if (now - this.lastUpdateTime >= this.updateThrottle) {
            this.updateCharts();
            this.lastUpdateTime = now;
        } else {
            // Programar actualización
            clearTimeout(this._updateTimeout);
            this._updateTimeout = setTimeout(function() {
                this.updateCharts();
                this.lastUpdateTime = Date.now();
            }.bind(this), this.updateThrottle);
        }
    }
    
    updateCharts() {
        try {
            // Actualizar gráfico de temperatura
            this.updateChart('temperature', this.colors.temperature);
            
            // Actualizar gráfico de humedad
            this.updateChart('humidity', this.colors.humidity);
            
            // Actualizar gráfico de gas si existe
            if (this.charts.gas) {
                this.updateChart('gas', this.colors.gas);
            }
            
        } catch (error) {
            console.error('❌ Error actualizando gráficos:', error);
        }
    }
    
    updateChart(chartKey, colors) {
        var chart = this.charts[chartKey];
        if (!chart) return;
        
        try {
            var data = this.data[chartKey] || [];
            var labels = this.data.timestamps || [];
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            
            // Actualizar colores si hay alertas
            var thresholds = this.thresholds[chartKey];
            if (thresholds) {
                var lastValue = data[data.length - 1];
                if (lastValue !== null && lastValue !== undefined) {
                    if (lastValue > thresholds.danger) {
                        chart.data.datasets[0].borderColor = '#EF4444';
                        chart.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    } else if (lastValue > thresholds.warning) {
                        chart.data.datasets[0].borderColor = '#F59E0B';
                        chart.data.datasets[0].backgroundColor = 'rgba(245, 158, 11, 0.1)';
                    } else {
                        chart.data.datasets[0].borderColor = colors.border;
                        chart.data.datasets[0].backgroundColor = colors.fill;
                    }
                }
            }
            
            chart.update('none');
            
        } catch (error) {
            console.error('❌ Error actualizando gráfico ' + chartKey + ':', error);
        }
    }
    
    // ==========================================
    // PERÍODOS DE TIEMPO
    // ==========================================
    
    updatePeriod(minutes) {
        try {
            this.currentPeriod = Math.max(1, minutes);
            
            // Calcular puntos según el período
            var pointsPerMinute = 1;
            var totalPoints = minutes * pointsPerMinute;
            this.maxDataPoints = Math.min(totalPoints, 120);
            
            // Limpiar datos y recargar histórico
            this.clearData();
            
            // Cargar histórico con el nuevo límite
            this.loadHistory(this.maxDataPoints);
            
            console.log('📊 Período actualizado a ' + minutes + ' minutos');
            
        } catch (error) {
            console.error('❌ Error actualizando período:', error);
        }
    }
    
    clearData() {
        this.data = {
            temperature: [],
            humidity: [],
            gas: [],
            timestamps: []
        };
        this.updateQueue = [];
        this.isUpdating = false;
        this.updateCharts();
    }
    
    // ==========================================
    // CARGA DE HISTÓRICO
    // ==========================================
    
    async loadHistory(limit) {
        limit = limit || 20;
        
        try {
            // Verificar que FirebaseService está disponible
            if (typeof FirebaseService === 'undefined' || !FirebaseService.getHistory) {
                console.warn('⚠️ FirebaseService no disponible para cargar histórico');
                this.generateMockData();
                return;
            }
            
            var snapshot = await FirebaseService.getHistory(limit);
            var data = snapshot.val();
            
            if (data && typeof data === 'object') {
                var keys = Object.keys(data);
                if (keys.length === 0) {
                    // No hay datos históricos, generar datos de prueba
                    this.generateMockData();
                    return;
                }
                
                // Ordenar por timestamp
                var sortedKeys = keys.sort(function(a, b) {
                    return (data[a].timestamp || 0) - (data[b].timestamp || 0);
                });
                
                for (var i = 0; i < sortedKeys.length; i++) {
                    var key = sortedKeys[i];
                    var entry = data[key];
                    if (entry && typeof entry === 'object') {
                        this.addDataPoint({
                            temperature: entry.temperature || null,
                            humidity: entry.humidity || null,
                            gas: entry.gas || null,
                            timestamp: entry.timestamp || Date.now()
                        });
                    }
                }
                
                console.log('📊 Histórico cargado: ' + sortedKeys.length + ' puntos');
            } else {
                // No hay datos, generar mock
                this.generateMockData();
            }
            
        } catch (error) {
            console.warn('⚠️ Error cargando histórico, generando datos de prueba:', error);
            this.generateMockData();
        }
    }
    
    // ==========================================
    // DATOS MOCK
    // ==========================================
    
    generateMockData() {
        console.log('📊 Generando datos de prueba para gráficos');
        var now = Date.now();
        var points = 30;
        
        for (var i = 0; i < points; i++) {
            var timestamp = now - (points - i) * 60000; // 1 minuto entre puntos
            var mockData = {
                temperature: 2 + Math.random() * 6 + Math.sin(i / 5) * 2,
                humidity: 60 + Math.random() * 20 + Math.cos(i / 4) * 5,
                gas: 50 + Math.random() * 150 + Math.sin(i / 3) * 30,
                timestamp: timestamp
            };
            this.addDataPoint(mockData);
        }
    }
    
    // ==========================================
    // MANEJO DE RESIZE
    // ==========================================
    
    setupResizeHandler() {
        var resizeTimeout;
        var handleResize = function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                var chartKeys = Object.keys(this.charts);
                for (var i = 0; i < chartKeys.length; i++) {
                    var chart = this.charts[chartKeys[i]];
                    if (chart && typeof chart.resize === 'function') {
                        try {
                            chart.resize();
                        } catch (error) {
                            // Silenciar error de resize
                        }
                    }
                }
            }.bind(this), 250);
        }.bind(this);
        
        window.addEventListener('resize', handleResize);
        
        // Observer para cambios en el contenedor
        try {
            var observer = new ResizeObserver(function() {
                handleResize();
            });
            
            var containers = document.querySelectorAll('.chart-container');
            for (var i = 0; i < containers.length; i++) {
                if (containers[i]) {
                    observer.observe(containers[i]);
                }
            }
        } catch (error) {
            // ResizeObserver no soportado
        }
    }
    
    // ==========================================
    // EXPORTACIÓN DE GRÁFICOS
    // ==========================================
    
    exportChart(chartKey, format) {
        format = format || 'png';
        var chart = this.charts[chartKey];
        if (!chart) return null;
        
        try {
            var canvas = chart.canvas;
            if (format === 'png') {
                return canvas.toDataURL('image/png');
            } else if (format === 'jpeg') {
                return canvas.toDataURL('image/jpeg', 0.9);
            }
        } catch (error) {
            console.error('❌ Error exportando gráfico:', error);
            return null;
        }
    }
    
    downloadChart(chartKey, filename) {
        filename = filename || 'grafico';
        var dataUrl = this.exportChart(chartKey);
        if (!dataUrl) return;
        
        try {
            var link = document.createElement('a');
            link.download = filename + '.png';
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('❌ Error descargando gráfico:', error);
        }
    }
    
    // ==========================================
    // MANEJO DE ERRORES
    // ==========================================
    
    showChartError(message) {
        var containers = document.querySelectorAll('.chart-container');
        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];
            if (container && !container.querySelector('canvas')) {
                container.innerHTML = 
                    '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6B7280;flex-direction:column;gap:8px;">' +
                        '<i class="fas fa-chart-line" style="font-size:24px;opacity:0.5;"></i>' +
                        '<span style="font-size:14px;">' + message + '</span>' +
                    '</div>';
            }
        }
    }
    
    // ==========================================
    // LIMPIEZA
    // ==========================================
    
    destroy() {
        var chartKeys = Object.keys(this.charts);
        for (var i = 0; i < chartKeys.length; i++) {
            try {
                if (this.charts[chartKeys[i]] && typeof this.charts[chartKeys[i]].destroy === 'function') {
                    this.charts[chartKeys[i]].destroy();
                }
            } catch (error) {
                // Silenciar error
            }
        }
        this.charts = {};
        this.data = {
            temperature: [],
            humidity: [],
            gas: [],
            timestamps: []
        };
        this.updateQueue = [];
        this.isUpdating = false;
        
        console.log('🧹 Gráficos destruidos correctamente');
    }
}

// ==========================================
// INSTANCIAR Y EXPORTAR
// ==========================================

// Crear instancia global
var chartManager = new ChartManager();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.chartManager = chartManager;
    window.ChartManager = ChartManager;
}

console.log('📊 Chart Widget inicializado');