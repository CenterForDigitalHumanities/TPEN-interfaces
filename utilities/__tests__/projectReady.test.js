import { describe, it, beforeEach, afterEach } from 'node:test'
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

const { onProjectReady } = await import('../projectReady.js')

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
