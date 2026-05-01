import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { checkIfUrlExists } = await import('../checkIfUrlExists.js')

describe('checkIfUrlExists', () => {
    const originalFetch = global.fetch

    afterEach(() => {
        global.fetch = originalFetch
    })

    it('returns true when fetch responds with ok=true', async () => {
        global.fetch = async () => ({ ok: true })
        const result = await checkIfUrlExists('https://example.com/resource')
        assert.equal(result, true)
    })

    it('returns false when fetch responds with ok=false', async () => {
        global.fetch = async () => ({ ok: false })
        const result = await checkIfUrlExists('https://example.com/missing')
        assert.equal(result, false)
    })

    it('returns false when fetch throws a network error', async () => {
        global.fetch = async () => { throw new Error('Network error') }
        const result = await checkIfUrlExists('https://example.com/error')
        assert.equal(result, false)
    })

    it('sends a HEAD request', async () => {
        let capturedMethod
        global.fetch = async (url, opts) => {
            capturedMethod = opts?.method
            return { ok: true }
        }
        await checkIfUrlExists('https://example.com/resource')
        assert.equal(capturedMethod, 'HEAD')
    })
})
