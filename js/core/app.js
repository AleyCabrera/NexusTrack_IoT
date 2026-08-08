/**
 * ==========================================
 * SMART MONITOR - APPLICATION CORE
 * ==========================================
 *
 * Archivo: core/app.js
 * Propósito: Punto de entrada de la aplicación
 *
 * Este archivo maneja:
 * - Inicialización de todos los módulos
 * - Gestión del ciclo de vida
 * - Configuración global
 * - Manejo de errores
 *
 * @module core/app
 * @version 2.0.0
 */

// ==========================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ==========================================

const AppConfig = {
    /** Versión de la aplicación */
    version: '2.0.0',
    
    /** Nombre de la aplicación */
    name: 'NexusTrack IoT',
    
    /** Autor */
    author: 'Aley Cabrera D Team',
    
    /** Descripción */
    description: 'Sistema de monitoreo IoT para cámaras frigoríficas'
};

// ==========================================
// CLASE PRINCIPAL DE LA APLICACIÓN
// ==========================================

class Application {
    constructor() {
        this.modules = {};
        this.isInitialized = false;
        this.startTime = Date.now();
        this.errorCount = 0;
        
        this.init();
    }
    
    /**
     * Inicializa la aplicación
     */
    init() {
        try {
            console.log('🚀 Inicializando Smart Monitor v' + AppConfig.version);
            
            // Verificar dependencias
            this.checkDependencies();
            
            // Inicializar módulos
            this.initModules();
            
            // Configurar manejo de errores global
            this.setupErrorHandling();
            
            // Configurar listeners globales
            this.setupGlobalListeners();
            
            this.isInitialized = true;
            
            console.log('✅ Aplicación inicializada correctamente');
            console.log('⏱️ Tiempo de inicio: ' + (Date.now() - this.startTime) + 'ms');
            
            // ✅ OCULTAR LOADING SCREEN DESDE EL CORE
            this.hideLoadingScreen();

            // Disparar evento de inicio
            this.dispatchEvent('app:ready');
            
        } catch (error) {
            console.error('❌ Error inicializando aplicación:', error);
            this.handleFatalError(error);
        }
    }

        setupPerformance() {
        // Throttle para eventos de scroll
        if (window.Throttle) {
            var throttledScroll = window.Throttle.throttle(function() {
                // Scroll optimizado
            }, 100);
            window.addEventListener('scroll', throttledScroll);
            
            var throttledResize = window.Throttle.debounce(function() {
                // Resize optimizado
            }, 250);
            window.addEventListener('resize', throttledResize);
        }
        
        // Lazy loading
        if (window.LazyLoad) {
            window.LazyLoad.init();
        }
        
        console.log('⚡ [Performance] Optimizaciones aplicadas');
    }

