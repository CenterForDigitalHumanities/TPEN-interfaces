// Local simulacrum vault for use in client without something like webpack

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

    async get(item, itemType) {
        itemType = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        const typeStore = this.store.get(itemType)
        let result = typeStore?.get(id) ?? null
        if (result) return result

        const cacheKey = this._cacheKey(itemType, id)
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                this.set(parsed, itemType)
                return parsed
            } catch {}
        }

        try {
            const response = await fetch(id)
            if (!response.ok) return null

            const data = await response.json()
            this.set(data, itemType)
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data))
            } catch {}
            return data
        } catch {
            return null
        }
    }

    set(item, itemType) {
        itemType = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        if (!this.store.has(itemType)) {
            this.store.set(itemType, new Map())
        }
        this.store.get(itemType).set(id, item)
        const cacheKey = this._cacheKey(itemType, id)
        try {
            localStorage.setItem(cacheKey, JSON.stringify(item))
        } catch {}
    }

    delete(item, itemType) {
        itemType = this._normalizeType(itemType ?? item?.type ?? item?.['@type'])
        const id = this._getId(item)
        if (!this.store.has(itemType)) return
        const typeStore = this.store.get(itemType)
        if (!typeStore.has(id)) return
        typeStore.delete(id)
        const cacheKey = this._cacheKey(itemType, id)
        localStorage.removeItem(cacheKey)
    }

    clear(itemType) {
        if (itemType) {
            itemType = this._normalizeType(itemType)
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith(`vault:${itemType}:`)) {
                    localStorage.removeItem(key)
                }
            }
        } else {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('vault:')) {
                    localStorage.removeItem(key)
                }
            }
        }
        this.store = new Map()
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
