import Project from '../../api/Project.js'
import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'
import { getUserFromToken } from "../iiif-tools/index.js"

class CopyExistingProjectWithCustomizations extends HTMLElement {
    #modules = {
        "Metadata": true,
        "Group Members": true,
        "Hotkeys": true,
        "Tools": true,
        "Layers": true
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        TPEN.attachAuthentication(this)
    }

    connectedCallback() {
        this.load()
    }

    async load() {
        const token = TPEN.getAuthorization()
        const userObj = new User(getUserFromToken(token))
        const { projects } = await userObj.getProjects()
        this.render(token, userObj, projects)
    }
    
    render(token, userObj, projects) {
        const modules = this.#modules
        const layersSelect = []
        const groupMembersSelect = []

        if (!projects || projects.length === 0) {
            this.shadowRoot.innerHTML = `<p>No projects available to copy.</p>`
            return
        }
        projects.sort((a, b) => a.label.localeCompare(b.label))
        this.shadowRoot.innerHTML = `
            <style>
                .project-select-label {
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
                    margin-top: 10px;
                }

                .copy-project-btn:hover {
                    background-color: rgba(0, 123, 255, 0.1);
                }

                .message {
                    margin-top: 10px;
                    font-size: 1rem;
                }

                .btn {
                    padding: 12px 24px;
                    font-size: 15px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .secondary-btn {
                    background-color: #f0f0f0;
                    color: #333;
                    border: 1px solid #ccc;
                }

                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 30px;
                }

                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0;
                    right: 0; bottom: 0;
                    background-color: #ccc;
                    transition: 0.4s;
                    border-radius: 34px;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 22px; 
                    width: 22px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: 0.4s;
                    border-radius: 50%;
                }

                input:checked + .slider {
                    background-color: #4cd964;
                }

                input:checked + .slider:before {
                    transform: translateX(20px);
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
                }

                .project-customizations {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }

                .project-customization {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    width: 100%;
                    align-items: center;
                    padding: 5px 0;
                }

                .customization-item, .group-item, .layer-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    padding: 5px;
                    border-radius: 5px;
                    font-size: 0.9rem;
                }

                .customization-label {
                    font-weight: bold;
                }

                .group-members-list, .layers-list {
                    list-style: none;
                    padding: 10px 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    background: #f0f0f0;
                    gap: 5px;
                    width: 100%;
                    border-radius: 5px;
                }

                .group-members-list li, .layers-list li {
                    padding: 0px 20px;
                    border-radius: 5px;
                    font-size: 0.9rem;
                }

                .group-actions, .layer-actions {
                    display: flex;
                    gap: 10px;
                }

                .invite-btn, .remove-btn, .add-with-annotations-btn, .add-without-annotations-btn, .delete-layer-btn {
                    padding: 8px 15px;
                    font-size: 0.9rem;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    background-color: #007bff;
                    color: white;
                }

                .group-label, .layer-label {
                    font-weight: 400;
                }

                .success-message {
                    color: green;
                    background-color: #e6ffe6;
                    padding: 10px;
                    border: 1px solid #c3e6c3;
                    border-radius: 5px;
                    margin: 0 auto;
                    text-align: center;
                    width: 100%;
                }

                .disabled-container {
                    pointer-events: none;
                    user-select: none;
                    opacity: 0.5;
                }

                .project-info-div {
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

                .project-info-div span {
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

                .hidden {
                    display: none;
                }
            </style>
            <h3>Copy Existing Project With Customizations</h3>
            <label class="project-select-label" for="project-select">Select a Project :</label>
            <select class="project-select" id="project-select">
                <option value="none">Select a Project to Copy</option>
                ${projects.map(project => `<option value="${project._id}">${project.label} - ${project._id}</option>`).join('')}
            </select>
            <section class="project-info hidden" id="project-info">
                <ul class="project-customizations">
                    ${Object.keys(modules).map(module => `
                    <li class="project-customization" index="${module}">
                        <div class="customization-item">
                            <span class="customization-label">${module}</span>
                            <label class="switch">
                                <input type="checkbox" class="toggleSwitch" id="${module}" ${modules[module] ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </li>
                    `).join('')}
                </ul>
            </section>
            <button class="copy-project-btn hidden" id="copy-project-btn">Copy Project</button>
            <p class="message" id="message"></p>
            <div id="project-info-container"></div>
        `

        this.shadowRoot.getElementById('project-select').addEventListener('change', async (event) => {
            const projectSelect = event.target.value
            this.shadowRoot.getElementById('project-select').disabled = true
            this.shadowRoot.getElementById('copy-project-btn').classList.remove('hidden')
            this.shadowRoot.getElementById('project-info').classList.remove('hidden')
            const project = await new Project(projectSelect).fetch()
            const groupMembersList = Object.entries(project.collaborators).filter(([key]) => key !== userObj._id)
            .map(([key, member]) => ({ id: key, name: member.profile.displayName }))
            const layersList = project.layers.map(layer => ({ label: layer.label, id: layer.id }))

            this.shadowRoot.querySelectorAll(".project-customization").forEach(customization => {
                const index = customization.getAttribute("index")
                if (index === "Layers") {
                    const layersListGroup = document.createElement('ul')
                    layersListGroup.classList.add('layers-list')
                    layersList.forEach(layer => {
                        const layerItem = document.createElement('li')
                        layerItem.innerHTML = `
                        <div class="layer-item">
                            <span class="layer-label">${layer.label}</span>
                            <div class="layer-actions">
                                <button class="add-with-annotations-btn" data-layer="${layer.id}">Add Layer With Annotations</button>
                                <button class="add-without-annotations-btn" data-layer="${layer.id}">Add Layer Without Annotations</button>
                                <button class="delete-layer-btn" data-layer="${layer.id}">Delete Layer</button>
                            </div>
                        </div>`
                        layersListGroup.appendChild(layerItem)
                        const addWithAnnotationsBtn = layerItem.querySelector('.add-with-annotations-btn')
                        const addWithoutAnnotationsBtn = layerItem.querySelector('.add-without-annotations-btn')
                        const deleteLayerBtn = layerItem.querySelector('.delete-layer-btn')
                        addWithAnnotationsBtn.addEventListener('click', () => {
                            const layerName = addWithAnnotationsBtn.getAttribute('data-layer')
                            const success = document.createElement('p')
                            success.className = 'success-message'
                            success.textContent = `Adding layer with annotations`
                            layerItem.querySelector('.layer-actions').appendChild(success)
                            addWithAnnotationsBtn.remove()
                            addWithoutAnnotationsBtn.remove()
                            deleteLayerBtn.remove()
                            layersSelect.push({[layerName]: { withAnnotations: true }})
                        })
                        addWithoutAnnotationsBtn.addEventListener('click', () => {
                            const layerName = addWithoutAnnotationsBtn.getAttribute('data-layer')
                            const success = document.createElement('p')
                            success.className = 'success-message'
                            success.textContent = `Adding layer without annotations`
                            layerItem.querySelector('.layer-actions').appendChild(success)
                            addWithAnnotationsBtn.remove()
                            addWithoutAnnotationsBtn.remove()
                            deleteLayerBtn.remove()
                            layersSelect.push({[layerName]: { withAnnotations: false }})
                        })
                        deleteLayerBtn.addEventListener('click', () => {
                            if (layersList.length === 1) {
                                this.shadowRoot.getElementById("Layers").checked = false
                                this.shadowRoot.querySelector(".project-customization[index='Layers'] .layers-list").remove()
                            }
                            layerItem.remove()
                            layersList.splice(layersList.indexOf(layer), 1)
                        })
                    })
                    customization.appendChild(layersListGroup)
                }

                if (index === "Group Members" && groupMembersList.length > 0) {
                    const groupMembersListGroup = document.createElement('ul')
                    groupMembersListGroup.classList.add('group-members-list')
                    groupMembersList.forEach(member => {
                        const memberItem = document.createElement('li')
                        memberItem.innerHTML = `
                        <div class="group-item">
                            <span class="group-label">${member.name[0].toUpperCase() + member.name.slice(1)}</span>
                            <div class="group-actions">
                                <button class="invite-btn" data-member="${member.id}" data-member-name="${member.name}">Invite</button>
                                <button class="remove-btn" data-member="${member.id}" data-member-name="${member.name}">Remove</button>
                            </div>
                        </div>`
                        groupMembersListGroup.appendChild(memberItem)
                        const inviteBtn = memberItem.querySelector('.invite-btn')
                        const removeBtn = memberItem.querySelector('.remove-btn')
                        inviteBtn.addEventListener('click', () => {
                            const memberId = inviteBtn.getAttribute('data-member')
                            const memberName = inviteBtn.getAttribute('data-member-name')
                            const success = document.createElement('p')
                            success.className = 'success-message'
                            success.textContent = `Inviting ${memberName}`
                            memberItem.querySelector('.group-actions').appendChild(success)
                            inviteBtn.remove()
                            removeBtn.remove()
                            groupMembersSelect.push(memberId)
                        })
                        removeBtn.addEventListener('click', () => {
                            if(groupMembersList.length === 1) {
                                this.shadowRoot.getElementById("Group Members").checked = false
                                this.shadowRoot.querySelector(".project-customization[index='Group Members'] .group-members-list").remove()
                            }
                            memberItem.remove()
                            groupMembersList.splice(groupMembersList.indexOf(member), 1)
                        })
                    })
                    customization.appendChild(groupMembersListGroup)
                }
            })
        })

        this.shadowRoot.querySelectorAll('.toggleSwitch').forEach(toggleSwitch => {
            toggleSwitch.addEventListener('change', function () {
                if (this.checked) {
                    modules[this.id] = true
                } else {
                    modules[this.id] = false
                }

                if (this.id === "Layers") {
                    const layersList = this.closest('.project-customization').querySelector('.layers-list')
                    if (this.checked) {
                        layersList.classList.remove('hidden')
                    } else if (!this.checked) {
                        layersList.classList.add('hidden')
                    }
                }
                if (this.id === "Group Members") {
                    const groupMembersList = this.closest('.project-customization').querySelector('.group-members-list')
                    if (this.checked) {
                        groupMembersList.classList.remove('hidden')
                    } else if (!this.checked) {
                        groupMembersList.classList.add('hidden')
                    }
                }
            })
        })

        this.shadowRoot.getElementById('copy-project-btn').addEventListener('click', async () => {
            this.shadowRoot.getElementById('project-info').classList.add('disabled-container')
            this.shadowRoot.getElementById('copy-project-btn').disabled = true
            const projectSelect = this.shadowRoot.getElementById('project-select')
            const selectedProjectId = projectSelect.value
            if (selectedProjectId === 'none') {
                this.shadowRoot.getElementById('message').textContent = 'Please select a project to copy.'
                return
            }
            modules["Layers"] = this.shadowRoot.getElementById("Layers").checked ? layersSelect : []
            modules["Group Members"] = this.shadowRoot.getElementById("Group Members").checked ? groupMembersSelect : []
            this.shadowRoot.getElementById('message').textContent = 'Copying project... Please wait.'

            await fetch(`${TPEN.servicesURL}/project/${selectedProjectId}/copy-with-customizations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TPEN.getAuthorization()}`
                },
                body: JSON.stringify({modules})
            }).then(res => {
                if (!res.ok) {
                    throw new Error('Failed to copy project')
                }
                return res.json()
            }).then(data => {
                this.shadowRoot.getElementById('message').textContent = `Project copied successfully`
                const projectInfoContainer = this.shadowRoot.getElementById('project-info-container')
                const projectInfo = document.createElement('div')
                projectInfo.className = 'project-info-div'

                const projectTitle = document.createElement('span')
                projectTitle.textContent = data.label

                const manageButton = document.createElement('button')
                manageButton.className = 'manage-btn'
                manageButton.textContent = 'Manage'
                manageButton.onclick = () => {
                    window.location.href = `${TPEN.BASEURL}/project/manage?projectID=${data._id}`
                }

                projectInfo.appendChild(projectTitle)
                projectInfo.appendChild(manageButton)
                projectInfoContainer.appendChild(projectInfo)
            }).catch(error => {
                this.shadowRoot.getElementById('message').textContent = `Error copying project: ${error.message}`
            })
        })
    }
}

customElements.define('tpen-copy-existing-project-with-customizations', CopyExistingProjectWithCustomizations)