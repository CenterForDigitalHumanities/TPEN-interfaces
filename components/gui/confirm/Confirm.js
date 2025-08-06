import { eventDispatcher } from '../../../api/events.js'

class Confirm extends HTMLElement {
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
        setTimeout(() => {
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
        setTimeout(() => {
            this.remove()
        }, 500)
    }

}

customElements.define('tpen-confirm', Confirm)
