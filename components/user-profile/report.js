import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class ReportStats extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.eventDispatcher.on('tpen-user-loaded', async ev => {
            await this.render(await TPEN.getUserProjects(TPEN.getAuthorization()))
        })
        TPEN.attachAuthentication(this)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-user-id') {
            if (oldValue !== newValue) {
                const currVal = this?.user?._id
                if (newValue === currVal) return
                const loadedUser = new User(newValue)
                loadedUser.authentication = TPEN.getAuthorization()
                loadedUser.getProfile()
            }
        }
    }

    async render(projects) {
        const uniqueCollaborators = new Set()
        projects.forEach(project => {
            if (project.collaborators) {
                Object.keys(project.collaborators).forEach(collaborator => {
                    if (collaborator !== TPEN.currentUser?._id) uniqueCollaborators.add(collaborator)
                })
            }
        })

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    margin: 0;
                    padding: 0;
                    color: var(--accent);
                    font-family: 'Inter', sans-serif;
                }

                .stats-title {
                    padding: 0;
                    margin: 0;
                    font-size: 1.2rem;
                }

                .report {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid var(--gray);
                    background-color: var(--white);
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    margin-bottom: 20px;
                }

                .report h2 {
                    margin: 0 0 10px;
                    font-size: 1.2rem;
                }

                .report p {
                    margin: 5px 0;
                    font-size: 1rem;
                    color: #555;
                }
            </style>
            <div class="report">
                <h2 class="stats-title">Report...</h2>
                <p>Number of Projects: ${projects.length}</p>
                <p>Number of Collaborators: ${uniqueCollaborators.size}</p>
            </div>
        `
    }
}

customElements.define('report-stats', ReportStats)