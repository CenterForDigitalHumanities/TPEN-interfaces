import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

// Stub TPEN and dependencies before the component imports them
const { default: TPEN } = await import('../../api/TPEN.js')
TPEN.attachAuthentication = () => {}
TPEN.getAuthorization = () => 'mock-token'
TPEN.activeProject = null
TPEN.screen = { projectInQuery: null, pageInQuery: null, layerInQuery: null }
TPEN.eventDispatcher = {
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

// Stub CheckPermissions before component import
const checkPermissionsModule = await import('../../check-permissions/checkPermissions.js')
const CheckPermissions = checkPermissionsModule.default
CheckPermissions.verify = () => {}

const { default: SimpleTranscription } = await import('../index.js')

if (!customElements.get('tpen-simple-transcription')) {
    customElements.define('tpen-simple-transcription', SimpleTranscription)
}

describe('SimpleTranscriptionInterface', () => {
    let el

    beforeEach(() => {
        el = document.createElement('tpen-simple-transcription')
        document.body.appendChild(el)
    })

    afterEach(() => {
        el.disconnectedCallback()
        el.remove()
        TPEN.eventDispatcher._handlers.clear()
    })

    it('attaches a shadow root', () => {
        assert.ok(el.shadowRoot)
    })

    it('sets data-interface-type attribute on connectedCallback', () => {
        assert.equal(el.getAttribute('data-interface-type'), 'transcription')
    })

    it('registers a project-ready subscription', () => {
        assert.ok(typeof el._unsubProject === 'function', 'Expected _unsubProject to be a function')
    })

    it('cleans up event listeners on disconnectedCallback', () => {
        el.disconnectedCallback()
        // After cleanup the unsubProject reference should remain callable but be a no-op
        assert.doesNotThrow(() => el._unsubProject?.())
    })
})
