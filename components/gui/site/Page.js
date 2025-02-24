import './Header.js'
import './Footer.js'

class TpenPageTemplate extends HTMLElement {
    
    title = this.getAttribute('title')

    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })
        const style = document.createElement('style')
        style.textContent = `
            tpen-page {
                margin-top: 3.5em;
                display: block;
            }
        `
        this.prepend(style)

        shadow.innerHTML = `
            <tpen-header title="${this.title ?? document.title}"></tpen-header> 
            <div class="page-content" style="padding: 1em; margin: 0 auto; min-height: 40vh;">
                <slot></slot>
            </div>
            <tpen-footer></tpen-footer>
        `
    }
    connectedCallback() {
        const pageHead = document.getElementsByTagName('head')[0]
        const script = document.createElement('script')
        script.src = 'index.js'
        pageHead.appendChild(script)
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = `${window.location.pathname.replace(/\/[^\/]*$/, '/') + 'index.css'}`
        pageHead.prepend(link)
        document.title = this.title
    }
}

customElements.define('tpen-page', TpenPageTemplate)
