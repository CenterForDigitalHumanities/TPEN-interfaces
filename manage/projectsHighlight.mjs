// projects.mjs

// import { getActiveProject } from "../collaborators/index.mjs"
import { User } from "../User/index.mjs"
import checkUserAuthentication from "../utilities/checkUserAuthentication.mjs"
import getActiveProject from "../utilities/getActiveProject.mjs"
import getHash from "../utilities/getHash.mjs"


async function fetchProjects() {
    const TPEN_USER = await checkUserAuthentication()
    let token = TPEN_USER?.authorization
    
    let userID = getHash(TPEN_USER.agent)

    try {
        const userObj = new User(userID)
        userObj.authentication = token
        const projects = await userObj.getProjects()
        return projects
    } catch (error) {
        throw error
    }
}


function renderProjects(projects) {
    const projectsList = document.getElementById('projects-list') 
    projectsList.innerHTML = ''

    projects.forEach(project => {
        const projectItem = document.createElement('li')
        projectItem.classList.add('project')
        projectItem.innerHTML = `
            <div class="title">${project.name ?? project.title}</div>
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


async function renderActiveProject(){
    const activeProjectContainer = document.getElementById('active-project')
    activeProjectContainer.innerHTML = ''
    
    const {projectData} = await getActiveProject() 
 
     activeProjectContainer.innerHTML = `   <p>
    Active project is
    <span class="red"> "${projectData?.name}"</span>
  </p>
  <p>
    Active project T-PEN I.D.
    <span class="red">${projectData._id}</span>
  </p>`

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


// This function is called after the "projects" component is loaded
async function loadProjects() {
    const projects = await fetchProjects()
    renderActiveProject()
    renderProjects(projects) 
 }


export { loadProjects }
