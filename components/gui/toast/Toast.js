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

    show() {
        this.classList.add('show')
        setTimeout(() => {
            this.classList.remove('show')
            setTimeout(() => {
                this.remove()
            }, 300)
        }, 3000)
    }

    drop() {
        this.closest(".toast-screen-lock").style.display = "grid"
        setTimeout(() => {
            this.closest(".toast-screen-lock").style.height = "100vh"
            this.classList.add('show')
            document.querySelector("body").style.overflow = "hidden"
        }, 1)
        
    }

    lift() {
        this.classList.remove('show')
        this.closest(".toast-screen-lock").style.height = "0vh"
        document.querySelector("body").style.overflow = "auto"
        setTimeout(() => {
            this.closest(".toast-screen-lock").style.display = "none"
            this.remove()
        }, 500)   
    }

    /**
     * Make this act like the javascript confirm().
     * Needs a backdrop to take over the screen until a choice is made.
     */
    showConfirm() {
        this.classList.add('show')
        return true
    }

    /**
     * Make this act like the javascript alert().
     * Needs a backdrop to take over the screen until a user clicks ok.
     */
    showAlert() {
        this.classList.add('show')
        return true
    }

    /**
     * Make this act like the standard show() without disappearing.  Only disappear when clicked.
     * Only disappear when clicked.  Keep in toast stack.
     */
    showDismissible() {
        this.classList.add('show')
        return true
    }

}

customElements.define('tpen-toast', Toast)
