/**
 * ==========================================
 * SMART MONITOR - SERVICE WORKER
 * ==========================================
 *
 * Archivo: sw.js
 * Propósito: Caché offline y carga instantánea
 *
 * @version 2.0.0
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const CACHE_NAME = 'smart-monitor-v3';
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/config/firebase-config.js',
    '/js/config/constants.js',
    '/js/config/environment.js',
    '/js/utils/validators.js',
    '/js/utils/formatters.js',
    '/js/utils/dom-utils.js',
    '/js/utils/performance.js',
    '/js/services/firebase-service.js',
    '/js/services/alert-service.js',
    '/js/controllers/dashboard-controller.js',
    '/js/controllers/alerts-controller.js',
    '/js/controllers/energy-controller.js',
    '/js/controllers/security-controller.js',
    '/js/controllers/config-controller.js',
    '/js/views/components/chart-widget.js',
    '/js/core/app.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

// ==========================================
// INSTALACIÓN
// ==========================================

self.addEventListener('install', function(event) {
    console.log('[SW] Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[SW] Cacheando recursos...');
                // Cachear solo recursos del mismo origen
                var assetsToCache = CACHE_ASSETS.filter(function(asset) {
                    // Solo cachear recursos del mismo origen (no extensiones de Chrome)
                    return !asset.startsWith('chrome-extension://');
                });
                return cache.addAll(assetsToCache)
                    .catch(function(error) {
                        console.warn('[SW] Error cacheando:', error);
                    });
            })
            .then(function() {
                console.log('[SW] Instalación completa');
                return self.skipWaiting();
            })
    );
});

// ==========================================
// ACTIVACIÓN
// ==========================================

self.addEventListener('activate', function(event) {
    console.log('[SW] Activando...');
    
    event.waitUntil(
        caches.keys()
            .then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(function() {
                console.log('[SW] Activación completa');
                return self.clients.claim();
            })
    );
});

// ==========================================
// INTERCEPTACIÓN DE PETICIONES
// ==========================================

self.addEventListener('fetch', function(event) {
    // Ignorar peticiones a extensiones de Chrome
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(cachedResponse) {
                // Si está en cache, devolverlo
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si no está en cache, hacer la petición
                return fetch(event.request)
                    .then(function(networkResponse) {
                        // Verificar que la respuesta es válida
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // Clonar la respuesta
                        var responseToCache = networkResponse.clone();
                        
                        // Guardar en cache (solo si es del mismo origen)
                        if (event.request.url.startsWith(self.location.origin)) {
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        
                        return networkResponse;
                    })
                    .catch(function() {
                        // Si falla la red y no está en cache
                        return new Response('Offline - Smart Monitor', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// ==========================================
// NOTIFICACIONES PUSH
// ==========================================

self.addEventListener('push', function(event) {
    var data = event.data ? event.data.json() : {};
    var title = data.title || 'Smart Monitor';
    var options = {
        body: data.body || 'Nueva notificación del sistema',
        icon: '/img/icon-192.png',
        badge: '/img/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Ver'
            },
            {
                action: 'dismiss',
                title: 'Cerrar'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

// ==========================================
// MANTENER CONEXIÓN
// ==========================================

self.addEventListener('message', function(event) {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});