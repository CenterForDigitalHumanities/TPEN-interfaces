import { CleanupRegistry } from '../../../utilities/CleanupRegistry.js'

/**
 * Toast - A transient notification message that appears briefly.
 * Non-dismissible toasts auto-dismiss after 3 seconds.
 * @element tpen-toast
 */
class Toast extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <output role="status">
            <slot></slot>
            </output>
        `
    }

    /**
     * Cause a toast to appear.
     * Non-dismissible toasts use a timer to be dismissed automatically.
     */
    show() {
        this.classList.add('show')
        if (!this.classList.contains('dismissible')) {
            const dismissTimer = setTimeout(() => {
                this.dismiss()
            }, 3000)
            this.cleanup.add(() => clearTimeout(dismissTimer))
        }
    }

    /**
     * Cause a toast to dissapear with some animation and then be removed from the DOM
     */
    dismiss() {
        this.classList.remove('show')
        const removeTimer = setTimeout(() => {
            this.remove()
        }, 300)
        this.cleanup.add(() => clearTimeout(removeTimer))
    }

    disconnectedCallback() {
        this.cleanup.run()
    }
}

// Guard against duplicate registration when module is loaded via different URL paths
if (!customElements.get('tpen-toast')) {
    customElements.define('tpen-toast', Toast)
}
