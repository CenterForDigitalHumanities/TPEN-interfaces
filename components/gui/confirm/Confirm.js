import { eventDispatcher } from '../../../api/events.js'

/**
 * Confirm - A modal confirmation dialog with positive/negative options.
 * Takes over the screen until user makes a choice.
 * @element tpen-confirm
 */
class Confirm extends HTMLElement {
    /** @type {number|null} Timer ID for show animation */
    _showTimer = null
    /** @type {number|null} Timer ID for removal animation */
    _removeTimer = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <output role="confirm">
            <slot></slot>
            </output>
        `
    }

    /**
     * Make the backdrop for screen takeover as well as the confirm dialogue visible.
     * Have them appear with a dropdown effect.
     */
    show() {
        this.closest(".confirm-area").style.display = "grid"
        this._showTimer = setTimeout(() => {
            this.closest(".confirm-area").classList.add("show")
            this.classList.add('show')
            document.querySelector("body").style.overflow = "hidden"
        }, 1)
        eventDispatcher.dispatch("tpen-confirm-activated")
    }

    /**
     * Make the backdrop for screen takeover as well as the alert dialogue disappear with a lift up effect.
     * Used after a user clicks the button in the alert.
     */
    dismiss() {
        this.classList.remove('show')
        this.closest(".confirm-area").classList.remove("show")
        document.querySelector("body").style.overflow = "auto"
        this._removeTimer = setTimeout(() => {
            this.remove()
        }, 500)
    }

    disconnectedCallback() {
        if (this._showTimer) clearTimeout(this._showTimer)
        if (this._removeTimer) clearTimeout(this._removeTimer)
    }
}

customElements.define('tpen-confirm', Confirm)
