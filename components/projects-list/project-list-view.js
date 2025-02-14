import User from "../../api/User.mjs"
import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

export default class ProjectsView extends HTMLElement {
    #projects = [];

    constructor() {
        super()
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

        this.innerHTML = `
            <style>
                li {
                    margin: 5px 0px;
                    display: flex;
                }
            </style>
            <ul>
                ${this.#projects.reduce((a, project) =>
            a + `<li tpen-project-id="${project._id}">
                        ${project.title ?? project.label} 
                        <span class="badge">${project.roles.join(", ").toLowerCase()}</span>
                    </li>`, ``)}

                         ${this.#projects.reduce((a, project) =>
            a + `<li tpen-project-id="${project._id}">
                        ${project.title ?? project.label} 
                        <span class="badge">${project.roles.join(", ").toLowerCase()}</span>
                    </li>`, ``)}
            </ul>
        `
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

customElements.define('tpen-projects-view', ProjectsView)
