import '../../../components/feedback-button/index.js'

class TpenFooter extends HTMLElement {

    links = [
        { href: '/index', text: 'Home' },
        { href: '/account', text: 'Account' },
        { href: '/contact', text: 'Contact' },
        { href: '/about', text: 'About Us' },
    ]

    version = '3.0.1a'
    
    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })

        const footer = document.createElement('footer')
        footer.className = 'site-footer'

        const footerContent = document.createElement('div')
        footerContent.className = 'footer-content'

        const p = document.createElement('p')
        p.innerHTML = `&copy; ${new Date().getFullYear()} TPEN. Licensed under <a href="/LICENSE" target="_blank">Apache 2.0</a>.`

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
                flex-wrap: wrap;
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
            p a {
                color: var(--primary-color);
                text-decoration: underline;
            }
            img {
                mix-blend-mode: multiply;
                height: 100px;
            }

            img:last-of-type {
                transition: all 3s;
                opacity: 1;
                clip-path: polygon(50% 0%, 100% 0, 100% 37%, 100% 83%, 100% 100%, 81% 100%, 0 100%, 0 92%, 0 35%, 0 0);
            }
            img:last-of-type:hover {
                opacity: 0.5;
                clip-path: polygon(54% 51%, 23% 1%, 100% 16%, 68% 57%, 100% 100%, 51% 59%, 76% 99%, 13% 100%, 29% 78%, 18% 64%);
            }
        `
        shadow.appendChild(style)
        shadow.appendChild(document.createElement('tpen-feedback-button'))
    }
}

customElements.define('tpen-footer', TpenFooter)
