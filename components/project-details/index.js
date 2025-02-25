import TPEN from "../../api/TPEN.mjs"
import Project from "../../api/Project.mjs"

class ProjectDetails extends HTMLElement {

    style = `
    dl.project-desc {
        color          : var(--dark);
        width          : 100%;
        border-bottom  : 1px solid var(--primary-color);
        }
        
        dl.project-desc dt {
            display        : inline-block;
            width          : 40%;
            font-weight    : bold;
            text-align     : right;
            }
            
            dl.project-desc dd {
                display        : inline-block;
                width          : 40%;
                font-weight    : normal;
                text-align     : left;
    }

    .manuscripts {
        display        : flex;
        justify-content: space-evenly;
        align-items    : center;
        margin         : 0 auto;

    }

    .manuscripts img {
        width          : 45%;
        height         : 150px;
        border-radius  : 5px;
        box-shadow     : 0 2px 5px rgba(0, 0, 0, 0.1);
        object-fit     : cover;
        display        : flex;
        justify-content: center;
        align-items    : center;
        margin         : 0 auto;
        padding        : 10px;
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

    render() {
        const project = this.Project ?? TPEN.activeProject
        const projectOwner = Object.entries(project.collaborators).find(([userID, u]) => u.roles.includes('OWNER'))?.[1].profile.displayName
        const collaboratorCount = Object.keys(project.collaborators).length

        TPEN.screen.title = project.label ?? project.title ?? project.name
        const banner = document.querySelector('tpen-page')
        if(banner) banner.setAttribute('title', TPEN.screen.title)

        this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <dl class="project-desc">
                <dt>Project ID</dt>
                <dd>${TPEN.screen.projectInQuery}</dd>
                <dt>Project Title</dt>
                <dd>${TPEN.screen.title}</dd>
                <dt>Project Owner</dt>
                <dd>${projectOwner}</dd>
                <dt>Project Collaborator Count</dt>
                <dd>${collaboratorCount}</dd>
            </dl>
            <div class="manuscripts">
                <img part="manuscript-img" src="../../assets/images/manuscript_img.webp" />
                <img part="manuscript-img" src="../../assets/images/manuscript.webp" />
            </div>
        `
    }
}

customElements.define('tpen-project-details', ProjectDetails)
