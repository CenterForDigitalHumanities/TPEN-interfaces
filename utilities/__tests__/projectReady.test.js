import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

// We need to mock TPEN before importing projectReady
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

// Patch the TPEN singleton before importing
const { default: TPEN } = await import('../../api/TPEN.js')
TPEN.eventDispatcher = mockDispatcher

const { onProjectReady, whenProjectReady } = await import('../projectReady.js')

describe('onProjectReady', () => {
    afterEach(() => {
        mockDispatcher._handlers.clear()
        TPEN.activeProject = undefined
    })

    it('subscribes handler to tpen-project-loaded event', () => {
        let fired = 0
        const ctx = {}
        onProjectReady(ctx, () => { fired++ })
        mockDispatcher.dispatch('tpen-project-loaded')
        assert.equal(fired, 1)
    })

    it('immediately calls handler when project is already loaded', () => {
        TPEN.activeProject = { _createdAt: Date.now() }
        let fired = 0
        const ctx = {}
        onProjectReady(ctx, () => { fired++ })
        assert.equal(fired, 1)
    })

    it('returns an unsubscribe function', () => {
        let fired = 0
        const ctx = {}
        const unsub = onProjectReady(ctx, () => { fired++ })
        unsub()
        mockDispatcher.dispatch('tpen-project-loaded')
        assert.equal(fired, 0)
    })

    it('returns a no-op when ctx or handler is missing', () => {
        assert.doesNotThrow(() => {
            onProjectReady(null, () => {})()
            onProjectReady({}, null)?.()
        })
    })
})

describe('whenProjectReady', () => {
    afterEach(() => {
        mockDispatcher._handlers.clear()
        TPEN.activeProject = undefined
    })

    it('subscribes handler to tpen-project-loaded event', () => {
        let fired = 0
        whenProjectReady(() => { fired++ })
        mockDispatcher.dispatch('tpen-project-loaded', { _id: 'p1' })
        assert.equal(fired, 1)
    })

    it('invokes synchronously with synthetic event when project already loaded', () => {
        const project = { _createdAt: Date.now(), _id: 'p1' }
        TPEN.activeProject = project
        let received
        whenProjectReady(ev => { received = ev })
        assert.deepEqual(received, { detail: project })
    })

    it('does not invoke synchronously when project is not loaded', () => {
        let fired = 0
        whenProjectReady(() => { fired++ })
        assert.equal(fired, 0)
    })

    it('returns an unsubscribe function', () => {
        let fired = 0
        const unsub = whenProjectReady(() => { fired++ })
        unsub()
        mockDispatcher.dispatch('tpen-project-loaded', { _id: 'p1' })
        assert.equal(fired, 0)
    })

    it('returns a no-op when handler is missing', () => {
        assert.doesNotThrow(() => { whenProjectReady(null)?.() })
    })

    it('does not also receive future dispatches after a sync fire', () => {
        TPEN.activeProject = { _createdAt: Date.now(), _id: 'p1' }
        let fired = 0
        whenProjectReady(() => { fired++ })
        mockDispatcher.dispatch('tpen-project-loaded', { _id: 'p2' })
        assert.equal(fired, 1)
    })

    it('logs and recovers when sync handler throws', () => {
        TPEN.activeProject = { _createdAt: Date.now(), _id: 'p1' }
        const originalError = console.error
        let logged
        console.error = (...args) => { logged = args }
        try {
            assert.doesNotThrow(() => {
                whenProjectReady(() => { throw new Error('boom') })
            })
            assert.ok(logged?.[0]?.includes('[whenProjectReady]'))
        } finally {
            console.error = originalError
        }
    })
})
