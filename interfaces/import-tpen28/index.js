import TPEN from "../../api/TPEN.js"
import Project from "../../api/Project.js"
 
TPEN.attachAuthentication(document.body)
document.getElementById("importProjectBtn").addEventListener("click", openProject)

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
        option.value = `${data[key].name}/${data[key].id}`
        option.textContent = data[key].name
        select.appendChild(option)
    }
}

async function fetchOneTPEN28Project(selectedId) {
    const messageDiv = document.getElementById("message")
    let projectResponse
    try {
        projectResponse = await fetch(`${TPEN.TPEN28URL}/TPEN/getProjectTPENServlet?projectID=${selectedId}`, { 
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include" 
        })
    
        if (!projectResponse.ok) {
            messageDiv.textContent = "Unable to import Project"
            return
        }
    } catch (error) {
        console.error("Error during fetch:", error)
        messageDiv.textContent = "Unable to import Project"
        return
    }
    return projectResponse.json()
}

async function importAnnotations(projectTPEN28Data) {
    const allPages = projectTPEN28Data.layers[0].pages.map((page) => page.target)
    const allPagesIds = projectTPEN28Data.layers[0].pages.map((page) =>page.id.replace(/project\/([a-f0-9]+)/, `project/${projectTPEN28Data._id}`))
    let manifestUrl = projectTPEN28Data.manifest[0]
    
    // We might add the Vault here to get the Manifest version 3
    function transformManifestUrl(url) {
        const parsedUrl = new URL(url)
        parsedUrl.protocol = "https:"
        if (parsedUrl.pathname.endsWith("/manifest.json")) {
            parsedUrl.pathname = parsedUrl.pathname.replace(/\/manifest\.json$/, "")
        }
        parsedUrl.search = "?version=3"
        return parsedUrl.toString()
    }
    
    manifestUrl = transformManifestUrl(manifestUrl)
    
    const responseManifest = await fetch(manifestUrl)
    if (!responseManifest.ok) {
        throw new Error(`Failed to fetch: ${responseManifest.statusText}`)
    }
    
    const manifestJson = await responseManifest.json()
    const itemsByPage = {}
    manifestJson.items.map((item, index) => {
        const pageId = item.id
        if (allPages.includes(pageId)) {
            const annotations = item.annotations?.flatMap(
                (annotation) =>
                    annotation.items?.flatMap((innerItems) => ({
                    body: innerItems.body,
                    motivation: innerItems.motivation,
                    target: innerItems.target,
                    type: innerItems.type,
                    })) || []
                ) || []
            itemsByPage[allPagesIds[index]] = annotations
        }
    })
    
    for (const [endpoint, annotations] of Object.entries(itemsByPage)) {
        try {
            const response = await fetch(`${endpoint}/line`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${TPEN.getAuthorization()}`,
                },
                body: JSON.stringify(annotations),
            })

            if (!response.ok) {
                throw new Error(`Failed to import annotations: ${response.statusText}`)
            }
        } catch (error) {
            console.error("Error importing annotations:", error)
        }
    }
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

async function importHotKeys(projectData, projectID) {
    const symbols = projectData.projectButtons.map(button => String.fromCharCode(button.key))
    const response = await fetch(`${TPEN.servicesURL}/project/${projectID}/hotkeys`, {
        method : "POST",
        headers: {
            Authorization: `Bearer ${TPEN.getAuthorization()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({symbols}),
    })
  
    TPEN.eventDispatcher.dispatch(
        "tpen-toast",
        response.ok
        ? { status: "info", message: "Successfully Added Hotkeys" }
        : { status: "error", message: "Error Adding Hotkeys" }
    )
}

async function importTools(projectTPEN28Data, projectTPEN3Data, projectID) {
    const projectTools = projectTPEN28Data.userTool + projectTPEN28Data.projectTool
    const toolList = projectTPEN3Data.tools.map((tool) => tool.value)
    const selectedTools = toolList.map((tool) => ({
        value: tool,
        state: projectTools.includes(tool),
    }))
    
    const responseTools = await fetch(`${TPEN.servicesURL}/project/${projectID}/tools`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${TPEN.getAuthorization()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedTools),
    })
    
    TPEN.eventDispatcher.dispatch(
        "tpen-toast",
        responseTools.ok
        ? { status: "info", message: "Successfully Added Tools" }
        : { status: "error", message: "Error Adding Tools" }
    )
}

async function importProject(url) {
    const messageDiv = document.getElementById("message")
    const importResponse = await fetch(`${TPEN.servicesURL}/project/import?createFrom=URL`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TPEN.getAuthorization()}`
        },
        body: JSON.stringify({ url })
    })

    if (!importResponse.ok) {
        messageDiv.textContent = "Unable to import TPEN3 Project"
        return
    }
    return importResponse.json()
}
 
async function openProject() {
    const select = document.getElementById("projectSelect")
    const selectedId = select.value?.split("/")[2]
    const messageDiv = document.getElementById("message")
    const url = `${TPEN.TPEN28URL}/TPEN/manifest/${selectedId}`
    messageDiv.textContent = ""
    
    if (!selectedId) {
        messageDiv.textContent = "Please select a project first."
        return
    }

    const projectTPEN28Data = await fetchOneTPEN28Project(selectedId)
    const projectTPEN3Data = await importProject(url)
    const projectID = projectTPEN3Data._id

    await importAnnotations(projectTPEN28Data)
    await importCollaborators(projectTPEN28Data, projectID)
    await importHotKeys(projectTPEN28Data, projectID)
    await importTools(projectTPEN28Data, projectTPEN3Data, projectID)

    messageDiv.textContent = "Project Imported"
    document.getElementById("projectSelect").disabled = true
    document.getElementById("importProjectBtn").remove()

    const openBtn = document.getElementById("openProject")
    openBtn.classList.remove("hidden")
    openBtn.addEventListener("click", () => {
        window.location.href = `/interfaces/manage-project/index.html?projectID=${projectID}`
    })
} 
 
fetchProjects()