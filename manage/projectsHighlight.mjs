// projects.mjs
import User from "../api/User.mjs"
import Project from "../api/Project.mjs"
import TPEN from "../api/TPEN.mjs"
import { eventDispatcher } from "../api/events.mjs"

const elem = document.getElementById("manage-class")
TPEN.attachAuthentication(elem)

eventDispatcher.on("tpen-authenticated", loadProjects)

async function fetchProjects() {
    const token = elem.userToken
    const userObj = User.fromToken(token)
    return await userObj.getProjects()
}

function renderProjects(projects) {
    const projectsList = document.getElementById('projects-list')
    projectsList.innerHTML = ''
    if (!projects || !projects.length) {
        console.log("There are no projects for this user")
        return
    }

    projects.forEach(project => {
        const projectItem = document.createElement('li')
        projectItem.classList.add('project')
        projectItem.innerHTML = `
            <div class="title" data-id="${project._id}">${project.name ?? project.title ?? project.label}</div>
            <div class="delete" data-id="${project._id}">&#128465;</div>
        `
        projectsList.appendChild(projectItem)
    })

    projectsList.addEventListener('click', (event) => {
        if (event.target.classList.contains('title')) {
            const projectID = event.target.getAttribute('data-id')
            reloadNewProject(projectID)
        }
    })

    projectsList.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete')) {
            const projectID = event.target.getAttribute('data-id')
            deleteProject(projectID)
        }
    })
}

async function reloadNewProject(projectID) {
    window.history.pushState({}, "", `?projectID=${projectID}`)

    const project = new Project(projectID)
    await project.fetch()
    TPEN.activeProject = project
    await renderActiveProject(projectID)
}

async function renderActiveProject(projectId) {
    const activeProjectContainer = document.getElementById('active-project')
    activeProjectContainer.innerHTML = ''

    let project = new Project(projectId)
    await project.fetch()

    activeProjectContainer.innerHTML = `   
        <p>
            Active project is
            <span class="red"> "${project?.label ?? project?.title ?? '[ untitled ]'}"</span>
        </p>
        <p>
            Active project T-PEN I.D.
            <span class="red">${project?._id ?? 'ERR!'}</span>
        </p>
    `
    loadMetadata(project)
}

async function deleteProject(projectID) {
    try {
        const response = await fetch(`/api/projects/${projectID}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.TPEN_USER?.authorization}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error('Failed to delete the project')
        }

        loadProjects()
    } catch (error) {
        console.log('Error deleting project:', error)
        throw error
    }
}

async function loadMetadata(project) {
    let projectMetada = document.getElementById("project-metadata")
    const metadata = project.metadata 
    projectMetada.innerHTML = ""
    metadata.forEach((data) => {

        const label = decodeURIComponent(getLabel(data))
        const value = decodeURIComponent(getValue(data))

        projectMetada.innerHTML += `  <li>
          <span class="title">${label}</span>
          <span class="colon">:</span>
          ${value}
        </li>`
    })
}

document.getElementById("update-metadata-btn").addEventListener("click", () => {
    openModal()
})

document.getElementById("add-field-btn").addEventListener("click", () => {
    addMetadataField()
})

document.getElementById("save-metadata-btn").addEventListener("click", () => {
    updateMetadata()
})

document.getElementById("cancel-btn").addEventListener("click", () => {
    closeModal()
})

function closeModal() {
    document.getElementById("metadata-modal").classList.add("hidden")
}

function openModal() {
    const modal = document.getElementById("metadata-modal")
    const fieldsContainer = document.getElementById("metadata-fields")
    fieldsContainer.innerHTML = ""

    const project = TPEN.activeProject

    project.metadata.forEach((data, index) => {
        // Handle simple key-value pairs
        if (typeof data.label === "string" && typeof data.value === "string") {
            addMetadataField("none", data.label, data.value, index)
        }
        // Handle language map format
        else if (typeof data.label === "object" && typeof data.value === "object") {
            const labelMap = data.label
            const valueMap = data.value

            Object.keys(labelMap).forEach((lang) => {
                const label = decodeURIComponent(labelMap[lang]?.join(", ") || "")
                const value = decodeURIComponent(valueMap[lang]?.join(", ") || "")
                addMetadataField(lang, label, value, index)
            })
        }
    })

    modal.classList.remove("hidden")
}

function addMetadataField(lang = "none", label = "", value = "", index = null) {
    const fieldsContainer = document.getElementById("metadata-fields")
    const fieldHTML = `
      <div class="metadata-field" data-index="${index !== null ? index : 'new'}">
        <select name="language">
          <option value="none" ${lang === "none" ? "selected" : ""}>None</option>
          <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
          <option value="fr" ${lang === "fr" ? "selected" : ""}>French</option>
          <!-- Other lnguages to come later, maybe from an API -->
        </select>

        <input type="text" name="label" placeholder="Label" value="${label}" />
        <input type="text" name="value" placeholder="Value" value="${value}" />
        <button type="button" class="remove-field-btn">X</button>
      </div>
    `
    fieldsContainer.insertAdjacentHTML("beforeend", fieldHTML)

    // Add event listener for the remove button
    fieldsContainer
        .querySelector(".metadata-field:last-child .remove-field-btn")
        .addEventListener("click", (e) => {
            e.target.parentElement.remove()
        })
}

async function updateMetadata() {
    const fields = document.querySelectorAll(".metadata-field")
    const updatedMetadata = []

    fields.forEach((field) => {
        const lang = encodeURIComponent(field.querySelector("select[name='language']").value)
        const label = encodeURIComponent(field.querySelector("input[name='label']").value)
        const value = encodeURIComponent(field.querySelector("input[name='value']").value)

        // Create a new object for each label-value pair
        updatedMetadata.push({
            label: { [lang]: [label] },
            value: { [lang]: [value] },
        })
    })

    try {
        await TPEN.activeProject.updateMetadata(updatedMetadata)

        closeModal()
        alert("Metadata updated successfully!")

        refreshMetadataDisplay(updatedMetadata)
    } catch (error) {
        console.error(error)
        alert("An error occurred while updating metadata.")
    }
}

function refreshMetadataDisplay(metadata) {
    const projectMetadata = document.getElementById("project-metadata")
    projectMetadata.innerHTML = ""

    metadata.forEach((data) => {
        const label = decodeURIComponent(getLabel(data))
        const value = decodeURIComponent(getValue(data))
        projectMetadata.innerHTML += `
        <li>
          <span class="title">${label}</span>
          <span class="colon">:</span>
          ${value}
        </li>
      `
    })
}

function getLabel(data) {
    if (typeof data.label === "string") {
        return data.label
    }

    if (typeof data.label === "object") {
        return Object.entries(data.label)
            .map(([lang, values]) => `${lang != "none" ? lang + ":" : ""} ${values.join(", ")}`)
            .join(" | ")
    }

    return "Unknown Label"
}

function getValue(data) {
    if (typeof data.value === "string") {
        return data.value
    }

    if (typeof data.value === "object") {
        return Object.entries(data.value)
            .map(([lang, values]) => `${values.join(", ")}`)
            .join(" | ")
    }

    return "Unknown Value"
}

async function loadProjects() {
    const urlParams = new URLSearchParams(window.location.search)
    const projectIDFromURL = urlParams.get("projectID")
    const projects = await fetchProjects()
    renderProjects(projects)
    
    if (projectIDFromURL) {
        await renderActiveProject(projectIDFromURL)
    }
    else {
        await renderActiveProject(projects[0]?._id)
    }
}

export { loadProjects }
