import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../../test/helpers/dom.js'

// Stub TPEN before the component imports it
const { default: TPEN } = await import('../../../api/TPEN.js')
TPEN.attachAuthentication = () => {}
TPEN.getAuthorization = () => 'mock-token'
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

const { default: FeedbackButton } = await import('../index.js')

if (!customElements.get('tpen-feedback-button')) {
    customElements.define('tpen-feedback-button', FeedbackButton)
}

describe('FeedbackButton', () => {
    let el

    beforeEach(() => {
        el = document.createElement('tpen-feedback-button')
        document.body.appendChild(el)
    })

    afterEach(() => {
        el.remove()
    })

    it('renders into shadow DOM on connectedCallback', () => {
        assert.ok(el.shadowRoot)
        assert.ok(el.shadowRoot.innerHTML.length > 0)
    })

    it('renders a feedback icon container', () => {
        const icon = el.shadowRoot.querySelector('.feedback-icon-container')
        assert.ok(icon, 'Expected .feedback-icon-container in shadow DOM')
    })

    it('renders a feedback modal element', () => {
        const modal = el.shadowRoot.querySelector('#feedback-modal')
        assert.ok(modal, 'Expected #feedback-modal in shadow DOM')
    })

    it('renders a backdrop element', () => {
        const backdrop = el.shadowRoot.querySelector('#feedback-backdrop')
        assert.ok(backdrop, 'Expected #feedback-backdrop in shadow DOM')
    })

    it('closeModal() removes "show" class from modal and backdrop', () => {
        const modal = el.shadowRoot.querySelector('#feedback-modal')
        const backdrop = el.shadowRoot.querySelector('#feedback-backdrop')
        const icon = el.shadowRoot.querySelector('.feedback-icon-container')
        modal?.classList.add('show')
        backdrop?.classList.add('show')
        icon?.classList.add('active', 'shrunk')
        el.closeModal()
        assert.ok(!modal?.classList.contains('show'))
        assert.ok(!backdrop?.classList.contains('show'))
    })

    it('cleans up on disconnectedCallback without errors', () => {
        assert.doesNotThrow(() => el.disconnectedCallback())
    })
})
