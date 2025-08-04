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
     * Make a typical notification toast visible with a timer to disappear automatically.
     */
    show() {
        this.classList.add('show')
        setTimeout(() => {
            this.classList.remove('show')
            setTimeout(() => {
                this.remove()
            }, 300)
        }, 3000)
    }

    /**
     * Call forth a toast without making it disappear automatically.
     */
    call() {
        this.classList.add('show')
    }

    /**
     * Cause a dismissible toast to dissapear upon clicking it
     */
    dismiss() {
        this.classList.remove('show')
        setTimeout(() => {
            this.remove()
        }, 300)
    }

    /**
     * Make the backdrop for screen takeover as well as the dialogue toast visible with a drop down effect.
     * Used with confirm and alert toasts.
     */
    drop() {
        this.closest(".toast-screen-lock").style.display = "grid"
        setTimeout(() => {
            this.closest(".toast-screen-lock").classList.add("show")
            this.classList.add('show')
            document.querySelector("body").style.overflow = "hidden"
        }, 1)
        
    }

    /**
     * Make the backdrop for screen takeover as well as the dialogue toast disappear with a lift up effect.
     * Used after a user clicks an option on a confirm or alert toast
     */
    lift() {
        this.classList.remove('show')
        this.closest(".toast-screen-lock").classList.remove("show")
        document.querySelector("body").style.overflow = "auto"
        setTimeout(() => {
            this.remove()
        }, 500)   
    }

}

customElements.define('tpen-toast', Toast)
