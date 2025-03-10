import TPEN from "../../api/TPEN.mjs"

export default class ProjectsView extends HTMLElement {
    
    #projects

    constructor() {
        super()
        this.attachShadow({mode:"open"})
        const style = document.createElement('style')
        style.textContent = `
            li {
                margin: 5px 0px;
                display: flex;
                gap: 10px;
            }
        `
        this.shadowRoot.appendChild(style)
        TPEN.eventDispatcher.on("tpen-authenticated", async ev => {
            this.#projects ??= await TPEN.getUserProjects(ev.detail)
            this.render()
        })
    }

    async connectedCallback() {
        TPEN.attachAuthentication(this)

    }

    render() {
        if (!this.#projects?.length) return

        this.shadowRoot.innerHTML = `
            <ol part="project-list-ol">
                ${this.#projects.reduce((a, project) =>
            a + `<li tpen-project-id=${project._id}>
                        ${project.title ?? project.label}  
                        <span class="badge">(${project.roles.join(", ").toLowerCase()})</span>
                    </li>`, ``)}
            </ul>
        `
    }

}

customElements.define('tpen-projects-view', ProjectsView)
