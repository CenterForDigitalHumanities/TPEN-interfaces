// custom element named 'tpen-user'

import '../api/user.mjs'
class TpenUser extends HTMLElement {
    static observedAttributes = ['user-id, user-agent']
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.user = new User()
    }

    connectedCallback() {
        if (TPEN_USER?.authentication) {
            this.user.authentication = TPEN_USER.authentication
        }
        this.user.fetchUserData().then(() => {
            this.render()
        })
        this.addEventListener('tpen-authenticated', () => {
            this.user.authentication = TPEN_USER.authentication
        })
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'user-id' || 'user-agent') {
            this.user = new User(newValue)
        }
    }

    render() {
        const template = document.createElement('template')
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    border: 1px solid #000;
                    padding: 10px;
                    margin: 10px;
                }
            </style>
            <h2>User Card</h2>
            <p>User ID: ${this.user.id}</p>
            <p>User Agent: ${this.user.agent}</p>
            <p>User Authentication: ${this.user.authentication} (should be private)</p>
            <p>User Name: ${this.user.name}</p>
            <p>User Email: ${this.user.email}</p>
            <pre>${this.user}</pre>
        `
        this.shadowRoot.appendChild(template.content.cloneNode(true))
    }
}

