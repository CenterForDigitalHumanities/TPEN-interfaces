import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import Project from "../../api/Project.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * ProjectsListNavigation - Displays a navigable list of user's projects.
 * @element tpen-projects-list-navigation
 */
export default class ProjectsListNavigation extends HTMLElement {
    #projects = []

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

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
            .welcome-message {
                padding: 1em;
                line-height: 1.6;
            }
            .welcome-message p {
                margin-bottom: 1em;
            }
            .welcome-list {
                list-style: none;
                padding-left: 0;
                margin-bottom: 1em;
            }
            .welcome-list li {
                margin-bottom: 0.5em;
                background-color: transparent;
            }
            .welcome-list li:hover {
                background-color: transparent;
            }
            .welcome-list a {
                color: var(--tpen-color-primary);
                text-decoration: none;
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
        placeholderItem.innerHTML = `<span>Loading...</span>`
        projectList.append(...Array.from({ length: 5 }, () => placeholderItem.cloneNode(true)))
        this.shadowRoot.prepend(style, projectList)
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)

        this.cleanup.onEvent(TPEN.eventDispatcher, "tpen-authenticated", async (ev) => {
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
                TPEN.eventDispatcher.dispatch(toast)
                this.shadowRoot.getElementById('projectsListView').innerHTML = `No projects found`
            }
        })

        // Handle empty recent activity signal from other components via central dispatcher
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-no-recent-activity', () => {
            // Show the welcome/empty state message
            this.projects = []
        })
    }

    disconnectedCallback() {
        this.cleanup.run()
    }
    set projects(projects) {
        this.#projects = projects
        this.updateList()
    }
    get projects() {
        return this.#projects
    }

    /**
     * Updates the project list in the DOM. Handles async permission checks.
     */
    async updateList() {
        const root = this.shadowRoot
        let list = root.getElementById('projectsListView')
        if (!this.#projects?.length) {
            const welcome = document.createElement('section')
            welcome.className = 'welcome-message'
            welcome.innerHTML = `
                    <p><strong>Welcome to TPEN!</strong></p>
                    <p>Get started by creating your first project or importing a manuscript.</p>
                    <ul class="welcome-list">
                        <li aria-label="View Tutorials"><span aria-hidden="true">📚</span> <a href="https://three.t-pen.org/category/tutorials/" target="_blank" rel="noopener noreferrer">View Tutorials</a></li>
                        <li aria-label="Frequently Asked Questions"><span aria-hidden="true">❓</span> <a href="https://three.t-pen.org/faq/" target="_blank" rel="noopener noreferrer">Frequently Asked Questions</a></li>
                        <li aria-label="Find IIIF Resources"><span aria-hidden="true">🖼️</span> <a href="https://iiif.io/guides/finding_resources/" target="_blank" rel="noopener noreferrer">Find IIIF Resources</a></li>
                    </ul>
            `
            if (list) list.replaceWith(welcome)
            else {
                const existingWelcome = root.querySelector('section.welcome-message')
                if (existingWelcome) existingWelcome.replaceWith(welcome)
                else root.appendChild(welcome)
            }
            return
        }
        // Ensure the list element exists when we have projects
        if (!list) {
            list = document.createElement('ol')
            list.id = 'projectsListView'
            if (this.classList.contains('unbounded')) list.classList.add('unbounded')
            const existingWelcome = root.querySelector('section.welcome-message')
            if (existingWelcome) existingWelcome.replaceWith(list)
            else root.appendChild(list)
        } else {
            list.innerHTML = ""
        }
        for (const project of this.#projects) {
            let manageLink = ``
            try {
                await(new Project(project._id).fetch())
                const isManageProjectPermission = CheckPermissions.checkEditAccess('PROJECT')
                manageLink = isManageProjectPermission ? `<a title="Manage Project" part="project-opt" href="/project/manage?projectID=${project._id}">⚙</a>` : ``
            } catch (error) {
                console.warn(`Failed to check permissions for project ${project._id}:`, error)
            }
            list.innerHTML += `
                <li tpen-project-id="${project._id}">
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
