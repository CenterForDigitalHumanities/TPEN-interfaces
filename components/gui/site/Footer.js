import TPEN from '../../../api/TPEN.mjs'

class TpenFooter extends HTMLElement {

    links = [
        { href: '/home', text: 'Home' },
        { href: '/account', text: 'Account' },
        { href: '/contact', text: 'Contact' },
        { href: '/about', text: 'About Us' },
    ]

    version =  TPEN?.version ?? '3.0.1a'
    
    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })

        const linkElem = document.createElement('link');
        linkElem.setAttribute('rel', 'stylesheet');
        linkElem.setAttribute('href', './index.css');
        shadow.appendChild(linkElem);

        const footer = document.createElement('footer')
        footer.className = 'site-footer'

        const footerContent = document.createElement('div')
        footerContent.className = 'footer-content'

        const p = document.createElement('p')
        p.innerHTML = `&copy; ${new Date().getFullYear()} TPEN. All rights reserved.`

        const nav = document.createElement('nav')
        nav.className = 'footer-nav'

        const ul = document.createElement('ul')

        this.links.forEach(link => {
            const li = document.createElement('li')
            const a = document.createElement('a')
            a.href = link.href
            a.textContent = link.text
            li.appendChild(a)
            ul.appendChild(li)
        })

        const logo = document.createElement('img')
        logo.src = '../../../assets/logo/logo-100h.png'
        logo.alt = 'TPEN Logo'

        const nehLogo = document.createElement('img')
        nehLogo.src = '../../../assets/logo/NEH.jpg'
        nehLogo.alt = 'NEH Logo'

        nav.appendChild(ul)
        footerContent.appendChild(nav)
        footerContent.appendChild(logo)
        footerContent.appendChild(nehLogo)
        footerContent.appendChild(p)
        footer.appendChild(footerContent)
        shadow.appendChild(footer)

        const style = document.createElement('style')
        style.textContent = `
            .site-footer {
                width: 100%;
                border-top: 1px solid var(--primary-color);
                margin-top: 20px;
                padding-top: 1em;
            }
            .footer-content {
                display: flex;
                align-items: center;
                justify-content: space-evenly;
            }
            .footer-nav ul {
                list-style: none;
                padding: 0;
                display: flex;
                flex-direction: column;
            }
            .footer-nav li {
                display: inline;
                margin-right: 10px;
            }
            .footer-nav a {
                text-decoration: none;
            }
            img {
                mix-blend-mode: multiply;
                height: 100px;
            }
        `
        shadow.appendChild(style)
    }
}

customElements.define('tpen-footer', TpenFooter)
