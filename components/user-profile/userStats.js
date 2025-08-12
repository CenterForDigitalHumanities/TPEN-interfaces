import TPEN from '../../api/TPEN.js'

class UserStats extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.render()
    }

    async render() {
        this.shadowRoot.innerHTML = `
            <style>
                .stats {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid var(--gray);
                    background-color: var(--white);
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
            </style>
            <div class="stats">
                <h2>User Statistics</h2>
                <p>Current User: 'Not logged in'</p>
                <p>Active Project: 'None'</p>
            </div>
        `
    }
}

customElements.define('user-stats', UserStats)