import TPEN from "../../api/TPEN.js"

export default class ProjectsView extends HTMLElement {

    #projects = []

    get projects() {
        return this.#projects
    }

    set projects(projects) {
        this.#projects = projects
        this.render()
    }

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        const style = document.createElement('style')
        style.textContent = `
            li {
                margin: 5px 0px;
                display: flex;
                gap: 10px;
            }
        `
        const projectList = document.createElement('ol')
        projectList.id = 'projectsListView'
        this.shadowRoot.prepend(style, projectList)
        TPEN.eventDispatcher.on("tpen-authenticated", async (ev) => {
            try {
                this.projects = await TPEN.getUserProjects(ev.detail)
            } catch (error) {
                // Toast error message
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: `Error fetching projects: ${error.message}`,
                        status: error.status
                    }
                })
                TPEN.eventDispatcher.dispatch(toast)
            }
        })
    }

    async connectedCallback() {
        TPEN.attachAuthentication(this)

    }

    render() {
        let list = this.shadowRoot.getElementById('projectsListView')
        list.innerHTML = (!this.#projects.length) ? `No projects found` : `
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
