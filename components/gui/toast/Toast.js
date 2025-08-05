class Toast extends HTMLElement {
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
     * Cause a toast to appear.  Non-dismissible toasts use a timer to disappear automatically.
     */
    show() {
        this.classList.add('show')
        if (!this.classList.contains('dismissible')) {
            setTimeout(() => {
                this.classList.remove('show')
                setTimeout(() => {
                    this.remove()
                }, 300)
            }, 3000)
        }
    }

    /**
     * Cause a toast to dissapear upon clicking it
     */
    dismiss() {
        this.classList.remove('show')
        setTimeout(() => {
            this.remove()
        }, 300)
    }

}

customElements.define('tpen-toast', Toast)
