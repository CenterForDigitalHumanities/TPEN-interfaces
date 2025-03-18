import User from "../../api/User.js"
import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

export default class ProjectsManager extends HTMLElement {
    #projects = [];

    constructor() {
        super()
        this.attachShadow({mode:"open"})
        eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
    }

    async connectedCallback() {
        TPEN.attachAuthentication(this)
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
            .then((projects) => {
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
        TPEN.currentUser.getProjects().then((projects) => {
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
