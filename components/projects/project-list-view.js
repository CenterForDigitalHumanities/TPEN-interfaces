import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

export default class ProjectsView extends HTMLElement {
    
    #projects = [];

    constructor() {
        super()
        this.attachShadow({mode:"open"})
        eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
    }

    static get observedAttributes() {
        return ['tpen-user-id']
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

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-user-id') {
            if (oldValue !== newValue) {
                const loadedUser = new User(newValue)
                loadedUser.authentication = TPEN.getAuthorization()
                loadedUser.getProfile()
            } else if (name === 'show-metadata' || name === 'manage') {
                this.render()
            }
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
                }
            </style>
            <ol part="project-list-ol">
                ${this.#projects.reduce((a, project) =>
            a + `<li tpen-project-id=${project._id}>
                        ${project.title ?? project.label}  
                        <span class="badge">(${project.roles.join(", ").toLowerCase()})</span>
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
