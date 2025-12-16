import TPEN from "../../api/TPEN.js"
import Project from "../../api/Project.js"
import "../../components/line-image/index.js"
import CheckPermissions from "../../utilities/checkPermissions.js"

class ProjectDetails extends HTMLElement {

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

    `

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        TPEN.eventDispatcher.on('tpen-project-loaded', this.render.bind(this))
        TPEN.eventDispatcher.on('tpen-project-load-failed', (err) => {
            this.shadowRoot.innerHTML = `
                <style>${this.style}</style>
                <h3>Project not found</h3>
                <p>The project you are looking for does not exist or you do not have access to it.</p>
            `
            const toast = {
                message: `Project failed to load: ${err.message}`,
                status: "error"
              }
            TPEN.eventDispatcher.dispatch('tpen-toast',toast)
        })
    }

    static get observedAttributes() {
        return ['tpen-project-id']
    }

    async attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-project-id' && oldValue !== newValue) {
            if(newValue === null) return
            this.Project = (newValue === TPEN.activeProject._id) 
                ? TPEN.activeProject 
                : await(new Project(newValue).fetch())
            this.render()
        }
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
    }

    async render() {
        const project = this.Project ?? TPEN.activeProject
        const projectOwner = Object.entries(project.collaborators).find(([userID, u]) => u.roles.includes('OWNER'))?.[1].profile.displayName
        const collaboratorCount = Object.keys(project.collaborators).length

        TPEN.screen.title = project.label ?? project.title ?? project.name
        const isManagePage = window.location.pathname.includes('/project/manage')
        const displayTitle = isManagePage ? `Manage Project "${TPEN.screen.title}"` : TPEN.screen.title
        TPEN.eventDispatcher.dispatch('tpen-gui-title', displayTitle)
        const isReadAccess = await CheckPermissions.checkViewAccess('PROJECT')
        const isProjectEditor = await CheckPermissions.checkEditAccess('PROJECT', 'METADATA')
        const editTitle = isProjectEditor ? `<a id="edit-project-title" href="#">✏️</a>` : ``
        
        isReadAccess ? 
        (this.shadowRoot.innerHTML = `
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
            <sequence-panel manifest-id="${project.manifest}"></sequence-panel>
        `) : (this.shadowRoot.innerHTML = `
            <p class="permission-msg">You don't have permission to view the Project Details</p>
        `)
        if(!isProjectEditor) return
        this.shadowRoot.getElementById('edit-project-title').addEventListener('click', (e) => {
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
