import TPEN from "../../api/TPEN.js"
import Project from "../../api/Project.js"
 
TPEN.attachAuthentication(document.body)
document.getElementById("importProjectBtn").addEventListener("click", () => {
    openProject()
    document.getElementById("importProjectBtn").classList.add("hidden")
})

async function fetchProjects() {
    const UID = new URLSearchParams(window.location.search).get("UID")
    
    const response = await fetch(`${TPEN.servicesURL}/project/import28/${UID}`, {
        method: "GET",
        credentials: "include"
    })
    
    const { message, data } = await response.json()
    document.getElementById("message").textContent = message
    
    const select = document.getElementById("projectSelect")
    for (const key in data) {
        const option = document.createElement("option")
        option.value = `${data[key].id}`
        option.textContent = data[key].name
        select.appendChild(option)
    }
}

async function importProject(selectedId) {
    const messageText = document.getElementById("message")
    messageText.textContent = "Importing Project... Please wait..."
    TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Importing Project... Please wait...', status: 'info' })

    const projectData = await fetch(`${TPEN.servicesURL}/project/import28/selectedproject/${selectedId}`, {
        method: "GET",
        credentials: "include"
    })

    if (!projectData.ok) {
        messageText.textContent = "Failed to import project"
        TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Failed to import project', status: 'error', dismissible: true })
        return
    }

    const { message, project } = await projectData.json()
    messageText.textContent = message
    document.getElementById("projectSelect").disabled = true
    document.getElementById("importProjectBtn").remove()

    await fetch(`${TPEN.servicesURL}/project/deletecookie`, {
        method: "GET",
        credentials: "include",
    })

    const openBtn = document.getElementById("openProject")
    openBtn.classList.remove("hidden")
    openBtn.href = `/project/manage?projectID=${project.importData._id}`

    return { projectTPEN28Data: project.parsedData, projectTPEN3Data: project.importData }
}

async function importCollaborators(projectData, projectID) {
    const collaborators = projectData.ls_u.map((user) => ({ email: user.Uname }))
    const leaders = projectData.ls_leader.map((user) => ({ email: user.Uname }))
    const wrapper = document.getElementById("collaboratorList")
    const section = document.getElementById("projectCollaborators")
    section.classList.remove("hidden")
   
    const leaderEmails = Object.values(leaders).map((user) => user.email)
    const collaboratorList = Object.values(collaborators)
   
    collaboratorList.forEach((user) => {
        const item = document.createElement("div")
        item.classList.add("collaborator-item")
    
        const email = document.createElement("p")
        email.textContent = user.email
    
        const button = document.createElement("button")
        const isLeader = leaderEmails.includes(user.email)
        const role = isLeader ? "LEADER" : "VIEWER"
        button.textContent = isLeader ? "Invite as Leader" : "Invite as Viewer"
        button.className = "btn primary-btn"
        button.addEventListener("click", async () => {
            button.textContent = "Inviting..."
            button.disabled = true
            const project = new Project(projectID)
            const response = await project.addMember(user.email, [role])

            if (response) {
                button.style.display = "none"
            }

            const success = document.createElement("p")
            success.style.display = "block"
            success.textContent = "Invitation sent successfully!"
            success.classList.add("success-message")
            item.appendChild(success)
        })
        item.appendChild(email)
        item.appendChild(button)
        wrapper.appendChild(item)
    })
}
 
async function openProject() {
    const select = document.getElementById("projectSelect")
    const selectedId = select.value?.split("/")[1]
    const messageDiv = document.getElementById("message")
    messageDiv.textContent = ""
    
    if (!selectedId) {
        messageDiv.textContent = "Please select a project first."
        return
    }

    message.textContent = "Project importing... Please wait..."
    const { projectTPEN28Data, projectTPEN3Data } = await importProject(selectedId)
    TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Project imported successfully', status: 'success'})
    const projectID = projectTPEN3Data._id
    await importCollaborators(projectTPEN28Data, projectID)
} 
 
fetchProjects()
