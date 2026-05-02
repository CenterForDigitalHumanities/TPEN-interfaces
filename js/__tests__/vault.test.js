import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

// Stub TPEN before vault imports it
const { default: TPEN } = await import('../../api/TPEN.js')
TPEN.servicesURL = 'https://api.t-pen.test'
TPEN.RERUMURL = 'https://store.rerum.test/v1'
TPEN.screen = { projectInQuery: null, pageInQuery: null, layerInQuery: null }

// We need to reach the Vault class directly for isolated instances in tests
// Import via dynamic evaluation to get the class constructor
const vaultModule = await import('../vault.js')
const VaultClass = Object.getPrototypeOf(vaultModule.vault ?? Object.values(vaultModule)[0]).constructor

describe('Vault', () => {
    let v

    beforeEach(() => {
        v = new VaultClass()
        localStorage.clear()
    })

    afterEach(() => {
        localStorage.clear()
        global.fetch = undefined
    })

    describe('set() and in-memory get()', () => {
        it('caches a resource and retrieves it from memory', async () => {
            const canvas = { id: 'https://example.com/canvas/1', type: 'Canvas', width: 640, height: 480 }
            v.set(canvas, 'canvas')
            const result = await v.get('https://example.com/canvas/1', 'canvas')
            assert.deepEqual(result, canvas)
        })

        it('does not cache items without id', () => {
            v.set({ type: 'Canvas' }, 'canvas')
            assert.equal(v.all().length, 0)
        })

        it('normalizes type to lowercase', async () => {
            const canvas = { id: 'https://example.com/canvas/2', type: 'Canvas' }
            v.set(canvas, 'Canvas')
            const result = await v.get('https://example.com/canvas/2', 'canvas')
            assert.ok(result)
        })
    })

    describe('localStorage fallback', () => {
        it('restores a cached resource from localStorage when memory cache is cold', async () => {
            const canvas = { id: 'https://example.com/canvas/ls', type: 'canvas', width: 100, height: 100 }
            // Write directly to localStorage (simulating a warm ls cache from previous session)
            localStorage.setItem('vault:canvas:https://example.com/canvas/ls', JSON.stringify(canvas))

            const result = await v.get('https://example.com/canvas/ls', 'canvas')
            assert.deepEqual(result, canvas)
        })
    })

    describe('network fetch fallback', () => {
        it('fetches from network when cache misses and returns the resource', async () => {
            const manifest = {
                id: 'https://example.com/manifest/1',
                type: 'Manifest',
                items: []
            }
            global.fetch = async (url) => ({
                ok: true,
                json: async () => manifest
            })

            // Stub urlFromIdAndType to return a fetchable URL for manifest type
            // The vault uses urlFromIdAndType internally, and manifest type falls through to RERUM
            // We can use a full URL id to bypass the URL builder
            const result = await v.get('https://example.com/manifest/1', 'manifest')
            assert.ok(result)
            assert.equal(result.id, 'https://example.com/manifest/1')
        })

        it('returns null when network fails and no seed provided', async () => {
            global.fetch = async () => { throw new Error('Network error') }
            const result = await v.get('https://example.com/canvas/missing', 'canvas')
            assert.equal(result, null)
        })

        it('uses seed as fallback when network fails', async () => {
            global.fetch = async () => { throw new Error('Network error') }
            const seed = { id: 'https://example.com/canvas/seed', type: 'canvas', width: 10, height: 10 }
            const result = await v.get(seed, 'canvas')
            assert.ok(result)
            assert.equal(result.id, seed.id)
        })
    })

    describe('in-flight deduplication', () => {
        it('returns the same promise for concurrent requests to the same resource', async () => {
            let fetchCount = 0
            global.fetch = async () => {
                fetchCount++
                await new Promise(r => setTimeout(r, 5))
                return {
                    ok: true,
                    json: async () => ({ id: 'https://example.com/canvas/inflight', type: 'canvas', width: 1, height: 1 })
                }
            }
            const [r1, r2] = await Promise.all([
                v.get('https://example.com/canvas/inflight', 'canvas'),
                v.get('https://example.com/canvas/inflight', 'canvas')
            ])
            assert.equal(fetchCount, 1)
            assert.deepEqual(r1, r2)
        })
    })

    describe('delete()', () => {
        it('removes resource from memory and localStorage', async () => {
            const canvas = { id: 'https://example.com/canvas/del', type: 'canvas', width: 1, height: 1 }
            v.set(canvas, 'canvas')
            v.delete(canvas, 'canvas')
            assert.equal(localStorage.getItem('vault:canvas:https://example.com/canvas/del'), null)
        })
    })

    describe('noCache flag', () => {
        it('bypasses in-memory cache when noCache=true', async () => {
            const orig = { id: 'https://example.com/canvas/nc', type: 'canvas', width: 1, height: 1 }
            v.set(orig, 'canvas')

            let fetchCount = 0
            global.fetch = async () => {
                fetchCount++
                return {
                    ok: true,
                    json: async () => ({ ...orig, width: 999 })
                }
            }
            await v.get('https://example.com/canvas/nc', 'canvas', true)
            assert.equal(fetchCount, 1)
        })
    })
})
