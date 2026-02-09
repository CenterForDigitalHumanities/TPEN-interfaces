// Local simulacrum vault for use in client without something like webpack
import TPEN from "../api/TPEN.js"
import { urlFromIdAndType } from "../js/utils.js"
class Vault {
    // Regex pattern to match and strip known IIIF and RDF prefixes
    // Compiled once to avoid overhead on repeated calls
    static PREFIX_PATTERN = /^(sc|oa|as|dcterms|exif|iiif|cnt|dctypes|foaf|rdf|rdfs|svcs|xsd):/i
    
    constructor() {
        this.store = new Map()
        this.inFlightPromises = new Map()
    }

    _normalizeType(type) {
        if (!type) return 'none'
        let normalized = type.toString()
        
        // Strip known IIIF prefixes (sc:, oa:, as:, etc.) before lowercasing
        // This ensures both 'sc:Canvas' and 'Canvas' normalize to 'canvas'
        normalized = normalized.replace(Vault.PREFIX_PATTERN, '')
        
        return normalized.toLowerCase() || 'none'
    }

    _isMongoHexString(str) {
        return typeof str === 'string' && /^[a-f0-9]{24}$/i.test(str)
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
        
        const typeStore = this.store.get(type)
        let result = typeStore?.get(id)
        if (result) return result

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
            await this.get(resource, resourceType)
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
            
            const skipProperties = new Set([
                'id', '@id', 'type', '@type', '@context', 'context', 
                'metadata', 'label', 'summary', 'requiredStatement',
                'rights', 'navDate', 'language', 'format',
                'duration', 'width', 'height', 
                'viewingDirection', 'behavior', 'motivation',
                'timeMode', 'thumbnail', 'placeholderCanvas',
                'accompanyingCanvas', 'provider', 'homepage',
                'logo', 'rendering', 'partOf', 'seeAlso', 'service',
                'prev', 'next',
                'selector', 'conformsTo', 'value',
                'motivation', 'purpose', 'profile'
            ])
            
            // IIIF resource types that should be fetched and hydrated
            // Includes types from both IIIF Presentation API v2 and v3:
            // - Core types: manifest, collection, canvas, range
            // - Annotation types: annotation, annotationpage, annotationcollection, annotationlist
            // - v2 specific: sequence, layer (structural constructs)
            // - Content types: content, choice, specificresource (for media content and targeting)
            // - Other: agent (metadata about people/organizations)
            const iiifResourceTypes = new Set([
                'manifest', 'collection', 'canvas', 'annotation', 
                'annotationpage', 'annotationcollection', 'range',
                'agent', 'annotationlist', 'layer', 'sequence',
                'content', 'choice', 'specificresource'
            ])
            
            const dataType = this._normalizeType(data?.['@type'] ?? data?.type ?? type)
            const hasKnownType = dataType && dataType !== 'none'
            const queue = [{ obj: data, depth: 0 }]
            const visited = new Set()

            while (queue.length) {
                const { obj, depth } = queue.shift()
                if (depth >= 4 || !obj || typeof obj !== 'object') continue

                for (const key of Object.keys(obj)) {
                    // Skip known non-resource properties
                    if (skipProperties.has(key)) continue
                    
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
                                await this._processIIIFResource(item, visited, iiifResourceTypes)
                            }
                        }
                    } else if (value && typeof value === 'object') {
                        queue.push({ obj: value, depth: depth + 1 })
                    }

                    // Handle objects with id and type properties (non-array values)
                    const processed = await this._processIIIFResource(value, visited, iiifResourceTypes)
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

    async prefetchDocuments(items) {
        if (!Array.isArray(items)) items = [items]
        const errors = []
        const promises = items.map(item => {
            return this.get(item, item?.['@type'] ?? item?.type)
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
}

const vault = new Vault()
if (typeof window !== 'undefined') {
    window.Vault = vault
}

export default vault
