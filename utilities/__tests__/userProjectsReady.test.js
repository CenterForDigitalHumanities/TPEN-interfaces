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
TPEN.getUserProjects = async () => []
// Override the getter-only userProjects property to allow test control
Object.defineProperty(TPEN, 'userProjects', { get: () => _mockProjects, configurable: true })
let _mockProjects = undefined

const { onUserProjectsReady } = await import('../userProjectsReady.js')

describe('onUserProjectsReady', () => {
    afterEach(() => {
        mockDispatcher._handlers.clear()
        _mockProjects = undefined
    })

    it('subscribes handler to tpen-user-projects-loaded event', () => {
        let fired = 0
        const ctx = {}
        onUserProjectsReady(ctx, () => { fired++ })
        mockDispatcher.dispatch('tpen-user-projects-loaded')
        assert.equal(fired, 1)
    })

    it('immediately invokes handler when projects are already cached', () => {
        _mockProjects = [{ _id: 'p1' }]
        let received = null
        const ctx = {}
        onUserProjectsReady(ctx, (projects) => { received = projects })
        assert.deepEqual(received, [{ _id: 'p1' }])
    })

    it('returns an unsubscribe function', () => {
        let fired = 0
        const ctx = {}
        const unsub = onUserProjectsReady(ctx, () => { fired++ })
        unsub()
        mockDispatcher.dispatch('tpen-user-projects-loaded')
        assert.equal(fired, 0)
    })

    it('returns a no-op when ctx or handler is missing', () => {
        assert.doesNotThrow(() => {
            onUserProjectsReady(null, () => {})()
            onUserProjectsReady({}, null)?.()
        })
    })
})
