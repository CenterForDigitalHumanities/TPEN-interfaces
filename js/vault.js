// Local simulacrum vault for use in client without something like webpack
import TPEN from "../api/TPEN.js"
import { urlFromIdAndType } from "../js/utils.js"

/**
 * Vault - Client-side caching utility for IIIF resources.
 * Provides memory and localStorage caching with type-specific validation.
 */
class Vault {
    constructor() {
        this.store = new Map()
    }

    _normalizeType(type) {
        return (type ?? '').toString().toLowerCase() || 'none'
    }

    _getId(item) {
        return item?._id ?? item?.id ?? item?.['@id'] ?? item
    }

    _cacheKey(itemType, id) {
        return `vault:${itemType}:${id}`
    }

    /**
     * Creates a standardized canvas error object.
     * @param {string} errorType - Error type: 'network' | 'server_error' | 'not_found' | 'forbidden' | 'unauthorized' | 'invalid_json' | 'invalid_type' | 'missing_id'
     * @param {string} message - Human-readable error message
     * @param {number|null} httpStatus - HTTP status code (if applicable)
     * @param {string} canvasUri - The canvas URI that failed
     * @param {string} [component] - Which component triggered the fetch
     * @returns {Object} Standardized error object
     */
    _createCanvasError(errorType, message, httpStatus, canvasUri, component) {
        return {
            errorType,
            message,
            httpStatus,
            canvasUri,
            component
        }
    }

    /**
     * Validates that a fetched object is a valid IIIF Canvas.
     * Supports both IIIF Presentation API v2 and v3 formats.
     * @param {Object} canvas - The fetched canvas data
     * @param {string} uri - The canvas URI (for error reporting)
     * @returns {Object|null} Error object if invalid, null if valid
     */
    _validateCanvas(canvas, uri) {
        // Check for id (v3: id, v2: @id)
        const canvasId = canvas?.id ?? canvas?.['@id']
        if (!canvasId) {
            return this._createCanvasError('missing_id', 'Canvas has no id field', null, uri)
        }

        // Check for type (v3: type, v2: @type)
        const canvasType = canvas?.type ?? canvas?.['@type']
        if (!canvasType) {
            return this._createCanvasError('invalid_type', 'Canvas has no type field', null, uri)
        }

        // Valid Canvas types: 'Canvas' (v3) or 'sc:Canvas' (v2)
        const validTypes = ['Canvas', 'sc:Canvas']
        if (!validTypes.includes(canvasType)) {
            return this._createCanvasError('invalid_type', `Expected Canvas type, got '${canvasType}'`, null, uri)
        }

        // Check IIIF context - only warn, don't fail
        const context = canvas?.['@context']
        if (context) {
            const validContexts = [
                'http://iiif.io/api/presentation/2/context.json',
                'https://iiif.io/api/presentation/2/context.json',
                'http://iiif.io/api/presentation/3/context.json',
                'https://iiif.io/api/presentation/3/context.json'
            ]
            const contexts = Array.isArray(context) ? context : [context]
            const hasValidContext = contexts.some(c => validContexts.includes(c))
            if (!hasValidContext) {
                console.warn(`Canvas ${uri} has non-standard IIIF context:`, context)
            }
        }

        return null // Valid canvas
    }

    /**
     * Dispatches a canvas resolution failure event.
     * @param {Object} error - The error object from _createCanvasError
     */
    _dispatchCanvasError(error) {
        TPEN.eventDispatcher?.dispatch('tpen-canvas-resolution-failed', error)
    }

    /**
     * Maps HTTP status codes to error types.
     * @param {number} status - HTTP status code
     * @returns {string} Error type
     */
    _httpStatusToErrorType(status) {
        if (status === 404) return 'not_found'
        if (status === 401) return 'unauthorized'
        if (status === 403) return 'forbidden'
        if (status >= 500) return 'server_error'
        return 'server_error'
    }

    /**
     * Fetches and caches a resource by ID and type.
     * For canvas type, performs validation and dispatches events on failure.
     * @param {string|Object} item - Item ID or object with id property
     * @param {string} itemType - Type of item ('canvas', 'manifest', etc.)
     * @param {boolean} [noCache=false] - Skip cache lookup
     * @param {string} [component] - Component name for error reporting (which component triggered the fetch)
     * @returns {Promise<Object|null>} The fetched resource or null on failure
     */
    async get(item, itemType, noCache = false, component) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        const isCanvas = type === 'canvas'
        const typeStore = this.store.get(type)
        let result = typeStore?.get(id)
        if (result) return result

