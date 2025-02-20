class TpenFooter extends HTMLElement {

    links = [
        { href: '/about', text: 'About Us' },
        { href: '/contact', text: 'Contact' },
        { href: '/privacy', text: 'Privacy Policy' },
        { href: '/terms', text: 'Terms of Service' }
    ]
    
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

        nav.appendChild(ul)
        footerContent.appendChild(p)
        footerContent.appendChild(nav)
        footer.appendChild(footerContent)
        shadow.appendChild(footer)

        const style = document.createElement('style')
        style.textContent = `
            .site-footer {
                /* Add your styles here */
            }
            .footer-content {
                /* Add your styles here */
            }
            .footer-nav ul {
                list-style: none;
                padding: 0;
            }
            .footer-nav li {
                display: inline;
                margin-right: 10px;
            }
            .footer-nav a {
                text-decoration: none;
            }
        `
        shadow.appendChild(style)
    }
}

customElements.define('tpen-footer', TpenFooter)
