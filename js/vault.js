// Local simulacrum vault for use in client without something like webpack
import TPEN from "../api/TPEN.js"
import { urlFromIdAndType } from "../js/utils.js"

// Module-level constants to avoid recreating these sets on every fetch
const SKIP_PROPERTIES = new Set([
    'id', '@id', 'type', '@type', '@context', 'context',
    'metadata', 'label', 'summary', 'requiredStatement',
    'rights', 'navDate', 'language', 'format',
    'duration', 'width', 'height',
    'viewingDirection', 'behavior', 'motivation',
    'timeMode', 'thumbnail', 'placeholderCanvas',
    'accompanyingCanvas', 'provider', 'homepage',
    'logo', 'rendering', 'partOf', 'seeAlso', 'service',
    'prev', 'next',
    'selector', 'conformsTo', 'value', 'purpose', 'profile'
])

// IIIF resource types for both Presentation API v2 (prefixed) and v3 (unprefixed)
// v2 types use prefixes: sc: (Shared Canvas), oa: (Open Annotation)
// v3 types are unprefixed
const IIIF_RESOURCE_TYPES = new Set([
    // IIIF Presentation API v3 (unprefixed)
    'manifest', 'collection', 'canvas', 'annotation',
    'annotationpage', 'annotationcollection', 'range',
    'agent', // v3 metadata type for providers/creators
    // IIIF Presentation API v2 (sc: prefix for Shared Canvas types)
    'sc:manifest', 'sc:collection', 'sc:canvas', 'sc:sequence',
    'sc:range', 'sc:layer',
    // Open Annotation (oa: prefix) - v2 annotation types
    'oa:annotation', 'oa:annotationlist' // annotationlist is v2; becomes annotationpage in v3
])

class Vault {
    constructor() {
        this.store = new Map()
        this.inFlightPromises = new Map()
    }

    _normalizeType(type) {
        return (type ?? '').toString().toLowerCase() || 'none'
    }

    _normalizeId(id) {
        if (typeof id !== 'string') return id
        return id.split('#')[0]
    }

    _getId(item) {
        return this._normalizeId(item?._id ?? item?.id ?? item?.['@id'] ?? item)
    }

    _cacheKey(itemType, id) {
        return `vault:${itemType}:${id}`
    }

    async get(item, itemType, noCache = false) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        
        const promiseKey = `${type}:${id}`
        
        if (this.inFlightPromises.has(promiseKey)) {
            return this.inFlightPromises.get(promiseKey)
        }
        
        // Skip in-memory store check when noCache is true
        if (!noCache) {
            const typeStore = this.store.get(type)
            let result = typeStore?.get(id)
            if (result) return result
        }

        const cacheKey = this._cacheKey(type, id)
        const cached = localStorage.getItem(cacheKey)
        if (cached && !noCache) {
            try {
                const parsed = JSON.parse(cached)
                this.set(parsed, type)
                return parsed
            } catch {}
        }

        const fetchPromise = this._fetchAndHydrate(item, type, id, cacheKey, itemType)
        this.inFlightPromises.set(promiseKey, fetchPromise)
        
