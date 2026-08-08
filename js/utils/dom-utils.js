/**
 * ==========================================
 * SMART MONITOR - DOM UTILITIES
 * ==========================================
 *
 * Archivo: utils/dom-utils.js
 * Propósito: Utilidades para manipulación del DOM
 *
 * Este archivo contiene:
 * - Selectores y creación de elementos
 * - Manipulación de clases y estilos
 * - Event listeners
 * - Animaciones y transiciones
 * 
 * @module utils/dom-utils
 * @version 2.0.0
 */

// ==========================================
// SELECTORES
// ==========================================

const DomSelectors = {
    /**
     * Selecciona un elemento por ID
     * @param {string} id - ID del elemento
     * @param {HTMLElement} context - Contexto para la búsqueda
     * @returns {HTMLElement|null} - Elemento encontrado o null
     */
    byId: function(id, context) {
        context = context || document;
        return context.getElementById(id);
    },
    
    /**
     * Selecciona elementos por selector CSS
     * @param {string} selector - Selector CSS
     * @param {HTMLElement} context - Contexto para la búsqueda
     * @returns {NodeList} - Lista de elementos encontrados
     */
    bySelector: function(selector, context) {
        context = context || document;
        return context.querySelectorAll(selector);
    },
    
    /**
     * Selecciona el primer elemento que coincida con el selector
     * @param {string} selector - Selector CSS
     * @param {HTMLElement} context - Contexto para la búsqueda
     * @returns {HTMLElement|null} - Elemento encontrado o null
     */
    first: function(selector, context) {
        context = context || document;
        return context.querySelector(selector);
    }
};

// ==========================================
// CREACIÓN DE ELEMENTOS
// ==========================================

const DomCreate = {
    /**
     * Crea un elemento HTML
     * @param {string} tag - Etiqueta del elemento
     * @param {Object} attributes - Atributos del elemento
     * @param {string|HTMLElement} content - Contenido del elemento
     * @returns {HTMLElement} - Elemento creado
     */
    element: function(tag, attributes, content) {
        attributes = attributes || {};
        var element = document.createElement(tag);
        
        // Agregar atributos
        for (var key in attributes) {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'style' && typeof attributes[key] === 'object') {
                for (var styleKey in attributes[key]) {
                    element.style[styleKey] = attributes[key][styleKey];
                }
            } else if (key === 'dataset') {
                for (var dataKey in attributes[key]) {
                    element.dataset[dataKey] = attributes[key][dataKey];
                }
            } else {
                element.setAttribute(key, attributes[key]);
            }
        }
        
        // Agregar contenido
        if (content) {
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                element.appendChild(content);
            }
        }
        
        return element;
    },
    
    /**
     * Crea un elemento con texto
     * @param {string} tag - Etiqueta del elemento
     * @param {string} text - Texto del elemento
     * @param {Object} attributes - Atributos del elemento
     * @returns {HTMLElement} - Elemento creado
     */
    text: function(tag, text, attributes) {
        attributes = attributes || {};
        var element = this.element(tag, attributes);
        element.textContent = text;
        return element;
    }
};

// ==========================================
// MANIPULACIÓN DE CLASES
// ==========================================

const DomClasses = {
    /**
     * Agrega una clase a un elemento
     * @param {HTMLElement} element - Elemento a modificar
     * @param {string} className - Clase a agregar
     */
    add: function(element, className) {
        if (element) {
            element.classList.add(className);
        }
    },
    
    /**
     * Elimina una clase de un elemento
     * @param {HTMLElement} element - Elemento a modificar
     * @param {string} className - Clase a eliminar
     */
    remove: function(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    },
    
    /**
     * Alterna una clase en un elemento
     * @param {HTMLElement} element - Elemento a modificar
     * @param {string} className - Clase a alternar
     * @param {boolean} force - Forzar estado
     * @returns {boolean} - Nuevo estado de la clase
     */
    toggle: function(element, className, force) {
        if (element) {
            return element.classList.toggle(className, force);
        }
        return false;
    },
    
    /**
     * Verifica si un elemento tiene una clase
     * @param {HTMLElement} element - Elemento a verificar
     * @param {string} className - Clase a verificar
     * @returns {boolean} - True si tiene la clase
     */
    has: function(element, className) {
        if (element) {
            return element.classList.contains(className);
        }
        return false;
    }
};

// ==========================================
// MANIPULACIÓN DE ESTILOS
// ==========================================

