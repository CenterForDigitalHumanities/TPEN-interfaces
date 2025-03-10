import TPEN from "../../api/TPEN.mjs"
export default class ProjectsList extends HTMLElement {
    static get observedAttributes() {
        return ['show-metadata']
    }

    #projects = []

    constructor() {
        super()
        TPEN.eventDispatcher.on("tpen-user-loaded", render)
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
            this.innerHTML = "No user logged in yet"
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
        if (!TPEN.currentUser._id) {
            return
        }

        const isManage = this.hasAttribute('manage') && this.getAttribute('manage') !== 'false'
        this.innerHTML = `

        <style>
        li{
        margin:5px 0px;
        display:flex; 
        gap:10px
        
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
        
        <ul>${this.#projects.reduce((a, project) =>
            a + `<li tpen-project-id="${project._id}">
            <div>
                    ${isManage ? `<a href="/manage/?projectID=${project._id}">${project.title ?? project.label}</a>` : project.title ?? project.label}
                    <span class="badge">${project.roles.join(", ").toLowerCase()}</span>
            </div>
                    ${isManage ? `<button class="delete-btn" data-project-id=${project._id}>Delete</button>` : ''}
               </li>`,
            ``)}</ul>`

        this.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener("click", (event) => {
                const projectId = event.target.getAttribute("data-project-id")
                alert(`Delete not implemented for project ID: ${projectId}`)
            })
        })
    }

    attachDetailsListeners() {
        this.querySelectorAll('.details-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const projectId = event.target.closest('li').getAttribute('data-id')
                this.loadContributors(projectId)
            })
        })
    }


    async loadContributors(projectId) {
        try {
            const contributors = TPEN.activeProject.collaborators
            const contributorsList = document.getElementById('contributorsList')
            if (!contributorsList) {
                console.error("Contributors list element not found")
                return
            }
            contributorsList.innerHTML = contributors.map(contributor => `
                <li>
                    <strong>${contributor.name}</strong>
                    <p>Email: ${contributor.email}</p>
                    <p>Role: ${contributor.role}</p>
                    <button onclick="managePermissions('${contributor.id}')">Manage Permissions</button>
                </li>
            `).join("")
        } catch (error) {
            console.error(`Error fetching contributors for project ${projectId}:`, error)
        }
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

customElements.define('tpen-projects-list', ProjectsList)
