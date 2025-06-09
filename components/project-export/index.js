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
        this.shadowRoot.innerHTML = `
            <style>
                a {
                    display: inline-block;
                    padding: 10px 20px;
                    color: #007bff;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 6px;
                    font-size: 13px;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
                }

                a:hover {
                    transform: translateY(-2px);
                    box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.2);
                }

                a:active {
                    transform: translateY(1px);
                    box-shadow: 1px 1px 6px rgba(0, 0, 0, 0.15);
                }

                p {
                    font-size: 16px;
                    color: red;
                    font-weight: bold;
                    margin-top: 12px;
                }
            </style>

            ${ await this.checkUrlExists(url) ?
                `<a href="${url}" target="_blank">
                    ${url}
                </a>`
                :
                `<p>Manifest Not Found</p>`
            }
        `
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