        try {
            return await fetchPromise
        } finally {
            this.inFlightPromises.delete(promiseKey)
        }
    }

    async _processIIIFResource(resource, visited, iiifResourceTypes) {
        const resourceId = this._normalizeId(resource?.['@id'] ?? resource?.id)
        const resourceType = resource?.['@type'] ?? resource?.type
        const normalizedType = this._normalizeType(resourceType)
        
        if (resourceId && resourceType && iiifResourceTypes.has(normalizedType) && !visited.has(resourceId)) {
            visited.add(resourceId)
            
            // Check if resource is a full embedded object vs a minimal stub/reference.
            // A stub with just {id, type, label} should be fetched to get full content.
            // An embedded object has properties that indicate substantial content:
            // - items/annotations: arrays containing child resources (Canvas, Manifest, AnnotationPage, Collection)
            // - body/target: core annotation properties (at least one present)
            // - height+width: Canvas dimensions (both must be present)
            // Stubs may have other metadata (label, summary, thumbnail) but lack content properties.
            const hasItems = Array.isArray(resource?.items) && resource.items.length > 0
            const hasAnnotations = Array.isArray(resource?.annotations) && resource.annotations.length > 0
            const hasBody = resource?.body !== undefined
            const hasTarget = resource?.target !== undefined
            const hasCanvasDimensions = resource?.height !== undefined && resource?.width !== undefined
            
            const isEmbeddedObject = typeof resource === 'object' && resource !== null &&
                (hasItems || hasAnnotations || hasBody || hasTarget || hasCanvasDimensions)
            
            if (isEmbeddedObject) {
                // For embedded objects, cache directly without fetching
                this.set(resource, normalizedType)
            } else {
                // For ID strings or minimal references, fetch the full resource
                await this.get(resource, resourceType)
            }
            
            return { id: resourceId, type: resourceType, label: resource?.label ?? resource?.title }
        }
        return null
    }

    async _fetchAndHydrate(item, type, id, cacheKey, itemType) {
        const seed = item && typeof item === 'object' ? item : null
        const hydrateFromObject = async (data) => {
            if (!data || typeof data !== 'object') {
                if (seed) this.set(seed, type)
                return seed
            }
            
            // Clone the data to avoid mutating the original object passed by the caller
            data = structuredClone(data)
            
            const dataType = this._normalizeType(data?.['@type'] ?? data?.type ?? type)
            const hasKnownType = dataType && dataType !== 'none'
            const queue = [{ obj: data, depth: 0 }]
            const visited = new Set()

            while (queue.length) {
                const { obj, depth } = queue.shift()
                if (depth >= 4 || !obj || typeof obj !== 'object') continue

                for (const key of Object.keys(obj)) {
                    // Skip known non-resource properties
                    if (SKIP_PROPERTIES.has(key)) continue
                    
                    const value = obj[key]
                    
                    // Skip if we've already processed this value
                    const valueId = this._normalizeId(value?.['@id'] ?? value?.id)
                    if ((valueId && visited.has(valueId)) || (typeof value === 'string' && visited.has(value))) {
                        continue
                    }
                    
                    if (Array.isArray(value)) {
                        for (const item of value) {
                            if (item && typeof item === 'object') {
                                queue.push({ obj: item, depth: depth + 1 })
                                // Process IIIF resources in arrays (e.g., canvases in manifest.items)
                                await this._processIIIFResource(item, visited, IIIF_RESOURCE_TYPES)
                            }
                        }
                    } else if (value && typeof value === 'object') {
                        queue.push({ obj: value, depth: depth + 1 })
                    }

                    // Handle objects with id and type properties (non-array values)
                    const processed = await this._processIIIFResource(value, visited, IIIF_RESOURCE_TYPES)
                    if (processed) {
                        obj[key] = processed
                    }
                }
            }
            const storageType = hasKnownType ? dataType : type
            this.set(data, storageType)
            const cacheKeyToUse = hasKnownType ? this._cacheKey(dataType, id) : cacheKey
            try {
                localStorage.setItem(cacheKeyToUse, JSON.stringify(data))
            } catch {}
            return data
        }

        try {
            const uri = urlFromIdAndType(id, type, {
                projectId: TPEN.screen?.projectInQuery,
                pageId: TPEN.screen?.pageInQuery,
                layerId: TPEN.screen?.layerInQuery
            })
            // Guard against empty/falsy URIs to avoid fetching the current page
            if (!uri) {
                if (seed) return hydrateFromObject(seed)
                return null
            }
            const response = await fetch(uri)
            if (!response.ok) {
                if (seed) return hydrateFromObject(seed)
                return null
            }

            const data = await response.json()
            return hydrateFromObject(data)
        } catch (err) {
            if (seed) return hydrateFromObject(seed)
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

    async prefetchDocuments(items, docType) {
        if (!Array.isArray(items)) items = [items]
        const errors = []
        const promises = items.map(item => {
            const type = docType ?? item?.['@type'] ?? item?.type
            return this.get(item, type)
                .catch(err => {
                    errors.push({ item, error: err?.message || String(err) })
                    return null
                })
        })
        try {
            await Promise.all(promises)
        } catch (err) {
        }
        return errors
    }

    async prefetchManifests(items) {
        return this.prefetchDocuments(items, 'manifest')
    }

    async prefetchCollections(items) {
        return this.prefetchDocuments(items, 'collection')
    }

    /**
     * Get a resource with automatic manifest prefetch fallback.
     * This helper method consolidates the common pattern of:
     * 1. Try to get the resource from cache
     * 2. If not found, prefetch project manifests
     * 3. Retry getting the resource
     * 
     * @param {string|object} item - The resource ID or object to fetch
     * @param {string} itemType - The type of resource (e.g., 'canvas', 'annotationpage')
     * @param {string|string[]} manifestUrls - Manifest URL(s) to prefetch if resource not found
     * @param {boolean} noCache - If true, bypass cache and force fresh fetch
     * @returns {Promise<object|null>} The resolved resource or null if not found
     */
    async getWithFallback(item, itemType, manifestUrls, noCache = false) {
        let result = await this.get(item, itemType, noCache)
        if (!result && manifestUrls) {
            await this.prefetchManifests(manifestUrls)
            result = await this.get(item, itemType, noCache)
        }
        return result
    }
}

const vault = new Vault()
if (typeof window !== 'undefined') {
    window.Vault = vault
}

export default vault
