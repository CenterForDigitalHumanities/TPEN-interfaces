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
            <div class="title">${project.name ?? project.title ?? project.label}</div>
            <div class="delete" data-id="${project._id}">&#128465;</div>
        `
        projectsList.appendChild(projectItem)
    })

    // Add delete functionality to each delete button
    const deleteButtons = projectsList.querySelectorAll('.delete')
    deleteButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const projectID = event.target.getAttribute('data-id')
            deleteProject(projectID)
        })
    })
}


async function renderActiveProject(fallbackProjectId) {
    const activeProjectContainer = document.getElementById('active-project')
    activeProjectContainer.innerHTML = ''

    let projectId = TPEN.activeProject?._id // ?? fallbackProjectId
    if (!projectId) {
        // cheat to help other tabs for now
        location.href = `?projectID=${fallbackProjectId ?? 'DEV_ERROR'}`
        return
    }

    let project = TPEN.activeProject
    if (!project) {
        project = new Project(projectId)
        await project.fetch()
    }
    activeProjectContainer.innerHTML = `   <p>
    Active project is
    <span class="red"> "${project?.label ?? project?.title ?? '[ untitled ]'}"</span>

  </p>
  <p>
    Active project T-PEN I.D.
    <span class="red">${project?._id ?? 'ERR!'}</span>
  </p>`

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
    // const preferredLang = getPreferredLanguage()

    metadata.forEach((data) => {

        const label = getLabel(data)
        const value = getValue(data)

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
                const label = labelMap[lang]?.join(", ") || ""
                const value = valueMap[lang]?.join(", ") || ""
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
    const updatedMetadata = {}

    fields.forEach((field) => {
        const lang = field.querySelector("select[name='language']").value
        const label = field.querySelector("input[name='label']").value
        const value = field.querySelector("input[name='value']").value

        if (!updatedMetadata[lang]) {
            updatedMetadata[lang] = { label: [], value: [] }
        }

        updatedMetadata[lang].label.push(label)
        updatedMetadata[lang].value.push(value)
    })

    const processedMetadata = Object.entries(updatedMetadata).map(([lang, data]) => ({
        label: { [lang]: data.label },
        value: { [lang]: data.value },
    }))

    try {
        await TPEN.activeProject.updateMetadata(processedMetadata)

        closeModal()
        alert("Metadata updated successfully!")
        refreshMetadataDisplay(processedMetadata)
    } catch (error) {
        console.error(error)
        alert("An error occurred while updating metadata.")
    }
}


function refreshMetadataDisplay(metadata) {
    const projectMetadata = document.getElementById("project-metadata")
    projectMetadata.innerHTML = ""

    metadata.forEach((data) => {
        const label = getLabel(data)
        const value = getValue(data)
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



// This function is called after the "projects" component is loaded
async function loadProjects() {
    const projects = await fetchProjects()
    renderActiveProject(projects[0]?._id)
    renderProjects(projects)

}


export { loadProjects }
