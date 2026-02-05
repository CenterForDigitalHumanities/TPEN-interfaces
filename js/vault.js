// Local simulacrum vault for use in client without something like webpack
import TPEN from "../api/TPEN.js"
import { urlFromIdAndType } from "../js/utils.js"

/** Types that are too large for localStorage (manifests can be megabytes). */
const SKIP_LOCAL_STORAGE_TYPES = new Set(['manifest', 'sc:manifest', 'collection', 'sc:collection'])

/**
 * Vault - Client-side caching utility for IIIF resources.
 * Provides memory and localStorage caching with type-specific validation.
 * When a Canvas URI fails to resolve, automatically attempts to find the
 * Canvas as embedded data within a parent Manifest.
 */
class Vault {
    constructor() {
        this.store = new Map()
        /** @type {Map<string, string>} Maps canvasId → manifestId for fallback lookup */
        this.canvasToManifest = new Map()
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
     * Scans a manifest for embedded canvases and populates canvasToManifest map.
     * Supports both IIIF v3 (manifest.items) and v2 (manifest.sequences[0].canvases).
     * @param {Object} manifest - The manifest object to index
     */
    _indexManifest(manifest) {
        const manifestId = this._getId(manifest)
        if (!manifestId) return

        // v3: manifest.items where type is Canvas
        const v3Items = manifest?.items
        if (Array.isArray(v3Items)) {
            for (const item of v3Items) {
                const itemType = item?.type ?? item?.['@type']
                if (itemType === 'Canvas' || itemType === 'sc:Canvas') {
                    const canvasId = this._getId(item)
                    if (canvasId) this.canvasToManifest.set(canvasId, manifestId)
                }
            }
        }

        // v2: manifest.sequences[0].canvases
        const v2Canvases = manifest?.sequences?.[0]?.canvases
        if (Array.isArray(v2Canvases)) {
            for (const canvas of v2Canvases) {
                const canvasId = this._getId(canvas)
                if (canvasId) this.canvasToManifest.set(canvasId, manifestId)
            }
        }
    }

    /**
     * Looks up canvasToManifest for the manifest, retrieves the manifest from
     * vault's in-memory store, and searches its items/canvases for the matching Canvas.
     * @param {string} canvasId - The canvas ID to find
     * @returns {Object|null} The embedded canvas object or null
     */
    _getEmbeddedCanvas(canvasId) {
        const manifestId = this.canvasToManifest.get(canvasId)
        if (!manifestId) return null

        // Search all manifest-like types in the store
        for (const type of ['manifest', 'sc:manifest']) {
            const manifest = this.store.get(type)?.get(manifestId)
            if (!manifest) continue

            // v3: search manifest.items
            const v3Canvas = manifest.items?.find(c => {
                const id = c?.id ?? c?.['@id']
                return id === canvasId
            })
            if (v3Canvas) return v3Canvas

            // v2: search manifest.sequences[0].canvases
            const v2Canvas = manifest.sequences?.[0]?.canvases?.find(c => {
                const id = c?.['@id'] ?? c?.id
                return id === canvasId
            })
            if (v2Canvas) return v2Canvas
        }

        return null
    }

    /**
     * Core fallback orchestrator: attempts to resolve a canvas from its parent manifest.
     * 1. Try _getEmbeddedCanvas (already cached manifest)
     * 2. Determine manifest URI from canvasToManifest map or active project
     * 3. Fetch the manifest via vault.get (caches + indexes it)
     * 4. Try _getEmbeddedCanvas again
     * @param {string} canvasId - The canvas ID to resolve
     * @param {string} [component] - Component name for error reporting
     * @returns {Promise<Object|null>} The embedded canvas or null
     */
    async _resolveCanvasFromManifest(canvasId, component) {
        // 1. Check if already available from a cached manifest
        let embedded = this._getEmbeddedCanvas(canvasId)
        if (embedded) return embedded

        // 2. Determine manifest URI — prefer registered hint, fall back to active project
        const manifestUri = this.canvasToManifest.get(canvasId) ?? TPEN.activeProject?.manifest?.[0]

        if (!manifestUri) return null

        // 3. Fetch the manifest (this will cache + index it via BFS and _indexManifest)
        try {
            await this.get(manifestUri, 'manifest')
        } catch {
            return null
        }

        // 4. Try again after manifest is cached
        return this._getEmbeddedCanvas(canvasId)
    }

    /**
     * Registers a hint telling vault which manifest a canvas belongs to.
     * Used by components that know the manifest URI before canvas resolution.
     * @param {string} canvasId - The canvas ID
     * @param {string} manifestUri - The manifest URI containing this canvas
     */
    registerManifestHint(canvasId, manifestUri) {
        if (canvasId && manifestUri) {
            this.canvasToManifest.set(canvasId, manifestUri)
        }
    }

    /**
     * Fetches and caches a resource by ID and type.
     * For canvas type, performs validation and attempts manifest fallback on failure.
     * Error events are only dispatched if BOTH URI resolution AND manifest fallback fail.
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
        let cached
        try { cached = localStorage.getItem(cacheKey) } catch {}
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

        // Track error for deferred dispatch (canvas fallback)
        let canvasError = null

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
                    canvasError = this._createCanvasError(
                        errorType,
                        `HTTP ${response.status}: ${response.statusText}`,
                        response.status,
                        uri,
                        component
                    )
                } else {
                    return null
                }
            }

            if (!canvasError) {
                let data
                try {
                    data = await response.json()
                } catch (jsonError) {
                    if (isCanvas) {
                        canvasError = this._createCanvasError(
                            'invalid_json',
                            'Response is not valid JSON',
                            response.status,
                            uri,
                            component
                        )
                    } else {
                        return null
                    }
                }

                if (!canvasError) {
                    // Validate canvas structure
                    if (isCanvas) {
                        const validationError = this._validateCanvas(data, uri)
                        if (validationError) {
                            validationError.component = component
                            canvasError = validationError
                        }
                    }

                    if (!canvasError) {
                        // BFS: traverse and cache embedded objects
                        const queue = [{ obj: data, depth: 0 }]
                        const visited = new Set()

                        while (queue.length) {
                            const { obj: current, depth } = queue.shift()
                            if (depth >= 4 || !current || typeof current !== 'object') continue

                            for (const key of Object.keys(current)) {
                                const value = current[key]
                                if (Array.isArray(value)) {
                                    for (const arrItem of value) {
                                        if (arrItem && typeof arrItem === 'object') {
                                            queue.push({ obj: arrItem, depth: depth + 1 })
                                            // Cache array items that have id+type directly
                                            const arrItemId = arrItem?.['@id'] ?? arrItem?.id
                                            const arrItemType = arrItem?.['@type'] ?? arrItem?.type
                                            if (arrItemId && arrItemType && !visited.has(arrItemId)) {
                                                visited.add(arrItemId)
                                                try { this.set(structuredClone(arrItem), arrItemType) } catch {}
                                            }
                                        }
                                    }
                                } else if (value && typeof value === 'object') {
                                    queue.push({ obj: value, depth: depth + 1 })
                                }

                                const embeddedId = value?.['@id'] ?? value?.id
                                const embeddedType = value?.['@type'] ?? value?.type
                                if (embeddedId && embeddedType && !visited.has(embeddedId)) {
                                    visited.add(embeddedId)
                                    // Cache the full embedded object before stubbing
                                    try { this.set(structuredClone(value), embeddedType) } catch {}
                                    // Project embedded object to minimal form in parent
                                    const label = value?.label ?? value?.title
                                    current[key] = { id: embeddedId, type: embeddedType, ...(label && { label }) }
                                }
                            }
                        }
                        this.set(data, itemType)
                        return data
                    }
                }
            }
        } catch (err) {
            if (isCanvas) {
                canvasError = this._createCanvasError(
                    'network',
                    err.message || 'Network error',
                    null,
                    id,
                    component
                )
            } else {
                return null
            }
        }

        // Canvas URI resolution failed — attempt manifest fallback
        if (isCanvas && canvasError) {
            console.log(`[vault] Canvas URI failed for ${id}, attempting manifest fallback...`)
            const fallback = await this._resolveCanvasFromManifest(id, component)
            if (fallback) {
                const validationError = this._validateCanvas(fallback, id)
                if (!validationError) {
                    console.log(`[vault] Manifest fallback succeeded for ${id}`)
                    this.set(fallback, 'canvas')
                    return fallback
                }
            }
            // Both URI and manifest fallback failed — now dispatch the error
            console.warn(`[vault] Canvas resolution failed for ${id} (URI and manifest fallback)`)
            this._dispatchCanvasError(canvasError)
        }

        return null
    }

    /**
     * Stores a resource in memory cache and localStorage.
     * For manifest types, indexes embedded canvases and skips localStorage
     * (manifests can be megabytes, localStorage has ~5MB quota).
     * @param {Object} item - The item to store
     * @param {string} itemType - Type of item
     */
    set(item, itemType) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        if (!this.store.has(type)) {
            this.store.set(type, new Map())
        }
        this.store.get(type).set(id, item)

        // Index manifest canvases for fallback lookup
        if (type === 'manifest' || type === 'sc:manifest') {
            this._indexManifest(item)
        }

        // Skip localStorage for large types
        if (SKIP_LOCAL_STORAGE_TYPES.has(type)) return

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
        try { localStorage.removeItem(cacheKey) } catch {}
    }

    clear(itemType) {
        const type = this._normalizeType(itemType)
        try {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith(`vault:${type}:`)) {
                    localStorage.removeItem(key)
                }
            }
        } catch {}
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
