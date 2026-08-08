/**
 * ==========================================
 * SMART MONITOR - FIREBASE SERVICE
 * ==========================================
 * 
 * Archivo: services/firebase-service.js
 * Propósito: Servicio de comunicación con Firebase
 * 
 * Este archivo alinea las operaciones con la estructura
 * existente de la base de datos.
 */

// ==========================================
// CACHE LOCAL
// ==========================================

class FirebaseCache {
    constructor() {
        this.cache = {};
        this.cacheTimeout = 60000;
        this.pendingWrites = [];
        this.isOnline = navigator.onLine;
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processPendingWrites();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
        
        this.loadPendingWrites();
    }
    
    get(key) {
        const cached = this.cache[key];
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            delete this.cache[key];
            return null;
        }
        return cached.data;
    }
    
    set(key, data) {
        this.cache[key] = {
            data: data,
            timestamp: Date.now()
        };
    }
    
    clear() {
        this.cache = {};
    }
    
    addPendingWrite(path, data) {
        this.pendingWrites.push({
            path: path,
            data: data,
            timestamp: Date.now(),
            id: Date.now() + Math.random()
        });
        this.savePendingWrites();
    }
    
    savePendingWrites() {
        try {
            localStorage.setItem('firebase_pending', JSON.stringify(this.pendingWrites));
        } catch (error) {
            console.warn('⚠️ No se pudieron guardar escrituras pendientes:', error);
        }
    }
    
    loadPendingWrites() {
        try {
            const stored = localStorage.getItem('firebase_pending');
            if (stored) {
                this.pendingWrites = JSON.parse(stored);
                console.log('📦 Escrituras pendientes cargadas:', this.pendingWrites.length);
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar escrituras pendientes:', error);
        }
    }
    
    async processPendingWrites() {
        if (!this.isOnline || this.pendingWrites.length === 0) return;
        
        console.log('📤 Procesando ' + this.pendingWrites.length + ' escrituras pendientes...');
        
        const writes = [...this.pendingWrites];
        let successCount = 0;
        
        for (const write of writes) {
            try {
                await FirebaseService.setData(write.path, write.data);
                this.pendingWrites = this.pendingWrites.filter(w => w.id !== write.id);
                successCount++;
            } catch (error) {
                console.warn('⚠️ Error procesando escritura:', error);
            }
        }
        
        this.savePendingWrites();
        console.log('✅ ' + successCount + ' escrituras pendientes procesadas');
    }
}

// ==========================================
// SERVICIO PRINCIPAL
// ==========================================

class FirebaseServiceClass {
    constructor() {
        this.deviceId = FirebaseConfig ? FirebaseConfig.DEFAULT_DEVICE_ID : 'esp32_001';
        this.database = FirebaseConfig ? FirebaseConfig.database : null;
        this.cache = new FirebaseCache();
        this.isConnected = false;
        this.listeners = [];
        
        this.setupConnectionMonitoring();
        console.log('📡 Firebase Service inicializado para dispositivo:', this.deviceId);
    }
    
    // ==========================================
    // CONEXIÓN
    // ==========================================
    
