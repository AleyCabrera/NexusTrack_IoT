/**
 * ==========================================
 * NEXUS TRACK IoT - FIREBASE CONFIGURATION
 * VERSIÓN CORREGIDA Y MEJORADA
 * ==========================================
 */

// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
    apiKey: "AIzaSyBGFpaIBPbluwKRcKgd1H9kuaawCInwpR4",
    authDomain: "nexustrack-iot.firebaseapp.com",
    databaseURL: "https://nexustrack-iot-default-rtdb.firebaseio.com",
    projectId: "nexustrack-iot",
    storageBucket: "nexustrack-iot.firebasestorage.app",
    messagingSenderId: "579249686412",
    appId: "1:579249686412:web:3831fc8335afd8cddcb8a9",
    measurementId: "G-5LZCB2HGFW"
};

// ========== CONSTANTES ==========
const DEVICE_ID = "esp32_001";
const MAX_RETRIES = 3;
const CACHE_TIMEOUT = 60000; // 1 minuto

// ========== INICIALIZACIÓN ==========
let firebaseInitialized = false;
let retryCount = 0;

try {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK no está cargado correctamente');
    }
    
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
    console.log('🔥 Firebase inicializado correctamente');
    
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    firebaseInitialized = false;
}

// ========== REFERENCIAS ==========
const database = firebaseInitialized ? firebase.database() : null;

// ✅ REFERENCIAS CORRECTAS CON DEVICE_ID
const sensorsRef = database ? database.ref(`sensors/${DEVICE_ID}/live`) : null;
const alertsRef = database ? database.ref(`alerts/${DEVICE_ID}`) : null;
const historyRef = database ? database.ref(`history/${DEVICE_ID}`) : null;
const devicesRef = database ? database.ref(`devices/${DEVICE_ID}`) : null;
const configRef = database ? database.ref(`configuration/${DEVICE_ID}`) : null;
const connectionRef = database ? database.ref('.info/connected') : null;

console.log('📡 Referencias Firebase configuradas:');
console.log(`  - sensorsRef: ${sensorsRef ? '✅' : '❌'} (sensors/${DEVICE_ID}/live)`);
console.log(`  - alertsRef: ${alertsRef ? '✅' : '❌'} (alerts/${DEVICE_ID})`);
console.log(`  - historyRef: ${historyRef ? '✅' : '❌'} (history/${DEVICE_ID})`);
console.log(`  - devicesRef: ${devicesRef ? '✅' : '❌'} (devices/${DEVICE_ID})`);
console.log(`  - configRef: ${configRef ? '✅' : '❌'} (configuration/${DEVICE_ID})`);

// ============================================
// SISTEMA DE CACHE
// ============================================
class FirebaseCache {
    constructor() {
        this.cache = {};
        this.cacheTimeout = CACHE_TIMEOUT;
        this.pendingWrites = [];
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
        this.pendingWrites = [];
    }
    
    addPendingWrite(path, data) {
        this.pendingWrites.push({
            path,
            data,
            timestamp: Date.now(),
            id: Date.now() + Math.random().toString(36).substr(2, 9)
        });
        this.savePendingWrites();
    }
    
    savePendingWrites() {
        try {
            localStorage.setItem('firebase_pending_writes', JSON.stringify(this.pendingWrites));
        } catch (error) {
            console.warn('⚠️ No se pudieron guardar escrituras pendientes:', error);
        }
    }
    
    loadPendingWrites() {
        try {
            const stored = localStorage.getItem('firebase_pending_writes');
            if (stored) {
                this.pendingWrites = JSON.parse(stored);
                console.log(`📦 ${this.pendingWrites.length} escrituras pendientes cargadas`);
            }
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar escrituras pendientes:', error);
        }
    }
}

