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
        TPEN.attachAuthentication(this);
        if (this.currentUser && this.currentUser._id) {
            try {
                await this.getProjects();
                this.render();
            } catch (error) {
                console.error("Error fetching projects:", error);
                this.innerHTML = "Failed to load projects.";
            }
        } else {
            this.innerHTML = "No user logged in yet";
        }
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
        if (!this.currentUser || !this.projects) {
            this.innerHTML = "No user or projects available";
            return;
        }
    
        this.renderProjectsList();
    }
    
    renderProjectsList() {
        this.innerHTML = `
            <h2>Welcome, ${this.currentUser.name}</h2>
            <ul>
                ${this.projects.map(project => `
                    <li data-id="${project._id}" class="project-item">
                        <strong>${project.title}</strong> (${project.roles.join(", ")})
                        <button class="details-button">Details</button>
                    </li>
                `).join("")}
            </ul>
        `;
    
        this.attachDetailsListeners();
    }
    
    attachDetailsListeners() {
        this.querySelectorAll('.details-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const projectId = event.target.closest('li').getAttribute('data-id');
                this.loadContributors(projectId);
            });
        });
    }
    

    async loadContributors(projectId) {
        try {
            const contributors = await this.fetchContributors(projectId);
            const contributorsList = document.getElementById('contributorsList');
            if (!contributorsList) {
                console.error("Contributors list element not found");
                return;
            }
            contributorsList.innerHTML = contributors.map(contributor => `
                <li>
                    <strong>${contributor.name}</strong>
                    <p>Email: ${contributor.email}</p>
                    <p>Role: ${contributor.role}</p>
                    <button onclick="managePermissions('${contributor.id}')">Manage Permissions</button>
                </li>
            `).join("");
        } catch (error) {
            console.error(`Error fetching contributors for project ${projectId}:`, error);
        }
    }

    async getProjects() {
        return this.#TPEN.currentUser.getProjects()
            .then(async (projects) => {
                // Fetch contributors for each project
                const projectsWithContributors = await Promise.all(
                    projects.map(async (project) => {
                        const contributors = await this.fetchContributors(project._id); // Fetch contributors
                        return { ...project, contributors }; // Add contributors to project object
                    })
                );
                this.projects = projectsWithContributors;
                return projectsWithContributors;
            });
    }
    
    async fetchContributors(projectId) {
        const token = TPEN.getAuthorization();
        const url = `${this.#TPEN.servicesURL}/project/${projectId}/contributors`;
        console.log(`Fetching contributors from: ${url}`);
    
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    
        if (!response.ok) {
            console.error(`Failed to fetch contributors: ${response.statusText}`);
            throw new Error(`Failed to fetch contributors for project ${projectId}`);
        }
    
        const data = await response.json();
        console.log(`Fetched contributors for project ${projectId}:`, data);
        return data;
    }
    

    get currentUser() {
        return this.#TPEN.currentUser || {};
    }
    
    set currentUser(user) {
        if (!user || this.#TPEN.currentUser?._id === user._id) {
            return;
        }
        this.#TPEN.currentUser = user;
    
        this.#TPEN.currentUser.getProjects()
            .then((projects) => {
                this.projects = projects;
                this.render();
            })
            .catch(error => {
                console.error("Error fetching projects for current user:", error);
            });
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
