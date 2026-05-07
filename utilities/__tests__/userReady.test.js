import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const mockDispatcher = {
    _handlers: new Map(),
    on(event, handler) {
        if (!this._handlers.has(event)) this._handlers.set(event, [])
        this._handlers.get(event).push(handler)
    },
    off(event, handler) {
        const handlers = this._handlers.get(event) ?? []
        const idx = handlers.indexOf(handler)
        if (idx !== -1) handlers.splice(idx, 1)
    },
    dispatch(event, detail) {
        for (const h of this._handlers.get(event) ?? []) h({ detail })
    }
}

const { default: TPEN } = await import('../../api/TPEN.js')
TPEN.eventDispatcher = mockDispatcher
TPEN.getAuthorization = () => null
// Override currentUser getter+setter to allow test control without class validation
let _mockUser = undefined
Object.defineProperty(TPEN, 'currentUser', {
    get: () => _mockUser,
    set: (v) => { _mockUser = v },
    configurable: true
})

const { onUserReady } = await import('../userReady.js')

describe('onUserReady', () => {
    afterEach(() => {
        mockDispatcher._handlers.clear()
        _mockUser = undefined
    })

    it('subscribes handler to tpen-user-loaded event', () => {
        let fired = 0
        const ctx = {}
        onUserReady(ctx, () => { fired++ })
        mockDispatcher.dispatch('tpen-user-loaded', { _id: 'user-1', displayName: 'Test User' })
        assert.equal(fired, 1)
    })

    it('immediately invokes handler when user is already loaded', () => {
        _mockUser = { _id: 'user-1', displayName: 'Test User' }
        let received = null
        const ctx = {}
        onUserReady(ctx, (user) => { received = user })
        assert.equal(received, TPEN.currentUser)
    })

    it('returns an unsubscribe function', () => {
        let fired = 0
        const ctx = {}
        const unsub = onUserReady(ctx, () => { fired++ })
        unsub()
        mockDispatcher.dispatch('tpen-user-loaded', { _id: 'user-1', displayName: 'Test' })
        assert.equal(fired, 0)
    })

    it('returns a no-op when ctx or handler is missing', () => {
        assert.doesNotThrow(() => {
            onUserReady(null, () => {})()
            onUserReady({}, null)?.()
        })
    })
})
