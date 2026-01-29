import { eventDispatcher } from '../../../api/events.js'
import { CleanupRegistry } from '../../../utilities/CleanupRegistry.js'

/**
 * Alert - A modal alert dialog that requires user acknowledgement.
 * Takes over the screen until dismissed.
 * @element tpen-alert
 */
class Alert extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

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
        const showTimer = setTimeout(() => {
            this.closest(".alert-area").classList.add("show")
            this.classList.add('show')
            document.querySelector("body").style.overflow = "hidden"
        }, 1)
        this.cleanup.add(() => clearTimeout(showTimer))
        eventDispatcher.dispatch("tpen-alert-activated")
    }

    /**
     * Make the backdrop for screen takeover as well as the alert dialogue disappear with a lift up effect.
     * Used after a user clicks the button in the alert.
     */
    dismiss() {
        this.classList.remove('show')
        this.closest(".alert-area")?.classList.remove("show")
        document.querySelector("body").style.overflow = "auto"
        const removeTimer = setTimeout(() => {
            this.remove()
        }, 500)
        this.cleanup.add(() => clearTimeout(removeTimer))
        eventDispatcher.dispatch("tpen-alert-acknowledged")
    }

    disconnectedCallback() {
        this.cleanup.run()
    }
}

customElements.define('tpen-alert', Alert)
