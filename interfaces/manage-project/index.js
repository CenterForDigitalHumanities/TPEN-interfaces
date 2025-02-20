import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

class ManageProjectContainer extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        eventDispatcher.on('tpen-project-loaded', () => this.render())
        this.addEventListener()
        TPEN.attachAuthentication(this)
    }

    addEventListener() {
        document.getElementById('manage-collaboration-btn').addEventListener('click', () => {
            const URLParams = new URLSearchParams(window.location.search)
            const projectID = URLParams.get("projectID")
            const url = `/interfaces/collaborators.html?projectID=${projectID}`
            window.location.href = url
        })

        document.getElementById("update-metadata-btn").addEventListener('click', () => {  
            window.location.href = `/components/update-metadata/index.html?projectID=${TPEN.activeProject._id}`
        })
    }

    render() {
        this.shadowRoot.innerHTML = `
        <div part="header" class="header">
            <img part="logo" class="logo" src="https://t-pen.org/TPEN/images/tpen_badgeEmergeClear.png" alt="TPEN Logo">
            <h1 part="project-title" class="project-title"></h1> 
            <button part="resume-btn" class="resume-btn">Resume</button>
        </div>
        `
        this.projectHeader()
    }

    projectHeader() {
        if (!TPEN.activeProject) {
            return projectInfo.innerHTML = "No project"
        }
        const projectTitle = this.shadowRoot.querySelector('.project-title')
        projectTitle.innerHTML = TPEN.activeProject.label
    }
}

customElements.define('manage-project-container', ManageProjectContainer)

document?.body.firstElementChild.prepend(new ManageProjectContainer())
