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
        const url = `${TPEN.staticURL}/${TPEN.activeProject._id}/manifest.json`
        const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/deploymentStatus`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            }
        })
            .then(async (response) => {
                if (response.ok) return response.json()
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
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
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
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    color: red;
                    margin: 0;
                }

                a.iiif-drag-drop {
                    padding: 0;
                    margin-left: 10px;
                    margin-right: -10px;
                    width: 30px;
                    background-color: transparent;
                    box-shadow: none;
                    vertical-align: middle;
                }
                
                a.iiif-drag-drop img {
                    width: 100%;
                }
            </style>
        `
        let html = ''
        switch (response) {
            case -1:
                html += `<p class="error">Server or Service Error</p>`
                console.error(response.message)
                break
            case 1:
                // This case indicates that there is no manifest
                html += `<p class="error">Manifest Not Found</p>`
                break
            case 2:
            // This case indicates that the manifest is being generated and is recently committed
            case 5:
            // This case indicates that the manifest is being generated and the deployment is in progress
            case 8:
            // This case indicates that the deployment is unknown
            case 9:
                // This case indicates that the deployment is not found
                html += `<p class="success">Successfully Exporting Project Manifest... Please Wait</p>`
                break
            case 3:
            // This case indicates that the manifest is being generated and is not recently committed
            case 6:
            // This case indicates that the deployment is inactive
            case 7:
                // This case indicates that the deployment is failed
                if (await checkIfUrlExists(url) && response.status !== 2) {
                    html += `<a href="${url}" target="_blank">${url}</a>`
                    html += `<a class="iiif-drag-drop" href="${url}?manifest=${url}" target="_blank"><img src="https://iiif.io/img/logo-iiif-34x30.png" alt="IIIF Drag and Drop" title="Drag and Drop IIIF Resource"></a>`
                } else {
                    html += `<p class="error">Manifest Not Found</p>`
                }
                break
            case 4:
                // This case indicates that the manifest is being generated successfully
                html += `<a href="${url}" target="_blank">${url}</a>`
                html += `<a class="iiif-drag-drop" href="${url}?manifest=${url}" target="_blank"><img src="https://iiif.io/img/logo-iiif-34x30.png" alt="IIIF Drag and Drop" title="Drag and Drop IIIF Resource"></a>`
                break
            default:
                html += `<p class="error">Unknown Status</p>`
                break
        }
        this.shadowRoot.innerHTML += html
    }
})         
