import { eventDispatcher } from '../../../api/events.js'

/**
 * Alert - A modal alert dialog that requires user acknowledgement.
 * Takes over the screen until dismissed.
 * @element tpen-alert
 */
class Alert extends HTMLElement {
    /** @type {number|null} Timer ID for show animation */
    _showTimer = null
    /** @type {number|null} Timer ID for removal animation */
    _removeTimer = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <output role="alert">
            <slot></slot>
            </output>
        `
    }

    /**
     * Make the backdrop for screen takeover as well as the alert dialogue visible.
     * Have them appear with a dropdown effect.
     */
    show() {
        this.closest(".alert-area").style.display = "grid"
        this._showTimer = setTimeout(() => {
            this.closest(".alert-area").classList.add("show")
            this.classList.add('show')
            document.querySelector("body").style.overflow = "hidden"
        }, 1)
        eventDispatcher.dispatch("tpen-alert-activated")
    }

    /**
     * Make the backdrop for screen takeover as well as the alert dialogue disappear with a lift up effect.
     * Used after a user clicks the button in the alert.
     */
    dismiss() {
        this.classList.remove('show')
        this.closest(".alert-area").classList.remove("show")
        document.querySelector("body").style.overflow = "auto"
        this._removeTimer = setTimeout(() => {
            this.remove()
        }, 500)
        eventDispatcher.dispatch("tpen-alert-acknowledged")
    }

    disconnectedCallback() {
        if (this._showTimer) clearTimeout(this._showTimer)
        if (this._removeTimer) clearTimeout(this._removeTimer)
    }
}

customElements.define('tpen-alert', Alert)
