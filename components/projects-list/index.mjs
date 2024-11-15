import User from "../../User/index.mjs"
import TPEN from "../../TPEN/index.mjs"
import { eventDispatcher } from "../../TPEN/events.mjs"

export default class ProjectsList extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }

    #projects = []
    #TPEN = new TPEN()

    constructor() {
        super()
        eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
    }

    async connectedCallback() {
        TPEN.attachAuthentication(this)
        if (this.currentUser._id) {
            return this.getProjects().then(() => this.render())
        }
        this.innerHTML = "No user logged in yet"
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-user-id') {
            if (oldValue !== newValue) {
                const loadedUser = new User(newValue)
                loadedUser.authentication = TPEN.getAuthorization()
                loadedUser.getProfile()
            }
        }
    }

    render() {
        if(!this.#TPEN.currentUser._id) return

        this.innerHTML = `<ul>${this.#projects.reduce((a, project) => 
            a + `<li tpen-project-id="${project._id}">${project.title}
            <span class="badge">${project.roles.join(", ").toLowerCase()}</span>
              </li>`, 
        ``)}</ul>`
    }

    async getProjects() {
        return this.#TPEN.currentUser.getProjects()
            .then((projects) => {
                this.#projects = projects
                return projects
            })
    }

    get currentUser() {
        return this.#TPEN.currentUser
    }

    set currentUser(user) {
        if(this.#TPEN.currentUser?._id !== user._id) {
            this.#TPEN.currentUser = user
        }
        this.#TPEN.currentUser.getProjects().then((projects) => {
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

customElements.define('tpen-projects-list', ProjectsList)
