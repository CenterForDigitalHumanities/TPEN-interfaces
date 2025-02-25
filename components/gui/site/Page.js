import './Header.js'
import './Footer.js'

class TpenPageTemplate extends HTMLElement {

    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })
        const style = document.createElement('style')
        style.textContent = `
            tpen-page {
                margin-top: 2.5em !important;
                display: block;
            }
        `

        shadow.innerHTML = `
        <link rel="stylesheet" href="${window.location.origin + '/components/gui/site/page-layouts.css'}">
        <tpen-header title="${this.title}"></tpen-header> 
        <div class="page-content" style="padding: 1em; margin: 0 auto; min-height: 40vh;">
            <slot></slot>
        </div>
        <tpen-footer></tpen-footer>
        `
        this.prepend(style)
    }
    connectedCallback() {
        const pageHead = document.getElementsByTagName('head')[0]
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = `${window.location.origin + '/components/gui/site/index.css'}`
        pageHead.prepend(link)
    }
}

customElements.define('tpen-page', TpenPageTemplate)
