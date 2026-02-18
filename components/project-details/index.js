import TPEN from "../../api/TPEN.js"
import Project from "../../api/Project.js"
import "../../components/line-image/index.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from "../../utilities/CleanupRegistry.js"

/**
 * ProjectDetails - Displays project title, owner, collaborator count, and thumbnail.
 * Requires PROJECT view access.
 * @element tpen-project-details
 */
class ProjectDetails extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null
    /** @type {string|null} Track manifest key to prevent duplicate renders */
    _currentManifestKey = null

    style = `
    sequence-panel {
        display: block;
        margin: 0;
        height: 10em;
        width: 100%;
        overflow: hidden;
    }
    h3 {
        color: var(--primary-color);
        font-style: italic;
        margin: 0;
    }
    small {
        color: var(--gray);
        text-align: right;
        display: block;
    }
    .project-title-input-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 0.5em;
        margin-bottom: 0.5em;
    }
    .project-title-input {
        width: 100%;
        padding: 0.5em;
        font-size: 1em;
    }
    .save-project-title {
        padding: 0.5em;
        background-color: var(--primary-color);
        color: white;
        border-radius: 0.25em;
        cursor: pointer;
        border: 1px solid var(--primary-color);
    }
    .hidden {
        display: none;
    }
    #edit-project-title {
        background: none;
        border: none;
        cursor: pointer;
        font-size: inherit;
        padding: 0;
    }

    `

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    static get observedAttributes() {
        return ['tpen-project-id']
    }

    async attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-project-id' && oldValue !== newValue) {
            if (newValue === null) return
            this.Project = (newValue === TPEN.activeProject?._id)
                ? TPEN.activeProject
                : await (new Project(newValue).fetch())
            this.render()
        }
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-project-load-failed', (err) => {
            this.shadowRoot.innerHTML = `
                <style>${this.style}</style>
                <h3>Project not found</h3>
                <p>The project you are looking for does not exist or you do not have access to it.</p>
            `
            TPEN.eventDispatcher.dispatch('tpen-toast', {
                message: `Project failed to load: ${err.message}`,
                status: "error"
            })
        })
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Shows permission message if user lacks PROJECT view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess('PROJECT', '*')) {
            this.shadowRoot.innerHTML = `
                <style>${this.style}</style>
                <p class="permission-msg">You don't have permission to view the Project Details</p>
            `
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.renderCleanup.run()
        this.cleanup.run()
        this._currentManifestKey = null
    }

    render() {
        const project = this.Project ?? TPEN.activeProject

        if (!project) {
            console.error('No project data available to render')
            return
        }

        const manifestKey = JSON.stringify(project?.manifest ?? [])
        const manifestId = Array.isArray(project?.manifest) ? project.manifest[0] : project?.manifest

        // Only render if manifest has changed or first render
        if (this._currentManifestKey === manifestKey) {
            return
        }
        this._currentManifestKey = manifestKey
        
        const projectOwner = Object.entries(project.collaborators).find(([userID, u]) => u.roles.includes('OWNER'))?.[1].profile.displayName
        const collaboratorCount = Object.keys(project.collaborators).length

        TPEN.screen.title = project.label ?? project.title ?? project.name
        const isManagePage = window.location.pathname === '/project/manage' || window.location.pathname.startsWith('/project/manage/')
        const displayTitle = isManagePage ? `Manage Project "${TPEN.screen.title}"` : TPEN.screen.title
        TPEN.eventDispatcher.dispatch('tpen-gui-title', displayTitle)
        const isProjectEditor = CheckPermissions.checkEditAccess('PROJECT', 'METADATA')
        const editTitle = isProjectEditor ? `<button type="button" id="edit-project-title" title="Edit Title">✏️</button>` : ``

        this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <div class="project-title-input-container">
                <h3 class="project-title">${TPEN.screen.title}</h3>
                ${editTitle}
            </div>
            <small>${TPEN.screen.projectInQuery}</small>
            <p>${projectOwner}, Owner</p>
            <p>
                ${collaboratorCount < 3 ? "Collaborators: "+Object.entries(project.collaborators).map(([userID, u]) => u.profile.displayName).join(', ') : `${collaboratorCount} collaborator${collaboratorCount===1? '' : 's'}`}
            </p>
            ${manifestId ? `<sequence-panel manifest-id="${manifestId}"></sequence-panel>` : ''}
        `
        // Clear previous render-specific listeners before adding new ones
        this.renderCleanup.run()

        if (!isProjectEditor) return
        this.renderCleanup.onElement(this.shadowRoot.getElementById('edit-project-title'), 'click', (e) => {
            const screenTitle = this.shadowRoot.querySelector('.project-title')
            const editButton = this.shadowRoot.getElementById('edit-project-title')
            screenTitle.classList.add('hidden')
            editButton.classList.add('hidden')

            const inputDiv = document.createElement('div')
            inputDiv.classList.add('project-title-input-container')
            const input = document.createElement('input')
            input.type = 'text'
            input.value = TPEN.screen.title
            input.classList.add('project-title-input')
            const saveButton = document.createElement('button')
            saveButton.textContent = 'Save'
            saveButton.classList.add('save-project-title')
            inputDiv.appendChild(input)
            inputDiv.appendChild(saveButton)
            this.shadowRoot.querySelector('small').insertAdjacentElement('beforebegin', inputDiv)

            // Save button listener - element is removed after use, so no cleanup needed
            saveButton.addEventListener('click', async () => {
                const response = await fetch(`${TPEN.servicesURL}/project/${project._id}/label`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${TPEN.getAuthorization()}`
                    },
                    body: JSON.stringify({ label: input.value })
                })

                if (response.ok) {
                    screenTitle.textContent = input.value
                    TPEN.screen.title = input.value
                    TPEN.eventDispatcher.dispatch('tpen-toast', { message: "Project title updated successfully", status: "success" })
                } else {
                    TPEN.eventDispatcher.dispatch('tpen-toast', { message: "Failed to update project title", status: "error" })
                }
                screenTitle.classList.remove('hidden')
                editButton.classList.remove('hidden')
                inputDiv.remove()
            })
        })
    }
}

customElements.define('tpen-project-details', ProjectDetails)