    setupConnectionMonitoring() {
        if (!this.database) return;
        
        const connectedRef = this.database.ref('.info/connected');
        const listener = connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            this.isConnected = connected;
            console.log('📡 Estado de conexión:', connected ? 'Conectado' : 'Desconectado');
            
            if (connected && this.cache.pendingWrites.length > 0) {
                this.cache.processPendingWrites();
            }
        });
        
        this.listeners.push(listener);
    }
    
    checkConnection() {
        return new Promise((resolve) => {
            if (!this.database) {
                resolve(false);
                return;
            }
            
            this.database.ref('.info/connected').once('value')
                .then(snapshot => {
                    this.isConnected = snapshot.val() === true;
                    resolve(this.isConnected);
                })
                .catch(() => {
                    this.isConnected = false;
                    resolve(false);
                });
        });
    }
    
    // ==========================================
    // SENSORES (Estructura: sensors/{deviceId}/live)
    // ==========================================
    
    getSensorData(deviceId, useCache) {
        deviceId = deviceId || this.deviceId;
        useCache = useCache !== undefined ? useCache : true;
        
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const path = 'sensors/' + deviceId + '/live';
            const cacheKey = 'sensors_' + deviceId;
            
            if (useCache) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    resolve(cached);
                    return;
                }
            }
            
            this.database.ref(path).once('value')
                .then(snapshot => {
                    const data = snapshot.val();
                    if (data) {
                        this.cache.set(cacheKey, data);
                        resolve(data);
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        });
    }
    
    onSensorData(callback, deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) {
            console.error('❌ Firebase no inicializado');
            return null;
        }
        
        const path = 'sensors/' + deviceId + '/live';
        const cacheKey = 'sensors_' + deviceId;
        
        const cached = this.cache.get(cacheKey);
        if (cached) {
            callback(cached);
        }
        
        const listener = this.database.ref(path).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.cache.set(cacheKey, data);
                callback(data);
            } else {
                callback(null);
            }
        });
        
        this.listeners.push(listener);
        return listener;
    }
    
    async setSensorData(data, deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) {
            throw new Error('Firebase no inicializado');
        }
        
        const path = 'sensors/' + deviceId + '/live';
        const cacheKey = 'sensors_' + deviceId;
        
        if (!this.isConnected) {
            this.cache.addPendingWrite(path, data);
            return { success: true, pending: true };
        }
        
        try {
            await this.database.ref(path).update(data);
            this.cache.set(cacheKey, data);
            
            // Guardar en histórico
            await this.saveHistory(data, deviceId);
            
            return { success: true, data: data };
        } catch (error) {
            console.error('❌ Error guardando datos:', error);
            throw error;
        }
    }
    
    // ==========================================
    // HISTÓRICO (Estructura: history/{deviceId})
    // ==========================================
    
    async saveHistory(data, deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) return;
        
        try {
            const path = 'history/' + deviceId;
            const newRef = this.database.ref(path).push();
            await newRef.set({
                ...data,
                timestamp: data.timestamp || Date.now()
            });
            
            // Limitar histórico (mantener últimos 1000 registros)
            await this.cleanHistory(deviceId, 1000);
            
        } catch (error) {
            console.warn('⚠️ Error guardando en histórico:', error);
        }
    }
    
    async cleanHistory(deviceId, limit) {
        deviceId = deviceId || this.deviceId;
        limit = limit || 1000;
        
        if (!this.database) return;
        
        try {
            const path = 'history/' + deviceId;
            const snapshot = await this.database.ref(path)
                .orderByKey()
                .limitToLast(limit + 1)
                .once('value');
            
            const data = snapshot.val();
            if (data) {
                const keys = Object.keys(data);
                if (keys.length > limit) {
                    const keysToRemove = keys.slice(0, keys.length - limit);
                    const updates = {};
                    keysToRemove.forEach(key => {
                        updates[path + '/' + key] = null;
                    });
                    await this.database.ref().update(updates);
                }
            }
        } catch (error) {
            console.warn('⚠️ Error limpiando histórico:', error);
        }
    }
    
    async getHistory(deviceId, limit) {
        deviceId = deviceId || this.deviceId;
        limit = limit || 20;
        
        if (!this.database) {
            throw new Error('Firebase no inicializado');
        }
        
        try {
            const path = 'history/' + deviceId;
            const snapshot = await this.database.ref(path)
                .orderByChild('timestamp')
                .limitToLast(limit)
                .once('value');
            
            const data = snapshot.val();
            if (!data) return [];
            
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).sort((a, b) => b.timestamp - a.timestamp);
            
        } catch (error) {
            console.error('❌ Error obteniendo histórico:', error);
            throw error;
        }
    }
    
    // ==========================================
    // ALERTAS (Estructura: alerts/{deviceId})
    // ==========================================
    
    onAlerts(callback, deviceId, limit) {
        deviceId = deviceId || this.deviceId;
        limit = limit || 10;
        
        if (!this.database) {
            console.error('❌ Firebase no inicializado');
            return null;
        }
        
        const path = 'alerts/' + deviceId;
        
        const listener = this.database.ref(path)
            .orderByChild('timestamp')
            .limitToLast(limit)
            .on('value', (snapshot) => {
                const alerts = [];
                snapshot.forEach((child) => {
                    const alert = child.val();
                    if (alert) {
                        alerts.push({
                            id: child.key,
                            ...alert
                        });
                    }
                });
                callback(alerts.reverse());
            });
        
        this.listeners.push(listener);
        return listener;
    }
    
    async saveAlert(alertData, deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) {
            throw new Error('Firebase no inicializado');
        }
        
        const validated = {
            type: this.validateAlertType(alertData.type),
            category: alertData.category || 'general',
            title: this.sanitizeString(alertData.title || 'Alerta'),
            message: this.sanitizeString(alertData.message || ''),
            value: alertData.value || null,
            threshold: alertData.threshold || null,
            timestamp: Date.now(),
            read: false,
            acknowledged: false
        };
        
        if (!this.isConnected) {
            const path = 'alerts/' + deviceId;
            this.cache.addPendingWrite(path + '/' + Date.now(), validated);
            return { success: true, pending: true };
        }
        
        try {
            const path = 'alerts/' + deviceId;
            const newRef = this.database.ref(path).push();
            await newRef.set(validated);
            return { success: true, id: newRef.key, data: validated };
        } catch (error) {
            console.error('❌ Error guardando alerta:', error);
            throw error;
        }
    }
    
    validateAlertType(type) {
        const validTypes = ['danger', 'warning', 'info', 'success', 'critical'];
        return validTypes.indexOf(type) !== -1 ? type : 'info';
    }
    
    sanitizeString(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ==========================================
    // CONFIGURACIÓN (Estructura: configuration/{deviceId})
    // ==========================================
    
    async getConfig(deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) {
            throw new Error('Firebase no inicializado');
        }
        
        try {
            const path = 'configuration/' + deviceId;
            const snapshot = await this.database.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('❌ Error obteniendo configuración:', error);
            throw error;
        }
    }
    
    async updateConfig(configData, deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) {
            throw new Error('Firebase no inicializado');
        }
        
        try {
            const path = 'configuration/' + deviceId;
            await this.database.ref(path).update(configData);
            return { success: true };
        } catch (error) {
            console.error('❌ Error actualizando configuración:', error);
            throw error;
        }
    }
    
    // ==========================================
    // SEGURIDAD (Estructura: security/{deviceId})
    // ==========================================
    
    async getSecurityStatus(deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) return null;
        
        try {
            const path = 'security/' + deviceId;
            const snapshot = await this.database.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('❌ Error obteniendo estado de seguridad:', error);
            return null;
        }
    }
    
    async updateSecurityStatus(data, deviceId) {
        deviceId = deviceId || this.deviceId;
        
        if (!this.database) {
            throw new Error('Firebase no inicializado');
        }
        
        try {
            const path = 'security/' + deviceId;
            await this.database.ref(path).update(data);
            return { success: true };
        } catch (error) {
            console.error('❌ Error actualizando seguridad:', error);
            throw error;
        }
    }
    
    // ==========================================
    // UTILIDADES
    // ==========================================
    
    setData(path, data) {
        if (!this.database) {
            return Promise.reject(new Error('Firebase no inicializado'));
        }
        
        return this.database.ref(path).set(data);
    }
    
    updateData(path, data) {
        if (!this.database) {
            return Promise.reject(new Error('Firebase no inicializado'));
        }
        
        return this.database.ref(path).update(data);
    }
    
    deleteData(path) {
        if (!this.database) {
            return Promise.reject(new Error('Firebase no inicializado'));
        }
        
        return this.database.ref(path).remove();
    }
    
    // ==========================================
    // LIMPIEZA
    // ==========================================
    
    cleanup() {
        this.listeners.forEach(listener => {
            if (listener && typeof listener === 'function') {
                try { listener(); } catch (error) {}
            }
        });
        this.listeners = [];
        console.log('🧹 Firebase Service limpiado');
    }
}

// ==========================================
// INSTANCIAR Y EXPORTAR
// ==========================================

const FirebaseService = new FirebaseServiceClass();

if (typeof window !== 'undefined') {
    window.FirebaseService = FirebaseService;
    console.log('📡 FirebaseService exportado globalmente');
}

console.log('📦 Firebase Service inicializado');