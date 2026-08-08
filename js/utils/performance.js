/**
 * ==========================================
 * SMART MONITOR - PERFORMANCE UTILITY
 * ==========================================
 *
 * Archivo: utils/performance.js
 * Propósito: Monitoreo y optimización de rendimiento
 *
 * Este archivo maneja:
 * - Medición de tiempos de carga
 * - Monitoreo de memoria
 * - Throttling y debounce
 * - Lazy loading
 * - Virtual scrolling
 *
 * @module utils/performance
 * @version 2.0.0
 */

// ==========================================
// PERFORMANCE MONITOR
// ==========================================

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            domReady: 0,
            firstPaint: 0,
            firstContentfulPaint: 0,
            memory: 0,
            requests: 0,
            errors: 0
        };
        
        this.startTime = performance.now();
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        if (typeof window === 'undefined') return;
        
        // Medir tiempos de carga
        this.measureLoadTimes();
        
        // Monitorear memoria
        this.monitorMemory();
        
        // Monitorear errores
        this.monitorErrors();
        
        // Monitorear requests
        this.monitorRequests();
        
        this.isInitialized = true;
        
        // Reportar métricas después de la carga
        window.addEventListener('load', function() {
            setTimeout(this.reportMetrics.bind(this), 1000);
        }.bind(this));
    }
    
    measureLoadTimes() {
        const perf = window.performance;
        if (!perf) return;
        
        const nav = perf.timing;
        if (!nav) return;
        
        // Tiempo de carga completo
        this.metrics.loadTime = nav.loadEventEnd - nav.navigationStart;
        
        // DOM Ready
        this.metrics.domReady = nav.domContentLoadedEventEnd - nav.navigationStart;
        
        // First Paint
        if (perf.getEntriesByType) {
            const paint = perf.getEntriesByType('paint');
            if (paint && paint.length > 0) {
                for (var i = 0; i < paint.length; i++) {
                    if (paint[i].name === 'first-paint') {
                        this.metrics.firstPaint = paint[i].startTime;
                    }
                    if (paint[i].name === 'first-contentful-paint') {
                        this.metrics.firstContentfulPaint = paint[i].startTime;
                    }
                }
            }
        }
    }
    
    monitorMemory() {
        if (window.performance && window.performance.memory) {
            this.metrics.memory = window.performance.memory.usedJSHeapSize;
        }
        
        // Monitorear cada 30 segundos
        setInterval(function() {
            if (window.performance && window.performance.memory) {
                this.metrics.memory = window.performance.memory.usedJSHeapSize;
            }
        }.bind(this), 30000);
    }
    
    monitorErrors() {
        window.addEventListener('error', function() {
            this.metrics.errors++;
        }.bind(this));
    }
    
    monitorRequests() {
        // Monitorear XMLHttpRequest
        var originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            this._requestStart = performance.now();
            return originalOpen.apply(this, arguments);
        };
        
        var originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function() {
            this.addEventListener('loadend', function() {
                if (this.status >= 200 && this.status < 400) {
                    // Request exitoso
                }
            });
            return originalSend.apply(this, arguments);
        };
        
        // Monitorear Fetch
        if (window.fetch) {
            var originalFetch = window.fetch;
            window.fetch = function() {
                var request = arguments[0];
                return originalFetch.apply(this, arguments);
            };
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.startTime,
            timestamp: Date.now()
        };
    }
    
    reportMetrics() {
        var metrics = this.getMetrics();
        console.log('📊 [Performance] Métricas:', {
            'Carga total': (metrics.loadTime / 1000).toFixed(2) + 's',
            'DOM Ready': (metrics.domReady / 1000).toFixed(2) + 's',
            'First Paint': (metrics.firstPaint / 1000).toFixed(2) + 's',
            'FCP': (metrics.firstContentfulPaint / 1000).toFixed(2) + 's',
            'Memoria': (metrics.memory / 1024 / 1024).toFixed(2) + ' MB',
            'Errores': metrics.errors
        });
        
        // Guardar en localStorage
        try {
            var history = JSON.parse(localStorage.getItem('perf_metrics') || '[]');
            history.push(metrics);
            if (history.length > 100) {
                history = history.slice(-100);
            }
            localStorage.setItem('perf_metrics', JSON.stringify(history));
        } catch (error) {
            // Silenciar error
        }
    }
}

// ==========================================
// THROTTLE & DEBOUNCE
// ==========================================

