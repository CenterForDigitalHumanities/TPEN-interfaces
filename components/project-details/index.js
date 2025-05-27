import TPEN from "../../api/TPEN.js"
import Project from "../../api/Project.js"
import "../../components/line-image/index.js"

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
        margin-block-end: 0;
    }
    small {
        color: var(--gray);
        text-align: right;
        display: block;
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
            TPEN.eventDispatcher.dispatchEvent(new CustomEvent('tpen-gui-action', { detail:
                { 
                    label: "Resume",
                    callback: () => location.href = `/transcribe?projectID=${this.Project._id}`
                }
             }))
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
        TPEN.eventDispatcher.dispatch('tpen-gui-title', TPEN.screen.title)

        this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <h3>${TPEN.screen.title}</h3>
            <small>${TPEN.screen.projectInQuery}</small>
            <p>${projectOwner}, Owner</p>
            <p>
                ${collaboratorCount < 3 ? "Collaborators: "+Object.entries(project.collaborators).map(([userID, u]) => u.profile.displayName).join(', ') : `${collaboratorCount} collaborator${collaboratorCount===1? '' : 's'}`}
            </p>
            <sequence-panel manifest-id="${project.manifest}"></sequence-panel>
        `
    }
}

customElements.define('tpen-project-details', ProjectDetails)
