import TPEN from '../../api/TPEN.js'
import Project from '../../api/Project.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'
import { onUserReady } from '../../utilities/userReady.js'
import { onUserProjectsReady } from '../../utilities/userProjectsReady.js'

/**
 * ReportStats - Displays summary statistics about user's projects.
 * @element report-stats
 */
class ReportStats extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for user ready listener */
    _unsubUser = null
    /** @type {Function|null} Unsubscribe function for projects ready listener */
    _unsubProjects = null
    /** @type {Object|null} Cached profile data */
    _profile = null
    /** @type {Array|null} Cached projects data */
    _projects = null
    /** @type {boolean} Flag to prevent double rendering */
    _isRendering = false

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubUser = onUserReady(this, (user) => {
            this._profile = user
            this.renderIfReady()
        })
        this._unsubProjects = onUserProjectsReady(this, (projects) => {
            this._projects = projects
            this.renderIfReady()
        })
    }

    /**
     * Renders only when both profile and projects are available.
     * Guards against double rendering when both callbacks fire quickly.
     */
    renderIfReady() {
        if (this._profile && this._projects && !this._isRendering) {
            this._isRendering = true
            this.loadAndRender()
                .finally(() => { this._isRendering = false })
        }
    }

    /**
     * Calculates statistics from cached projects and renders the report.
     */
    async loadAndRender() {
        const projects = this._projects

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

        this.render(projects.length, uniqueCollaborators.size, totalContributions)
    }

    disconnectedCallback() {
        try { this._unsubUser?.() } catch {}
        try { this._unsubProjects?.() } catch {}
        this.cleanup.run()
    }

    /**
     * Renders the report with pre-calculated statistics.
     * @param {number} projectCount - Number of projects
     * @param {number} collaboratorCount - Number of unique collaborators
     * @param {number} totalContributions - Total contribution count
     */
    render(projectCount, collaboratorCount, totalContributions) {
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
                <p>Number of Projects: <span>${projectCount}</span></p>
                <p>Number of Collaborators: <span>${collaboratorCount}</span></p>
                <p>Total Contributions: <span>${totalContributions}</span></p>
            </div>
        `
    }
}

customElements.define('report-stats', ReportStats)