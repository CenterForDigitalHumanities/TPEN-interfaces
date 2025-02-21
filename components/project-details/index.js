import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

class ProjectDetails extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    static get observedAttributes() {
        return ['tpen-user-id']
    }

    connectedCallback() {
        eventDispatcher.on('tpen-project-loaded', () => this.render())
        TPEN.attachAuthentication(this)
    }

    render() {
        this.shadowRoot.innerHTML = `
            <div part="project-card" class="project-card"></div>
        `
        this.renderProjectDetails()
    }

    renderProjectDetails() {
        const projectInfo = this.shadowRoot.querySelector('.project-card')
        const userId = this.getAttribute('tpen-user-id')
        const projectOwner = TPEN.activeProject.collaborators[userId].profile.displayName
        const collaboratorCount = Object.keys(TPEN.activeProject.collaborators).length

        projectInfo.innerHTML = `
            <div part="project-card-headings" class="project-card-headings">
                <p part="project-desc">
                    <span>Project ID</span>
                    <span part="project-desc-span">${TPEN.activeProject._id}</span>
                </p>
                <p part="project-desc">
                    <span>Project Title</span> 
                    <span part="project-desc-span">${TPEN.activeProject.label}</span>
                </p>
                <p part="project-desc">
                    <span>Project Owner</span>  
                    <span part="project-desc-span">${projectOwner}</span>
                </p>
                <p part="project-desc">
                    <span>Project Collaborator Count</span>  
                    <span part="project-desc-span">${collaboratorCount}</span>
                </p>
            </div>
            <div part="manuscripts" class="manuscripts">
                <img part="manuscript-img" src="../../assets/images/manuscript_img.webp" />
                <img part="manuscript-img" src="../../assets/images/manuscript.webp" />
            </div>
        `
    }
}

customElements.define('tpen-project-details', ProjectDetails)