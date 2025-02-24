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
}

customElements.define('tpen-toast', Toast)
