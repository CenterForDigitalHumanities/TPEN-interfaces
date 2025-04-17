import TPEN from "../../api/TPEN.js"

export default class ProjectsListNavigation extends HTMLElement {
    #projects = []

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
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: `Error fetching projects: ${error.message}`,
                        status: error.status
                    }
                })
                TPEN.eventDispatcher.dispatchEvent(toast)
            }
        })
    }
    async connectedCallback() {
        TPEN.attachAuthentication(this)
    }
    set projects(projects) {
        this.#projects = projects
        this.render()
    }
    get projects() {
        return this.#projects
    }
    render() {
        let list = this.shadowRoot.getElementById('projectsListView')
        list.innerHTML = (!this.#projects.length) ? `No projects found`
            : `${this.#projects.reduce((a, project) =>
                a + `<li tpen-project-id=${project._id}>
                        <a href="/project/?projectID=${project._id}" part="project-link">
                            ${project.label ?? project.title}
                        </a>
                    </li>`, ``)
            }`
    }
}

customElements.define('tpen-projects-list-navigation', ProjectsListNavigation)