const DomStyles = {
    /**
     * Establece estilos en un elemento
     * @param {HTMLElement} element - Elemento a modificar
     * @param {Object} styles - Estilos a aplicar
     */
    set: function(element, styles) {
        if (element && styles) {
            for (var key in styles) {
                element.style[key] = styles[key];
            }
        }
    },
    
    /**
     * Obtiene un estilo de un elemento
     * @param {HTMLElement} element - Elemento a consultar
     * @param {string} property - Propiedad a obtener
     * @returns {string} - Valor de la propiedad
     */
    get: function(element, property) {
        if (element) {
            return getComputedStyle(element)[property];
        }
        return null;
    },
    
    /**
     * Muestra un elemento (elimina display:none)
     * @param {HTMLElement} element - Elemento a mostrar
     */
    show: function(element) {
        if (element) {
            element.style.display = '';
        }
    },
    
    /**
     * Oculta un elemento (display:none)
     * @param {HTMLElement} element - Elemento a ocultar
     */
    hide: function(element) {
        if (element) {
            element.style.display = 'none';
        }
    },
    
    /**
     * Alterna la visibilidad de un elemento
     * @param {HTMLElement} element - Elemento a alternar
     */
    toggleVisibility: function(element) {
        if (element) {
            if (element.style.display === 'none') {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        }
    }
};

// ==========================================
// EVENT LISTENERS
// ==========================================

const DomEvents = {
    /**
     * Agrega un event listener
     * @param {HTMLElement} element - Elemento a escuchar
     * @param {string} event - Tipo de evento
     * @param {Function} handler - Función a ejecutar
     * @param {Object} options - Opciones del listener
     */
    on: function(element, event, handler, options) {
        if (element) {
            element.addEventListener(event, handler, options);
        }
    },
    
    /**
     * Elimina un event listener
     * @param {HTMLElement} element - Elemento a modificar
     * @param {string} event - Tipo de evento
     * @param {Function} handler - Función a eliminar
     */
    off: function(element, event, handler) {
        if (element) {
            element.removeEventListener(event, handler);
        }
    },
    
    /**
     * Agrega un event listener que se ejecuta una sola vez
     * @param {HTMLElement} element - Elemento a escuchar
     * @param {string} event - Tipo de evento
     * @param {Function} handler - Función a ejecutar
     */
    once: function(element, event, handler) {
        if (element) {
            var wrapper = function(e) {
                handler(e);
                element.removeEventListener(event, wrapper);
            };
            element.addEventListener(event, wrapper);
        }
    },
    
    /**
     * Dispara un evento personalizado
     * @param {HTMLElement} element - Elemento que dispara el evento
     * @param {string} event - Nombre del evento
     * @param {Object} detail - Datos del evento
     */
    dispatch: function(element, event, detail) {
        if (element) {
            var customEvent = new CustomEvent(event, { detail: detail });
            element.dispatchEvent(customEvent);
        }
    }
};

// ==========================================
// ANIMACIONES
// ==========================================

const DomAnimations = {
    /**
     * Aplica una animación de fade in
     * @param {HTMLElement} element - Elemento a animar
     * @param {number} duration - Duración en milisegundos
     * @param {Function} callback - Función a ejecutar al finalizar
     */
    fadeIn: function(element, duration, callback) {
        duration = duration || 300;
        if (element) {
            element.style.opacity = 0;
            element.style.display = '';
            element.style.transition = 'opacity ' + duration + 'ms ease';
            
            requestAnimationFrame(function() {
                element.style.opacity = 1;
            });
            
            if (callback) {
                setTimeout(callback, duration);
            }
        }
    },
    
    /**
     * Aplica una animación de fade out
     * @param {HTMLElement} element - Elemento a animar
     * @param {number} duration - Duración en milisegundos
     * @param {Function} callback - Función a ejecutar al finalizar
     */
    fadeOut: function(element, duration, callback) {
        duration = duration || 300;
        if (element) {
            element.style.opacity = 1;
            element.style.transition = 'opacity ' + duration + 'ms ease';
            
            requestAnimationFrame(function() {
                element.style.opacity = 0;
            });
            
            setTimeout(function() {
                element.style.display = 'none';
                if (callback) callback();
            }, duration);
        }
    },
    
    /**
     * Aplica una animación de slide down
     * @param {HTMLElement} element - Elemento a animar
     * @param {number} duration - Duración en milisegundos
     * @param {Function} callback - Función a ejecutar al finalizar
     */
    slideDown: function(element, duration, callback) {
        duration = duration || 300;
        if (element) {
            var height = element.scrollHeight;
            element.style.height = '0';
            element.style.overflow = 'hidden';
            element.style.transition = 'height ' + duration + 'ms ease';
            
            requestAnimationFrame(function() {
                element.style.height = height + 'px';
            });
            
            if (callback) {
                setTimeout(callback, duration);
            }
        }
    },
    
    /**
     * Aplica una animación de slide up
     * @param {HTMLElement} element - Elemento a animar
     * @param {number} duration - Duración en milisegundos
     * @param {Function} callback - Función a ejecutar al finalizar
     */
    slideUp: function(element, duration, callback) {
        duration = duration || 300;
        if (element) {
            element.style.height = element.scrollHeight + 'px';
            element.style.overflow = 'hidden';
            element.style.transition = 'height ' + duration + 'ms ease';
            
            requestAnimationFrame(function() {
                element.style.height = '0';
            });
            
            setTimeout(function() {
                element.style.display = 'none';
                if (callback) callback();
            }, duration);
        }
    }
};

// ==========================================
// EXPORTAR
// ==========================================

const DomUtils = {
    select: DomSelectors,
    create: DomCreate,
    classes: DomClasses,
    styles: DomStyles,
    events: DomEvents,
    animations: DomAnimations
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DomUtils = DomUtils;
}

console.log('📦 DOM Utils inicializados');