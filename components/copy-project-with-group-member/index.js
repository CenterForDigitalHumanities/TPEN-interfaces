import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'
import { getUserFromToken } from "../iiif-tools/index.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * CopyProjectWithGroupMember - Allows users to copy a project with group members.
 * @element tpen-copy-project-with-group-member
 */
class CopyProjectWithGroupMember extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.load()
    }

    disconnectedCallback() {
        this.renderCleanup.run()
        this.cleanup.run()
    }

    async load() {
        const token = TPEN.getAuthorization()
        const userObj = new User(getUserFromToken(token))
        const { projects } = await userObj.getProjects()
        this.render(token, userObj, projects)
    }

    render(token, userObj, projects) {
        if (!projects || projects.length === 0) {
            this.shadowRoot.innerHTML = `<p>No projects available to copy.</p>`
            return
        }
        projects.sort((a, b) => a.label.localeCompare(b.label))
        this.shadowRoot.innerHTML = `
            <style>
                label {
                    display: block;
                    margin-bottom: 10px;
                    font-size: 1rem;
                }

                h3 {
                    padding: 10px 0;
                    font-size: 1.5rem;
                }

                .project-select {
                    width: 100%;
                    max-width: 400px;
                    padding: 10px;
                    font-size: 1rem;
                    margin-bottom: 10px;
                    display: block;
                }
                
                .copy-project-btn {
                    width: 100%;
                    border: 1px solid black;
                    max-width: 400px;
                    padding: 10px;
                    font-size: 1rem;
                    cursor: pointer;
                    border-radius: 5px;
                }

                .copy-project-btn:hover {
                    background-color: rgba(0, 123, 255, 0.1);
                }

                .message {
                    margin-top: 10px;
                    font-size: 1rem;
                    color: #333;
                }

                .hidden {
                    display: none;
                }
                
                .project-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f9f9f9;
                    border: 1px solid #ddd;
                    padding: 10px;
                    margin-top: 10px;
                    border-radius: 5px;
                    max-width: 400px;
                }

                .project-info span {
                    font-weight: bold;
                }

                .manage-btn {
                    background: #007bff;
                    color: #fff;
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    border-radius: 5px;
                }

                .manage-btn:hover {
                    background: #0056b3;
                }
            </style>
            <h3>Copy Existing Project With Group Member</h3>
            <label for="project-select">Select a Project :</label>
            <select class="project-select" id="project-select">
                <option value="none">Select a Project to Copy</option>
                ${projects.map(project => `<option value="${project._id}">${project.label} - ${project._id}</option>`).join('')}
            </select>
            <button class="copy-project-btn" id="copy-project-btn">Copy Project</button>
            <p class="message" id="message"></p>
            <div id="project-info-container"></div>
        `

        // Clear previous render-specific listeners
        this.renderCleanup.run()

        this.renderCleanup.onElement(this.shadowRoot.getElementById('copy-project-btn'), 'click', async () => {
            const projectSelect = this.shadowRoot.getElementById('project-select')
            const selectedProjectId = projectSelect.value
            if (selectedProjectId === 'none') {
                this.shadowRoot.getElementById('message').textContent = 'Please select a project to copy.'
                return
            }

            this.shadowRoot.getElementById('message').textContent = 'Copying project... Please wait.'
            this.shadowRoot.getElementById('copy-project-btn').disabled = true

            await fetch(`${TPEN.servicesURL}/project/${selectedProjectId}/copy-with-group`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TPEN.getAuthorization()}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Failed to copy project')
                }
                return response.json()
            }).then(data => {
                this.shadowRoot.getElementById('message').textContent = `Project copied successfully`
                const projectInfoContainer = this.shadowRoot.getElementById('project-info-container')
                const projectInfo = document.createElement('div')
                projectInfo.className = 'project-info'

                    const projectTitle = document.createElement('span')
                    projectTitle.textContent = data.label

                    const manageButton = document.createElement('a')
                    manageButton.className = 'manage-btn'
                    manageButton.textContent = 'Manage'
                    manageButton.href = `${TPEN.BASEURL}/project/manage?projectID=${data._id}`

                    projectInfo.appendChild(projectTitle)
                    projectInfo.appendChild(manageButton)
                    projectInfoContainer.appendChild(projectInfo)
            }).catch(error => {
                this.shadowRoot.getElementById('message').textContent = `Error copying project: ${error.message}`
            })
        })
    }
}

customElements.define('tpen-copy-project-with-group-member', CopyProjectWithGroupMember)