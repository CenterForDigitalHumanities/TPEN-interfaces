class ProfileInfo extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                /* Add styles for the profile info */
                .profile {
                    text-align: right;
                    padding: 10px;
                }
            </style>
            <div class="profile">
                <p>User Name: John Doe</p>
                <p>Email: john.doe@example.com</p>
            </div>
        `
    }
}

customElements.define('profile-info', ProfileInfo) 