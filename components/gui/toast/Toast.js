/**
 * Toast - A transient notification message that appears briefly.
 * Non-dismissible toasts auto-dismiss after 3 seconds.
 * @element tpen-toast
 */
class Toast extends HTMLElement {
    /** @type {number|null} Timer ID for auto-dismiss */
    _dismissTimer = null
    /** @type {number|null} Timer ID for removal animation */
    _removeTimer = null

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
            this._dismissTimer = setTimeout(() => {
                this.dismiss()
            }, 3000)
        }
    }

    /**
     * Cause a toast to dissapear with some animation and then be removed from the DOM
     */
    dismiss() {
        this.classList.remove('show')
        this._removeTimer = setTimeout(() => {
            this.remove()
        }, 300)
    }

    disconnectedCallback() {
        if (this._dismissTimer) clearTimeout(this._dismissTimer)
        if (this._removeTimer) clearTimeout(this._removeTimer)
    }
}

customElements.define('tpen-toast', Toast)
