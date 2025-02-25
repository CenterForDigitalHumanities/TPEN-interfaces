import TPEN from "../../api/TPEN.mjs"
import Project from "../../api/Project.mjs"
import "../../components/line-image/index.js"

class ProjectDetails extends HTMLElement {

    style = `
    sequence-panel {
        display: block;
        margin: 0;
        height: 10em;
        overflow: visible;
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
        TPEN.eventDispatcher.on('tpen-project-loaded', () => this.render())
    }

    async render() {
        const project = this.Project ?? TPEN.activeProject
        const projectOwner = Object.entries(project.collaborators).find(([userID, u]) => u.roles.includes('OWNER'))?.[1].profile.displayName
        const collaboratorCount = Object.keys(project.collaborators).length

        TPEN.screen.title = project.label ?? project.title ?? project.name
        TPEN.eventDispatcher.dispatchEvent(new CustomEvent('tpen-gui-title', { detail: TPEN.screen.title }))

        this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <h3>${TPEN.screen.title}</h3>
            <small>${TPEN.screen.projectInQuery}</small>
            <p>${projectOwner}, Owner</p>
            <p>${collaboratorCount} collaborator${collaboratorCount===1? '' : 's'}</p>
            <sequence-panel manifest-id="${project.manifest}" preset="responsive"></sequence-panel>
        `
    }
}

customElements.define('tpen-project-details', ProjectDetails)
