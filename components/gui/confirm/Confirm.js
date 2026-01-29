import { eventDispatcher } from '../../../api/events.js'
import { CleanupRegistry } from '../../../utilities/CleanupRegistry.js'

/**
 * Confirm - A modal confirmation dialog with positive/negative options.
 * Takes over the screen until user makes a choice.
 * @element tpen-confirm
 */
class Confirm extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

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
        const showTimer = setTimeout(() => {
            this.closest(".confirm-area").classList.add("show")
            this.classList.add('show')
            document.querySelector("body").style.overflow = "hidden"
        }, 1)
        this.cleanup.add(() => clearTimeout(showTimer))
        eventDispatcher.dispatch("tpen-confirm-activated")
    }

    /**
     * Make the backdrop for screen takeover as well as the alert dialogue disappear with a lift up effect.
     * Used after a user clicks the button in the alert.
     */
    dismiss() {
        this.classList.remove('show')
        this.closest(".confirm-area")?.classList.remove("show")
        document.querySelector("body").style.overflow = "auto"
        const removeTimer = setTimeout(() => {
            this.remove()
        }, 500)
        this.cleanup.add(() => clearTimeout(removeTimer))
    }

    disconnectedCallback() {
        this.cleanup.run()
    }
}

customElements.define('tpen-confirm', Confirm)
