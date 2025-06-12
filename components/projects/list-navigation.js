import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../../utilities/checkPermissions.js"
import Project from "../../api/Project.js"

export default class ProjectsListNavigation extends HTMLElement {
    #projects = []

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        const style = document.createElement('style')
        style.textContent = `
            li {
                margin: 0px;
                padding: 5px;
                display: flex;
                gap: 10px;
                background-color: var(--light-gray);
                transition: background-color 0.2s ease-in-out;
            }
            li:nth-child(odd) {
                background-color: var(--white);
            }
            li:hover {
                background-color: var(--primary-light);
            }
            ol {
                list-style: none;
                padding: 0;
                margin: 0;
                max-height: 20em;
            }
            ol.unbounded {
                max-height: none;
            }
            a[part="project-link"] {
                text-decoration: none;
                color: var(--tpen-color-primary);
                font-weight: 600;
                display: block;
                width: 100%;
            }
            a[part="project-opt"] {
                position: relative;
                display: inline-block;
                margin-left: 0.75em;
                text-decoration: none;
                color: var(--accent);
                font-weight: 600;
                top: -1px;
            }
            a:hover {
                text-decoration: none;
            }
            li.placeholder {
                background-color: var(--light-gray);
                color: var(--dark-gray);
                border-radius: 5px;
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0% {
                    background-color: var(--light-gray);
                }
                50% {
                    background-color: var(--white);
                }
                100% {
                    background-color: var(--light-gray);
                }
            }
        `
        const projectList = document.createElement('ol')
        if (this.classList.contains('unbounded')) {
            projectList.classList.add('unbounded')
        }
        projectList.id = 'projectsListView'
        const placeholderItem = document.createElement('li')
        placeholderItem.classList.add('placeholder')
        placeholderItem.setAttribute('aria-hidden', 'true')
        placeholderItem.setAttribute('role', 'presentation')
        placeholderItem.setAttribute('tabindex', '-1')
        placeholderItem.innerHTML = `<a href="#">Loading...</a>`
        projectList.append(...Array.from({ length: 5 }, () => placeholderItem.cloneNode(true)))
        this.shadowRoot.prepend(style, projectList)

        TPEN.eventDispatcher.on("tpen-authenticated", async (ev) => {
            try {
                this.projects = await TPEN.getUserProjects(ev.detail)
            } catch (error) {
                const status = error.status ?? 500
                const text = error.statusText ?? error.message ?? "Internal Error"
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: `Error fetching projects: ${text}`,
                        status: status
                    }
                })
                TPEN.eventDispatcher.dispatchEvent(toast)
                this.shadowRoot.getElementById('projectsListView').innerHTML = `No projects found`
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
    async render() {
        let list = this.shadowRoot.getElementById('projectsListView')
        if (!this.#projects?.length) {
            list.innerHTML = `No projects found`
            return
        }
        list.innerHTML = ""
        for (const project of this.#projects) {
            await(new Project(project._id).fetch())
            const isManageProjectPermission = await CheckPermissions.checkEditAccess('PROJECT')
            let manageLink = isManageProjectPermission ? `<a title="Manage Project" part="project-opt" href="/project/manage?projectID=${project._id}">⚙</a>` : ``
            list.innerHTML += `
                <li tpen-project-id="${project._id}"">
                    <a title="See Project Details" class="static" href="/project?projectID=${project._id}" part="project-link">
                        ${project.label ?? project.title}
                    </a>
                    ${manageLink}
                </li>
            `
        }
    }
}

customElements.define('tpen-projects-list-navigation', ProjectsListNavigation)
