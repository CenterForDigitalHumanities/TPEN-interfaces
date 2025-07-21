import TPEN from '../../api/TPEN.js'

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
        }).then(response => response.json())
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

                a:hover {
                    transform: translateY(-2px);
                    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.2);
                }

                a:active {
                    transform: translateY(1px);
                    box-shadow: 1px 1px 6px rgba(0, 0, 0, 0.15);
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
            ${  (response.status 
                ? ((await this.checkUrlExists(url) && response.message !== 'Manifest found, Recently Committed') 
                    ? `<a href="${url}" target="_blank">
                        ${url}
                        </a>` 
                    : ((response.message === 'Manifest found, Recently Committed') 
                        ? `<p class="success">Successfully Exporting Project Manifest... Please Wait</p>` 
                        : `<p class="error">Manifest Not Found</p>`))
                : `<p class="success">Successfully Exporting Project Manifest... Please Wait</p>`)
            }`
    }

    async checkUrlExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' })
            return response.ok
        } catch (error) {
            return false
        }
    }
})         
