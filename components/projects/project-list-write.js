import TPEN from "../../api/TPEN.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

const eventDispatcher = TPEN.eventDispatcher

/**
 * ProjectsManager - Manages user's projects with delete functionality.
 * @element tpen-projects-manager
 */
export default class ProjectsManager extends HTMLElement {
    #projects = [];

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({mode:"open"})
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.cleanup.onEvent(eventDispatcher, "tpen-user-loaded", ev => this.currentUser = ev.detail)
        this.initialize()
    }

    /**
     * Initializes the component by loading projects if user is authenticated.
     */
    async initialize() {
        if (this.currentUser && this.currentUser._id) {
            try {
                await this.getProjects()
                this.render()
            } catch (error) {
                console.error("Error fetching projects:", error)
                this.innerHTML = "Failed to load projects."
            }
        } else {
            this.innerHTML = "No user logged in yet."
        }
    }

    disconnectedCallback() {
        this.cleanup.run()
    }

    render() {
        if (!TPEN.currentUser._id) return

        this.shadowRoot.innerHTML = `
            <style>
                li {
                    margin: 5px 0px;
                    display: flex;
                    gap:10px;
                    width:40%;
                    justify-content:space-between;
                }
                .delete-btn {
                    background-color: red;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    border-radius: 4px;
                    margin-left: 10px;
                }
                .delete-btn:hover {
                    background-color: darkred;
                }
            </style>
            <ul>
                ${this.#projects.reduce((a, project) =>
            a + `<li tpen-project-id="${project._id}">
                        <div>
                            <a href="/manage/?projectID=${project._id}">${project.title ?? project.label}</a>
                            <span class="badge">${project.roles.join(", ").toLowerCase()}</span>
                        </div>
                        <button class="delete-btn" data-project-id=${project._id}>Delete</button>
                    </li>`, ``)}
            </ul>
        `

        this.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener("click", (event) => {
                const projectId = event.target.getAttribute("data-project-id")
                alert(`Delete not implemented for project ID: ${projectId}`)
            })
        })
    }

    async getProjects() {
        return TPEN.currentUser.getProjects()
            .then(({ projects, metrics }) => {
                // metrics are available here if you want to use them
                this.#projects = projects
                return projects
            })
    }

    get currentUser() {
        return TPEN.currentUser
    }

    set currentUser(user) {
        if (TPEN.currentUser?._id !== user._id) {
            TPEN.currentUser = user
        }
        TPEN.currentUser.getProjects().then(({ projects, metrics }) => {
            // metrics are available here if you want to use them
            this.projects = projects
            this.render()
        })
        return this
    }

    get projects() {
        return this.#projects
    }

    set projects(projects) {
        this.#projects = projects
        return this
    }
}

customElements.define('tpen-projects-manager', ProjectsManager)