    hideLoadingScreen() {
        var loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            console.log('🔹 [App] Ocultando loading screen...');
            setTimeout(function() {
                loadingScreen.classList.add('hidden');
            }, 300);
        }
    }
    
    /**
     * Verifica que todas las dependencias estén disponibles
     */
    checkDependencies() {
        var dependencies = [
            { name: 'Firebase', check: typeof firebase !== 'undefined' },
            { name: 'FirebaseService', check: typeof window.FirebaseService !== 'undefined' },
            { name: 'Constants', check: typeof window.Constants !== 'undefined' },
            { name: 'Formatters', check: typeof window.Formatters !== 'undefined' }
        ];
        
        var missing = [];
        for (var i = 0; i < dependencies.length; i++) {
            if (!dependencies[i].check) {
                missing.push(dependencies[i].name);
            }
        }
        
        if (missing.length > 0) {
            console.warn('⚠️ Dependencias faltantes:', missing.join(', '));
        } else {
            console.log('✅ Todas las dependencias están disponibles');
        }
    }
    
    /**
     * Inicializa los módulos de la aplicación
     */
    initModules() {
        // Los módulos ya están inicializados por sus propios scripts
        // Solo verificamos que estén disponibles
        
        this.modules = {
            firebase: window.FirebaseService,
            constants: window.Constants,
            formatters: window.Formatters,
            domUtils: window.DomUtils,
            validators: window.Validators,
            dashboard: window.dashboard,
            chartManager: window.chartManager,
            alertService: window.alertService,
            alertsController: window.alertsController
        };
        
        console.log('📦 Módulos cargados:', Object.keys(this.modules).length);
    }
    
    /**
     * Configura el manejo de errores global
     */
    setupErrorHandling() {
        // Errores no capturados
        window.addEventListener('error', this.handleGlobalError.bind(this));
        
        // Promesas rechazadas
        window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
        
        console.log('🛡️ Manejo de errores configurado');
    }
    
    /**
     * Configura listeners globales
     */
    setupGlobalListeners() {
        // Evento de visibilidad de la página
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                console.log('👋 Página oculta');
            } else {
                console.log('👀 Página visible');
                this.dispatchEvent('app:visible');
            }
        }.bind(this));
        
        // Evento de conexión
        window.addEventListener('online', function() {
            console.log('📡 Conexión restablecida');
            this.dispatchEvent('app:online');
        }.bind(this));
        
        window.addEventListener('offline', function() {
            console.warn('📡 Conexión perdida');
            this.dispatchEvent('app:offline');
        }.bind(this));
        
        // Evento de cierre
        window.addEventListener('beforeunload', function() {
            console.log('👋 Cerrando aplicación...');
            this.dispatchEvent('app:beforeunload');
        }.bind(this));
        
        console.log('🔊 Listeners globales configurados');
    }
    
    /**
     * Maneja errores globales
     */
    handleGlobalError(event) {
        this.errorCount++;
        console.error('❌ Error global:', event.message);
        console.error('📍 En:', event.filename + ':' + event.lineno);
        console.error('📋 Stack:', event.error ? event.error.stack : 'No disponible');
        
        this.dispatchEvent('app:error', { error: event });
    }
    
    /**
     * Maneja errores de promesas
     */
    handlePromiseError(event) {
        this.errorCount++;
        console.error('❌ Promesa rechazada:', event.reason);
        
        this.dispatchEvent('app:promise-error', { reason: event.reason });
    }
    
    /**
     * Maneja errores fatales
     */
    handleFatalError(error) {
        // Mostrar mensaje de error en la UI
        var container = document.getElementById('errorContainer');
        if (container) {
            container.innerHTML = 
                '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;padding:20px;text-align:center;background:#0A0E17;color:#fff;">' +
                    '<div style="font-size:48px;margin-bottom:20px;">💥</div>' +
                    '<h1 style="font-size:24px;color:#EF4444;">Error de Inicialización</h1>' +
                    '<p style="color:#94A3B8;margin:16px 0;max-width:400px;">' + error.message + '</p>' +
                    '<button onclick="location.reload()" style="padding:12px 24px;background:#00D4FF;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px;">' +
                        'Recargar Aplicación' +
                    '</button>' +
                '</div>';
            container.style.display = 'block';
        } else {
            document.body.innerHTML = 
                '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;padding:20px;text-align:center;background:#0A0E17;color:#fff;">' +
                    '<div style="font-size:48px;margin-bottom:20px;">💥</div>' +
                    '<h1 style="font-size:24px;color:#EF4444;">Error de Inicialización</h1>' +
                    '<p style="color:#94A3B8;margin:16px 0;max-width:400px;">' + error.message + '</p>' +
                    '<button onclick="location.reload()" style="padding:12px 24px;background:#00D4FF;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px;">' +
                        'Recargar Aplicación' +
                    '</button>' +
                '</div>';
        }
    }
    
    /**
     * Dispara un evento personalizado
     */
    dispatchEvent(eventName, detail) {
        try {
            var event = new CustomEvent(eventName, { detail: detail });
            document.dispatchEvent(event);
        } catch (error) {
            // Silenciar error
        }
    }
    
    /**
     * Obtiene información de la aplicación
     */
    getInfo() {
        return {
            name: AppConfig.name,
            version: AppConfig.version,
            initialized: this.isInitialized,
            uptime: Date.now() - this.startTime,
            modules: Object.keys(this.modules),
            errors: this.errorCount
        };
    }
    
    /**
     * Obtiene el estado de la aplicación
     */
    getStatus() {
        var modulesStatus = {};
        for (var key in this.modules) {
            var module = this.modules[key];
            modulesStatus[key] = {
                available: typeof module !== 'undefined' && module !== null,
                initialized: module && typeof module.isInitialized !== 'undefined' ? module.isInitialized : true
            };
        }
        
        return {
            isInitialized: this.isInitialized,
            modules: modulesStatus,
            connection: window.FirebaseService ? window.FirebaseService.isConnected : false
        };
    }
    
    /**
     * Limpia la aplicación
     */
    destroy() {
        console.log('🧹 Limpiando aplicación...');
        
        // Limpiar módulos
        for (var key in this.modules) {
            var module = this.modules[key];
            if (module && typeof module.destroy === 'function') {
                try {
                    module.destroy();
                } catch (error) {
                    // Silenciar error
                }
            }
        }
        
        this.isInitialized = false;
        this.modules = {};
        
        console.log('✅ Aplicación limpiada correctamente');
    }
}

// ==========================================
// INSTANCIAR Y EXPORTAR
// ==========================================

var app = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    try {
        app = new Application();
        window.app = app;
        
        // Mostrar información en consola
        console.log('📊 Información de la aplicación:', app.getInfo());
        
        // Mostrar estado
        console.log('📈 Estado:', app.getStatus());
        
    } catch (error) {
        console.error('❌ Error fatal en la aplicación:', error);
    }
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.App = Application;
    window.app = app;
}

console.log('📦 Core de la aplicación inicializado');