        const cacheKey = this._cacheKey(type, id)
        const cached = localStorage.getItem(cacheKey)
        if (cached && !noCache) {
            try {
                const parsed = JSON.parse(cached)
                // Validate cached canvas data
                if (isCanvas) {
                    const validationError = this._validateCanvas(parsed, id)
                    if (validationError) {
                        validationError.component = component
                        this._dispatchCanvasError(validationError)
                        try { localStorage.removeItem(cacheKey) } catch {}
                        return null
                    }
                }
                this.set(parsed, type)
                return parsed
            } catch {
                // Invalid JSON in cache, remove it
                try { localStorage.removeItem(cacheKey) } catch {}
            }
        }

        try {
            const uri = urlFromIdAndType(id, type, {
                projectId: TPEN.screen?.projectInQuery,
                pageId: TPEN.screen?.pageInQuery,
                layerId: TPEN.screen?.layerInQuery
            })
            const response = await fetch(uri)

            if (!response.ok) {
                if (isCanvas) {
                    const errorType = this._httpStatusToErrorType(response.status)
                    const error = this._createCanvasError(
                        errorType,
                        `HTTP ${response.status}: ${response.statusText}`,
                        response.status,
                        uri,
                        component
                    )
                    this._dispatchCanvasError(error)
                }
                return null
            }

            let data
            try {
                data = await response.json()
            } catch (jsonError) {
                if (isCanvas) {
                    const error = this._createCanvasError(
                        'invalid_json',
                        'Response is not valid JSON',
                        response.status,
                        uri,
                        component
                    )
                    this._dispatchCanvasError(error)
                }
                return null
            }

            // Validate canvas structure
            if (isCanvas) {
                const validationError = this._validateCanvas(data, uri)
                if (validationError) {
                    validationError.component = component
                    this._dispatchCanvasError(validationError)
                    return null
                }
            }

            const queue = [{ obj: data, depth: 0 }]
            const visited = new Set()

            while (queue.length) {
                const { obj, depth } = queue.shift()
                if (depth >= 4 || !obj || typeof obj !== 'object') continue

                for (const key of Object.keys(obj)) {
                    const value = obj[key]
                    if (Array.isArray(value)) {
                        for (const item of value) {
                            if (item && typeof item === 'object') queue.push({ obj: item, depth: depth + 1 })
                        }
                    } else if (value && typeof value === 'object') {
                        queue.push({ obj: value, depth: depth + 1 })
                    }

                    const id = value?.['@id'] ?? value?.id
                    const type = value?.['@type'] ?? value?.type
                    if (id && type && !visited.has(id)) {
                        visited.add(id)
                        this.get(id, type)
                        // Project embedded object to minimal form
                        const label = value?.label ?? value?.title
                        obj[key] = { id, type, ...(label && { label }) }
                    }
                }
            }
            this.set(data, itemType)
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data))
            } catch {}
            return data
        } catch (err) {
            if (isCanvas) {
                const error = this._createCanvasError(
                    'network',
                    err.message || 'Network error',
                    null,
                    id,
                    component
                )
                this._dispatchCanvasError(error)
            }
            return null
        }
    }

    set(item, itemType) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        if (!this.store.has(type)) {
            this.store.set(type, new Map())
        }
        this.store.get(type).set(id, item)
        const cacheKey = this._cacheKey(type, id)
        try {
            localStorage.setItem(cacheKey, JSON.stringify(item))
        } catch {}
    }

    delete(item, itemType) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        if (!this.store.has(type)) return
        const typeStore = this.store.get(type)
        if (!typeStore.has(id)) return
        typeStore.delete(id)
        const cacheKey = this._cacheKey(type, id)
        localStorage.removeItem(cacheKey)
    }

    clear(itemType) {
        const type = this._normalizeType(itemType)
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(`vault:${type}:`)) {
                localStorage.removeItem(key)
            }
        }
        this.store.delete(type)
    }

    all() {
        return Object.values(this.store)
    }
}

const vault = new Vault()
if (typeof window !== 'undefined') {
    window.Vault = vault
}

export default vault