const Throttle = {
    /**
     * Throttle: limita la ejecución de una función
     * @param {Function} fn - Función a ejecutar
     * @param {number} delay - Tiempo mínimo entre ejecuciones (ms)
     * @returns {Function} - Función throttled
     */
    throttle: function(fn, delay) {
        var lastCall = 0;
        var timeoutId = null;
        
        return function() {
            var now = Date.now();
            var context = this;
            var args = arguments;
            
            if (now - lastCall >= delay) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                lastCall = now;
                fn.apply(context, args);
            } else if (!timeoutId) {
                timeoutId = setTimeout(function() {
                    lastCall = Date.now();
                    timeoutId = null;
                    fn.apply(context, args);
                }, delay - (now - lastCall));
            }
        };
    },
    
    /**
     * Debounce: retrasa la ejecución de una función
     * @param {Function} fn - Función a ejecutar
     * @param {number} delay - Tiempo de espera (ms)
     * @returns {Function} - Función debounced
     */
    debounce: function(fn, delay) {
        var timeoutId = null;
        
        return function() {
            var context = this;
            var args = arguments;
            
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function() {
                fn.apply(context, args);
            }, delay);
        };
    },
    
    /**
     * RequestAnimationFrame: ejecuta en el próximo frame
     * @param {Function} fn - Función a ejecutar
     * @returns {Function} - Función optimizada
     */
    raf: function(fn) {
        var ticking = false;
        
        return function() {
            var context = this;
            var args = arguments;
            
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(function() {
                    ticking = false;
                    fn.apply(context, args);
                });
            }
        };
    }
};

// ==========================================
// LAZY LOADING
// ==========================================

const LazyLoad = {
    /**
     * Carga diferida de imágenes y elementos
     */
    init: function() {
        // Imágenes con data-src
        var images = document.querySelectorAll('img[data-src]');
        var observer = null;
        
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(function(img) {
                observer.observe(img);
            });
        } else {
            // Fallback
            images.forEach(function(img) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
        
        // Contenido lazy
        var lazyElements = document.querySelectorAll('.lazy-content');
        if (observer) {
            lazyElements.forEach(function(el) {
                observer.observe(el);
            });
        } else {
            lazyElements.forEach(function(el) {
                el.classList.add('loaded');
            });
        }
    }
};

// ==========================================
// VIRTUAL SCROLLING
// ==========================================

class VirtualScroll {
    constructor(container, options) {
        this.container = container;
        this.options = options || {};
        this.itemHeight = this.options.itemHeight || 50;
        this.bufferSize = this.options.bufferSize || 10;
        this.items = this.options.items || [];
        this.visibleCount = Math.ceil(container.clientHeight / this.itemHeight) + this.bufferSize;
        
        this.renderCallback = this.options.render || null;
        this.scrollTop = 0;
        this.startIndex = 0;
        
        this.init();
    }
    
    init() {
        // Crear contenedor interno
        this.content = document.createElement('div');
        this.content.style.position = 'relative';
        this.content.style.height = (this.items.length * this.itemHeight) + 'px';
        
        this.container.innerHTML = '';
        this.container.appendChild(this.content);
        this.container.addEventListener('scroll', this.onScroll.bind(this));
        
        this.render();
    }
    
    onScroll() {
        var scrollTop = this.container.scrollTop;
        var startIndex = Math.floor(scrollTop / this.itemHeight);
        
        if (startIndex !== this.startIndex) {
            this.startIndex = startIndex;
            this.render();
        }
    }
    
    render() {
        var start = Math.max(0, this.startIndex - this.bufferSize);
        var end = Math.min(this.items.length, this.startIndex + this.visibleCount + this.bufferSize);
        
        // Limpiar contenido actual
        this.content.innerHTML = '';
        
        // Renderizar elementos visibles
        for (var i = start; i < end; i++) {
            var item = this.items[i];
            var element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.top = (i * this.itemHeight) + 'px';
            element.style.left = '0';
            element.style.right = '0';
            element.style.height = this.itemHeight + 'px';
            
            if (this.renderCallback) {
                element.innerHTML = this.renderCallback(item, i);
            } else {
                element.textContent = item;
            }
            
            this.content.appendChild(element);
        }
    }
    
    setItems(items) {
        this.items = items;
        this.content.style.height = (items.length * this.itemHeight) + 'px';
        this.render();
    }
}

// ==========================================
// EXPORTAR
// ==========================================

const Performance = {
    monitor: new PerformanceMonitor(),
    throttle: Throttle.throttle,
    debounce: Throttle.debounce,
    raf: Throttle.raf,
    lazy: LazyLoad,
    VirtualScroll: VirtualScroll
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Performance = Performance;
    window.Throttle = Throttle;
    window.LazyLoad = LazyLoad;
}

console.log('📊 [Performance] Utilidades cargadas');