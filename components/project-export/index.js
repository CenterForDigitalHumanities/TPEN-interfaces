import TPEN from '../../api/TPEN.js'
import { checkIfUrlExists } from '../../utilities/checkIfUrlExists.js'

customElements.define('tpen-project-export', class extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on('tpen-project-loaded', () => this.render())
    }
    
    async render() {
        const url = `https://dev.static.t-pen.org/${TPEN.activeProject._id}/manifest.json`
        const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/deploymentStatus`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            }
        })
        .then(async (response) => {
            if(response.ok) return response.json()
            const errStatus = await response.json()
            return errStatus
        })
        this.shadowRoot.innerHTML = `
            <style>
                a, .success {
                    display: inline-block;
                    padding: 10px 20px;
                    color: var(--primary-color);
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
                    margin: 0;
                }

                .error {
                    display: inline-block;
                    padding: 10px 20px;
                    color: #007bff;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
                    color: red;
                    margin: 0;
                }
            </style>
        `
        if(response.status === -1) {
            this.shadowRoot.innerHTML += `
                <p class="error">Server or Service Error</p>
            `
            console.error(response.message)
            return
        }
        if ([1, 2, 3, 4, 6].includes(response.status)) {
            if (await checkIfUrlExists(url) && response.status !== 2) {
                this.shadowRoot.innerHTML += `
                    <a href="${url}" target="_blank">
                        ${url}
                    </a>
                `
            }
            else {
                if (response.status === 2) {
                    this.shadowRoot.innerHTML += `
                        <p class="success">Successfully Exporting Project Manifest... Please Wait</p>
                    `
                } else {
                    this.shadowRoot.innerHTML += `
                        <p class="error">Manifest Not Found</p>
                    `
                }
            }
        } else {
            this.shadowRoot.innerHTML += `
                <p class="success">Successfully Exporting Project Manifest... Please Wait</p>
            `
        }
    }
})         
