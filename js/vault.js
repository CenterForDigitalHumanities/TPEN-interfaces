// Local simulacrum vault for use in client without something like webpack
import TPEN from "../api/TPEN.js"
import { urlFromIdAndType } from "../js/utils.js"

/** Types that are too large for localStorage (manifests can be megabytes). */
const SKIP_LOCAL_STORAGE_TYPES = new Set(['manifest', 'collection', 'annotationcollection'])

/**
 * Vault - Client-side caching utility for IIIF resources.
 * Provides memory and localStorage caching with type-specific validation.
 * When a Canvas URI fails to resolve, automatically attempts to find the
 * Canvas as embedded data within a parent Manifest.
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
     * @returns {Object} Standardized error object
     */
    _createCanvasError(errorType, message, httpStatus, canvasUri) {
        return {
            errorType,
            message,
            httpStatus,
            canvasUri
        }
    }

    /**
     * Dispatches a canvas resolution failure event.
     * @param {Object} error - The error object from _createCanvasError
     */
    _dispatchCanvasError(error) {
        TPEN.eventDispatcher?.dispatch('tpen-canvas-resolution-failed', error)
    }

    /**
     * Core fallback orchestrator: attempts to find a canvas from its parent manifest.
     * Used so that if a Canvas URI does not resolve the canvas object from within the mainfest can be returned in its stead. 
     * @param {string} canvasId - The canvas ID to resolve
     * @returns {Promise<Object|null>} The embedded canvas or null
     */
    async _getCanvasFromManifest(canvasId) {
        console.log("TODO get canvas from manifest if possible.  Assume fail return null for now.")
        return null
    }

    /**
     * Fetches and caches a resource by ID and type.
     * For canvas type, performs validation and attempts manifest fallback on failure.
     * Error events are only dispatched if BOTH URI resolution AND manifest fallback fail.
     * @param {string|Object} item - Item ID or object with id property
     * @param {string} itemType - Type of item ('canvas', 'manifest', etc.)
     * @param {boolean} [noCache=false] - Skip cache lookup
     * @returns {Promise<Object|null>} The fetched resource or null on failure
     */
    async get(item, itemType, noCache = false) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        const isCanvas = (type === 'canvas' || type === "sc:canvas")
        const isManifest =  (type === 'manifest' || type === "sc:manifest")
        if (!noCache) {
            const typeStore = this.store.get(type)
            const result = typeStore?.get(id)
            if (result) return result
        }
        if (isManifest) {
            console.log("fetch this manifest uri")
            console.log(id)  
        }
        if (isCanvas) {
            console.log("fetch this canvas uri")
            console.log(id)  
        }
        const cacheKey = this._cacheKey(type, id)
        let cached
        try { cached = localStorage.getItem(cacheKey) } catch {}
        if (cached && !noCache) {
            try {
                if (isManifest) {
                    console.log("manifest was already cached")
                    console.log(cached)  
                }
                if (isCanvas) {
                    console.log("canvas was already cached")
                    console.log(cached)  
                }
                const parsed = JSON.parse(cached)
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
            let data = item
            const response = await fetch(uri, noCache ? { cache: 'no-store' } : undefined)
            if (!response.ok) {
                // Do I have the thing I tried to fetch in localstorage/memory already
                if (isCanvas) {
                    console.log("Canvas did not resolve.")
                    console.log("Where is the manifest to check?")
                }
                // return null
            }
            if (response.ok) data = await response.json()
            const queue = [{ obj: data, depth: 0 }]
            const visited = new Set()
            if (isCanvas) {
                console.log("queue when canvas did not resolve")
                console.log(queue)
            }
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
            if (isCanvas) {
                console.log("canvas data after looping through queue")
                console.log(data)
            }
            this.set(data, itemType)
            try {
                // console.log("set item in cache")
                // console.log(data)
                if (isManifest) console.log("putting manifest into localStorage")
                if (isCanvas) console.log("putting canvas into localStorage")
                localStorage.setItem(cacheKey, JSON.stringify(data))
            } catch {}
            return data
        } catch {
            return
        }
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
        // Clean up canvasToManifest entries pointing to this manifest
        if (type === 'manifest') {
            for (const [canvasId, manifestId] of this.canvasToManifest) {
                if (manifestId === id) this.canvasToManifest.delete(canvasId)
            }
        }
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
        // Clean up canvasToManifest entries when clearing manifests
        if (type === 'manifest') {
            this.canvasToManifest.clear()
        }
    }

    all() {
        return [...this.store.values()]
    }
}

const vault = new Vault()
if (typeof window !== 'undefined') {
    window.Vault = vault
}

export default vault
