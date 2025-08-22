// Local simulacrum vault for use in client without something like webpack
import TPEN from "../api/TPEN.js"
import { urlFromIdAndType } from "../js/utils.js"
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

    async get(item, itemType, noCache = false) {
        const type = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
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

        try {
            const uri = urlFromIdAndType(id, type, {
                projectId: TPEN.screen?.projectInQuery,
                pageId: TPEN.screen?.pageInQuery,
                layerId: TPEN.screen?.layerInQuery
            })
            const response = await fetch(uri)
            if (!response.ok) return null

            const data = await response.json()
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
        } catch {
            return
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
