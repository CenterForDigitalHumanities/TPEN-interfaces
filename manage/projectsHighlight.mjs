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
    <span class="red"> "${project?.name ?? project?.title ?? '[ untitled ]'}"</span>

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
    metadata.forEach((data) => {

        projectMetada.innerHTML += `  <li>
          <span class="title">${data["label"]}</span>
          <span class="colon">:</span>
          ${data["value"]}
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

function openModal() {
    const modal = document.getElementById("metadata-modal")
    const fieldsContainer = document.getElementById("metadata-fields")
    fieldsContainer.innerHTML = ""

    const project = TPEN.activeProject
    project.metadata.forEach((data, index) => {
        addMetadataField(data.label, data.value, index)
    })

    modal.classList.remove("hidden")
}

function closeModal() {
    document.getElementById("metadata-modal").classList.add("hidden")
}

function addMetadataField(label = "", value = "", index = null) {
    const fieldsContainer = document.getElementById("metadata-fields")
    const fieldHTML = `
      <div class="metadata-field" data-index="${index !== null ? index : 'new'}">
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
    const updatedMetadata = Array.from(fields).map((field) => {
        const label = field.querySelector("input[name='label']").value
        const value = field.querySelector("input[name='value']").value
        return { label, value }
    })


    try {
        const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject.id}/update-metadata`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metadata: updatedMetadata }),
        })

        if (!response.ok) throw new Error("Failed to update metadata")

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
        projectMetadata.innerHTML += `
        <li>
          <span class="title">${data.label}</span>
          <span class="colon">:</span>
          ${data.value}
        </li>
      `
    })
}


// This function is called after the "projects" component is loaded
async function loadProjects() {
    const projects = await fetchProjects()
    renderActiveProject(projects[0]?._id)
    renderProjects(projects)

}


export { loadProjects }
