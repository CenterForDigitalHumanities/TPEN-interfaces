// projects.mjs

// import { getActiveProject } from "../collaborators/index.mjs"
import { User } from "../User/index.mjs"
import getActiveProject from "../utilities/getActiveProject.mjs"
import getHash from "../utilities/getHash.mjs"


async function fetchProjects() {
    const TPEN_USER = window.TPEN_USER
    let token = TPEN_USER?.authorization ?? "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik9FVTBORFk0T1RVNVJrRXlOREl5TTBFMU1FVXdNMFUyT0RGQk9UaEZSa1JDTXpnek1FSTRNdyJ9.eyJodHRwOi8vc3RvcmUucmVydW0uaW8vYWdlbnQiOiJodHRwczovL3N0b3JlLnJlcnVtLmlvL3YxL2lkLzY1Zjg2MTVlYzQzYmQ2NjU2OGM2NjZmYSIsImh0dHA6Ly9yZXJ1bS5pby9hcHBfZmxhZyI6WyJ0cGVuIiwiZGxhIl0sImh0dHA6Ly9kdW5iYXIucmVydW0uaW8vYXBwX2ZsYWciOlsidHBlbiIsImRsYSJdLCJodHRwOi8vcmVydW0uaW8vdXNlcl9yb2xlcyI6eyJyb2xlcyI6WyJkdW5iYXJfdXNlcl9wdWJsaWMiLCJnbG9zc2luZ191c2VyX3B1YmxpYyIsImxyZGFfdXNlcl9wdWJsaWMiLCJyZXJ1bV91c2VyX3B1YmxpYyIsInRwZW5fdXNlcl9hZG1pbiIsInRwZW5fdXNlcl9pbmFjdGl2ZSJdfSwiaHR0cDovL2R1bmJhci5yZXJ1bS5pby91c2VyX3JvbGVzIjp7InJvbGVzIjpbImR1bmJhcl91c2VyX3B1YmxpYyIsImdsb3NzaW5nX3VzZXJfcHVibGljIiwibHJkYV91c2VyX3B1YmxpYyIsInJlcnVtX3VzZXJfcHVibGljIiwidHBlbl91c2VyX2FkbWluIiwidHBlbl91c2VyX2luYWN0aXZlIl19LCJpc3MiOiJodHRwczovL2N1YmFwLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw2NWY4NjE1ZDZjNmJlYjIzMTVjZWY4MjIiLCJhdWQiOlsiaHR0cHM6Ly9jdWJhcC5hdXRoMC5jb20vYXBpL3YyLyIsImh0dHBzOi8vY3ViYXAuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTcyNjIzNzI4MiwiZXhwIjoxNzI2MjQ0NDgyLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIHVwZGF0ZTpjdXJyZW50X3VzZXJfbWV0YWRhdGEgb2ZmbGluZV9hY2Nlc3MiLCJhenAiOiJiQnVnRk1XSFVvMU9oblNaTXBZVVh4aTNZMVVKSTdLbCJ9.iy6c_I6y8ksQj0Mnzo0z9LtK30JSHfn39NHWkgYiV-DRG19-7V6Zb5iOsWELdZaiKAUXdkNyX6NONZZ5duDMHjFnriiI1BQCgS2hEFHJYX2nVak33T5nciM9ySiBJOLchN3xBmbibnJjth8Pft1yF7kmHV5h8pm76qdva5LTkE4IRJ2gYC2JFM6fCayn2VSblNKiQb48mBNBiT26YThJ_yFGX4-cd6JK2X8-1uq77rM3hZg2wx4E7glqLkphf_EpMwJ7jbCNhuP4rw9XuixQ8OrQdyWpFXPu3EJ-e7n4wMkY5vOy1oaxfjbgjiN6QJ5XuE8lpXuYwItXH0qzDzpoFA"
    let userID = getHash(TPEN_USER?.["http://store.rerum.io/agent"] ?? "https://store.rerum.io/v1/id/65f8615ec43bd66568c666fa")

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
    <span class="red"> ${projectData?.name}</span>
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
