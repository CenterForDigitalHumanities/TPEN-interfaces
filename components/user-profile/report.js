import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'
import Project from '../../api/Project.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * ReportStats - Displays summary statistics about user's projects.
 * @element report-stats
 */
class ReportStats extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-user-loaded', async ev => {
            await this.render(await TPEN.getUserProjects(TPEN.getAuthorization()))
        })
        TPEN.attachAuthentication(this)
    }

    disconnectedCallback() {
        this.cleanup.run()
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

        let totalContributions = 0

        for (const project of projects) {
            const projectData = await new Project(project._id).fetch()
            totalContributions += projectData.layers?.length || 0
            projectData.layers?.forEach(layer => {
                totalContributions += layer.pages?.length || 0
                layer.pages?.forEach(page => {
                    totalContributions += page.items?.length || 0
                })
            })
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                }

                .report {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid var(--gray);
                    background-color: var(--white);
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }

                .stats-title {
                    margin-top: 0;
                    font-size: 1.2rem;
                    border-bottom: 1px solid #e1e4e8;
                    padding-bottom: 8px;
                    color: var(--accent);
                }

                .report p {
                    margin: 5px 0;
                    color: #555;
                    font-size: 15px;
                }

                .report span {
                    font-weight: bold;
                }
            </style>
            <div class="report">
                <h2 class="stats-title">Report</h2>
                <p>Number of Projects: <span>${projects.length}</span></p>
                <p>Number of Collaborators: <span>${uniqueCollaborators.size}</span></p>
                <p>Total Contributions: <span>${totalContributions}</span></p>
            </div>
        `
    }
}

customElements.define('report-stats', ReportStats)