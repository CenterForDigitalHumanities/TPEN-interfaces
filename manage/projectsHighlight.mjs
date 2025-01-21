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


// This function is called after the "projects" component is loaded
async function loadProjects() {
    const projects = await fetchProjects()
    renderActiveProject(projects[0]?._id)
    renderProjects(projects)

}


export { loadProjects }