// ============================================
// SERVICIO DE FIREBASE
// ============================================
const FirebaseService = {
    // ========== PROPIEDADES ==========
    database,
    sensorsRef,
    alertsRef,
    historyRef,
    devicesRef,
    configRef,
    connectionRef,
    isInitialized: firebaseInitialized,
    isConnected: false,
    deviceId: DEVICE_ID,
    cache: new FirebaseCache(),
    listeners: [],
    
    // ============================================
    // CONEXIÓN
    // ============================================
    checkConnection() {
        return new Promise((resolve) => {
            if (!this.connectionRef) {
                resolve(false);
                return;
            }
            
            this.connectionRef.once('value')
                .then(snapshot => {
                    const connected = snapshot.val() === true;
                    this.isConnected = connected;
                    console.log(`📡 Conexión: ${connected ? '✅ Conectado' : '❌ Desconectado'}`);
                    resolve(connected);
                })
                .catch(() => {
                    this.isConnected = false;
                    resolve(false);
                });
        });
    },
    
    monitorConnection(callback) {
        if (!this.connectionRef) {
            if (callback) callback(false);
            return null;
        }
        
        const listener = this.connectionRef.on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            this.isConnected = connected;
            if (callback) callback(connected);
        });
        
        this.listeners.push(listener);
        return listener;
    },
    
    async reconnect() {
        console.log('🔄 Intentando reconectar a Firebase...');
        retryCount = 0;
        
        while (retryCount < MAX_RETRIES) {
            const connected = await this.checkConnection();
            if (connected) {
                console.log('✅ Reconectado a Firebase');
                return true;
            }
            
            retryCount++;
            console.log(`⏳ Intento ${retryCount}/${MAX_RETRIES} - Esperando ${retryCount * 2}s...`);
            await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
        }
        
        console.error('❌ No se pudo reconectar a Firebase');
        return false;
    },
    
    // ============================================
    // SENSORES
    // ============================================
    getSensorData(deviceId = DEVICE_ID, useCache = true) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const cacheKey = `sensors_${deviceId}`;
            if (useCache) {
                const cached = this.cache.get(cacheKey);
                if (cached) {
                    resolve(cached);
                    return;
                }
            }
            
            const sensorPath = `sensors/${deviceId}/live`;
            const ref = this.database.ref(sensorPath);
            
            ref.once('value')
                .then(snapshot => {
                    const data = snapshot.val();
                    if (data) {
                        const validated = this.validateSensorData(data);
                        if (validated) {
                            this.cache.set(cacheKey, validated);
                            resolve(validated);
                        } else {
                            resolve(data);
                        }
                    } else {
                        resolve(null);
                    }
                })
                .catch(error => {
                    console.error('❌ Error obteniendo datos de sensores:', error);
                    reject(error);
                });
        });
    },
    
    onSensorData(callback, deviceId = DEVICE_ID, options = {}) {
        if (!this.database) {
            console.error('❌ Firebase no inicializado');
            return null;
        }
        
        const sensorPath = `sensors/${deviceId}/live`;
        console.log(`📡 Escuchando datos en: ${sensorPath}`);
        const ref = this.database.ref(sensorPath);
        
        // Enviar datos en cache si existen
        const cacheKey = `sensors_${deviceId}`;
        const cached = this.cache.get(cacheKey);
        if (cached && options.useCache !== false) {
            callback(cached);
        }
        
        const listener = ref.on('value', (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    const validated = this.validateSensorData(data);
                    if (validated) {
                        this.cache.set(cacheKey, validated);
                        callback(validated);
                    } else {
                        this.cache.set(cacheKey, data);
                        callback(data);
                    }
                } else {
                    callback(null);
                }
            } catch (error) {
                console.error('❌ Error procesando datos de sensores:', error);
                if (options.errorHandler) options.errorHandler(error);
            }
        }, (error) => {
            console.error('❌ Error en listener de sensores:', error);
            if (options.errorHandler) options.errorHandler(error);
        });
        
        this.listeners.push(listener);
        return listener;
    },
    
    validateSensorData(data) {
        if (!data || typeof data !== 'object') return null;
        
        const validated = {};
        
        // Temperatura
        if (data.temperature !== undefined && data.temperature !== null) {
            const temp = parseFloat(data.temperature);
            if (!isNaN(temp) && temp >= -20 && temp <= 60) {
                validated.temperature = temp;
            }
        }
        
        // Humedad
        if (data.humidity !== undefined && data.humidity !== null) {
            const hum = parseFloat(data.humidity);
            if (!isNaN(hum) && hum >= 0 && hum <= 100) {
                validated.humidity = hum;
            }
        }
        
        // Gas
        if (data.gas !== undefined && data.gas !== null) {
            const gas = parseFloat(data.gas);
            if (!isNaN(gas) && gas >= 0) {
                validated.gas = gas;
            }
        }
        
        // Puerta
        if (data.door !== undefined && data.door !== null) {
            validated.door = data.door === 1 || data.door === true ? 1 : 0;
        }
        
        // Voltaje
        if (data.voltage !== undefined && data.voltage !== null) {
            const volt = parseFloat(data.voltage);
            if (!isNaN(volt)) {
                validated.voltage = volt;
            }
        }
        
        // Corriente
        if (data.current !== undefined && data.current !== null) {
            const current = parseFloat(data.current);
            if (!isNaN(current)) {
                validated.current = current;
            }
        }
        
        // Potencia
        if (data.power !== undefined && data.power !== null) {
            const power = parseFloat(data.power);
            if (!isNaN(power)) {
                validated.power = power;
            }
        }
        
        // Energía
        if (data.energy !== undefined && data.energy !== null) {
            const energy = parseFloat(data.energy);
            if (!isNaN(energy)) {
                validated.energy = energy;
            }
        }
        
        // Movimiento
        if (data.motion !== undefined && data.motion !== null) {
            validated.motion = data.motion === 1 || data.motion === true ? 1 : 0;
        }
        
        validated.timestamp = data.timestamp || Date.now();
        
        // Verificar que hay al menos un valor
        const hasValue = Object.keys(validated).some(key => 
            key !== 'timestamp' && validated[key] !== null && validated[key] !== undefined
        );
        
        return hasValue ? validated : null;
    },
    
    // ============================================
    // ALERTAS
    // ============================================
    onAlerts(callback, deviceId = DEVICE_ID, options = {}) {
        if (!this.database) {
            console.error('❌ Firebase no inicializado');
            return null;
        }
        
        const alertPath = `alerts/${deviceId}`;
        console.log(`📡 Escuchando alertas en: ${alertPath}`);
        const ref = this.database.ref(alertPath);
        const limit = options.limit || 10;
        const query = ref.orderByKey().limitToLast(limit);
        
        const listener = query.on('value', (snapshot) => {
            try {
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
            } catch (error) {
                console.error('❌ Error procesando alertas:', error);
                if (options.errorHandler) options.errorHandler(error);
            }
        }, (error) => {
            console.error('❌ Error en listener de alertas:', error);
            if (options.errorHandler) options.errorHandler(error);
        });
        
        this.listeners.push(listener);
        return listener;
    },
    
    saveAlert(alertData, deviceId = DEVICE_ID) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            try {
                const validated = {
                    type: this.validateAlertType(alertData.type),
                    title: this.sanitizeString(alertData.title || 'Alerta'),
                    message: this.sanitizeString(alertData.message || ''),
                    timestamp: Date.now(),
                    read: false,
                    acknowledged: false,
                    category: alertData.category || 'general'
                };
                
                const alertPath = `alerts/${deviceId}`;
                const ref = this.database.ref(alertPath);
                const newRef = ref.push();
                
                newRef.set(validated)
                    .then(() => {
                        resolve({ success: true, id: newRef.key, data: validated });
                    })
                    .catch(error => {
                        console.error('❌ Error guardando alerta:', error);
                        reject(error);
                    });
                    
            } catch (error) {
                console.error('❌ Error validando alerta:', error);
                reject(error);
            }
        });
    },
    
    validateAlertType(type) {
        const validTypes = ['danger', 'warning', 'info', 'success'];
        return validTypes.includes(type) ? type : 'info';
    },
    
    sanitizeString(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ============================================
    // ✅ HISTÓRICO - CORREGIDO Y MEJORADO
    // ============================================
    
    /**
     * Obtiene el histórico de un dispositivo
     * @param {string} deviceId - ID del dispositivo (default: esp32_001)
     * @param {number} limit - Número máximo de registros (default: 20)
     * @returns {Promise<Array>} - Array de registros históricos
     */
    getHistory(deviceId = DEVICE_ID, limit = 20) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const path = `history/${deviceId}`;
            console.log(`📊 Obteniendo histórico de: ${path} (límite: ${limit})`);
            const ref = this.database.ref(path);
            const query = ref.orderByKey().limitToLast(limit);
            
            query.once('value')
                .then(snapshot => {
                    const data = snapshot.val();
                    if (!data) {
                        console.log('📊 No hay datos históricos');
                        resolve([]);
                        return;
                    }
                    
                    const entries = Object.keys(data).map(key => ({
                        id: key,
                        ...data[key]
                    }));
                    
                    // Ordenar por timestamp descendente (más reciente primero)
                    const sorted = entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    console.log(`📊 ${sorted.length} registros históricos obtenidos`);
                    resolve(sorted);
                })
                .catch(error => {
                    console.error('❌ Error obteniendo histórico:', error);
                    reject(error);
                });
        });
    },
    
    /**
     * Guarda un registro en el histórico
     * @param {Object} data - Datos a guardar
     * @param {string} deviceId - ID del dispositivo (default: esp32_001)
     * @returns {Promise<Object>} - Resultado de la operación
     */
    saveHistory(data, deviceId = DEVICE_ID) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const historyPath = `history/${deviceId}`;
            const ref = this.database.ref(historyPath);
            const newRef = ref.push();
            
            const entry = {
                temperature: data.temperature !== undefined ? data.temperature : 0,
                humidity: data.humidity !== undefined ? data.humidity : 0,
                gas: data.gas !== undefined ? data.gas : 0,
                door: data.door !== undefined ? data.door : 0,
                voltage: data.voltage !== undefined ? data.voltage : 0,
                current: data.current !== undefined ? data.current : 0,
                power: data.power !== undefined ? data.power : 0,
                energy: data.energy !== undefined ? data.energy : 0,
                timestamp: data.timestamp || Date.now()
            };
            
            newRef.set(entry)
                .then(() => {
                    resolve({ success: true, id: newRef.key });
                })
                .catch(error => {
                    console.error('❌ Error guardando histórico:', error);
                    reject(error);
                });
        });
    },
    
    // ============================================
    // CONFIGURACIÓN
    // ============================================
    
    /**
     * Obtiene datos de cualquier ruta
     * @param {string} path - Ruta en Firebase
     * @returns {Promise<any>} - Datos obtenidos
     */
    getData(path) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const ref = this.database.ref(path);
            ref.once('value')
                .then(snapshot => {
                    resolve(snapshot.val());
                })
                .catch(error => {
                    console.error(`❌ Error obteniendo ${path}:`, error);
                    reject(error);
                });
        });
    },
    
    /**
     * Guarda datos en cualquier ruta
     * @param {string} path - Ruta en Firebase
     * @param {any} data - Datos a guardar
     * @returns {Promise<Object>} - Resultado de la operación
     */
    setData(path, data) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const ref = this.database.ref(path);
            ref.set(data)
                .then(() => resolve({ success: true }))
                .catch(error => {
                    console.error(`❌ Error escribiendo en ${path}:`, error);
                    reject(error);
                });
        });
    },
    
    /**
     * Actualiza datos en cualquier ruta
     * @param {string} path - Ruta en Firebase
     * @param {any} data - Datos a actualizar
     * @returns {Promise<Object>} - Resultado de la operación
     */
    updateData(path, data) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Firebase no inicializado'));
                return;
            }
            
            const ref = this.database.ref(path);
            ref.update(data)
                .then(() => resolve({ success: true }))
                .catch(error => {
                    console.error(`❌ Error actualizando ${path}:`, error);
                    reject(error);
                });
        });
    },
    
    // ============================================
    // UTILIDADES
    // ============================================
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache limpiado');
    },
    
    cleanup() {
        console.log('🧹 Limpiando listeners de Firebase...');
        this.listeners.forEach(listener => {
            try {
                if (typeof listener === 'function') listener();
            } catch (error) {
                // Silenciar error
            }
        });
        this.listeners = [];
        console.log('✅ Firebase cleanup realizado');
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================
if (firebaseInitialized) {
    // Cargar escrituras pendientes
    FirebaseService.cache.loadPendingWrites();
    
    // Verificar conexión
    FirebaseService.checkConnection().then(connected => {
        FirebaseService.isConnected = connected;
        console.log(`📡 Estado de conexión: ${connected ? '✅ Conectado' : '❌ Desconectado'}`);
        
        if (!connected) {
            setTimeout(() => {
                FirebaseService.reconnect();
            }, 3000);
        }
    });
    
    // Monitorear conexión
    FirebaseService.monitorConnection((connected) => {
        console.log(`📡 Conexión actualizada: ${connected ? '✅ Conectado' : '❌ Desconectado'}`);
    });
}

// ============================================
// EXPORTAR
// ============================================
window.FirebaseService = FirebaseService;
window.DEVICE_ID = DEVICE_ID;

console.log('🔥 Firebase Service actualizado correctamente');
console.log(`📌 Device ID: ${DEVICE_ID}`);
console.log(`📌 History path: history/${DEVICE_ID}`);
console.log(`📌 Cache timeout: ${CACHE_TIMEOUT/1000}s`);