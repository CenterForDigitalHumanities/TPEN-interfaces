// Local simulacrum vault for use in client without something like webpack

class Vault {
    constructor() {
        this.store = new Map()
    }

    async get(item, itemType) {
        itemType ??= item.type ?? item['@type'] ?? "none"
        const id = item._id ?? item.id ?? item['@id'] ?? item
        const typeStore = this.store.get(itemType)
        let result = typeStore?.get(id) ?? null
        if (result) return result

        // Try localStorage as a semi-permanent cache
        const cacheKey = `vault:${itemType}:${id}`
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
            // Store in localStorage
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data))
            } catch {}
            return data
        } catch {
            return null
        }
    }

    set(item, itemType) {
        itemType ??= item.type ?? item['@type'] ?? "none"
        const id = item._id ?? item.id ?? item['@id'] ?? item
        if (!this.store.has(itemType)) {
            this.store.set(itemType, new Map())
        }
        this.store.get(itemType).set(id, item)
        // Also update localStorage
        const cacheKey = `vault:${itemType}:${id}`
        try {
            localStorage.setItem(cacheKey, JSON.stringify(item))
        } catch {}
    }

    delete(item, itemType) {
        itemType ??= item.type ?? item['@type'] ?? "none"
        const id = item._id ?? item.id ?? item['@id'] ?? item
        if (!this.store.has(itemType)) return
        const typeStore = this.store.get(itemType)
        if (!typeStore.has(id)) return
        typeStore.delete(id)
        // Remove from localStorage
        const cacheKey = `vault:${itemType}:${id}`
        localStorage.removeItem(cacheKey)
    }

    clear(itemType) {
        if (itemType) {
            // Remove all items of this type from localStorage
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith(`vault:${itemType}:`)) {
                    localStorage.removeItem(key)
                }
            }
        } else {
            // Remove all vault items from localStorage
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('vault:')) {
                    localStorage.removeItem(key)
                }
            }
        }
        // Also clear from in-memory store
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
