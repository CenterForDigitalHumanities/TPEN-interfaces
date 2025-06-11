const CENTRAL = "http://localhost:4001"

class AuthButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        // When the component is added to the DOM, call the render function
        this.render();
    }

    render() {
        // Retrieve the token from the URL to determine login state
        const token = this.getTokenFromURL() || localStorage.getItem('userToken');

        // Render the button with styles and set its label based on the token presence
        this.shadowRoot.innerHTML = `
            <style>
                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    background: #516059;
                    color: #fff;
                    border: none;
                }
                button:hover {
                    background: #667a71;
                }
            </style>
            <button id="auth-btn">${token ? "Logout" : "Login"}</button>
        `;

        // If the token exists (logged in), logout on click; otherwise, login
        const button = this.shadowRoot.querySelector('#auth-btn');
        button.addEventListener('click', () => {
            if (token) {
                this.logout();
            } else {
                this.login();
            }
        });
    }

    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('idToken');
        if (token) {
            localStorage.setItem('userToken', token); // Store token if found
            return token;
        }
        return null;
    }

    // Redirect URL with token in the query parameters
    // Redirect to the URL, which will update the token in the URL
    login() {
        const redirect = location.href;
        window.location.href = `${CENTRAL}/login?returnTo=${encodeURIComponent(redirect)}`;
    }

    // Define the logout URL, which does not include a token, effectively "logging out"
    logout() {
        localStorage.removeItem('userToken'); // Clear token
        const redirect = location.origin + location.pathname;
        window.location.href = `${CENTRAL}/logout?returnTo=${encodeURIComponent(redirect)}`;
    }
}

// Register the custom element with the browser
customElements.define('auth-button', AuthButton);