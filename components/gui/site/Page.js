import './Header.js'
import './NoAuthHeader.js'
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

        const stylesheet = document.createElement('link')
        stylesheet.rel = 'stylesheet'
        stylesheet.href = `${window.location.origin}/components/gui/site/page-layouts.css`

        const header = this.hasAttribute('no-auth')
            ? document.createElement('tpen-no-auth-header')
            : document.createElement('tpen-header')
        if (this.title) header.setAttribute('title', this.title)

        const pageContent = document.createElement('div')
        pageContent.className = 'page-content'
        pageContent.style.cssText = 'padding: 1em; margin: 0 auto; min-height: 40vh;'
        pageContent.appendChild(document.createElement('slot'))

        const footer = document.createElement('tpen-footer')

        shadow.append(stylesheet, header, pageContent, footer)
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
