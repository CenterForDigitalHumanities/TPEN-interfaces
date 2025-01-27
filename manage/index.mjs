import Project from "../api/Project.mjs"
import TPEN from "../api/TPEN.mjs"
import { eventDispatcher } from "../api/events.mjs"

eventDispatcher.on('tpen-project-loaded', loadManageInterface)

async function getActiveProject() {
    const URLParams = new URLSearchParams(window.location.search)
    let projectID = URLParams.get("projectID")
    let projectObj = new Project(projectID) 
    const projectData = await projectObj.fetch() 
    return { projectObj, projectData }
}

function renderRoles(roles) {
    const defaultRoles = ["OWNER", "LEADER", "CONTRIBUTOR", "VIEWER"]

    return roles
        .map(role => {
            if (role === "OWNER") {
                return `<span class="role owner">Owner</span>`
            } else if (role === "LEADER") {
                return `<span class="role leader">Leader</span>`
            } else if (defaultRoles.includes(role)) {
                return `<span class="role default">${role.toLowerCase()}</span>`
            } else {
                return `<span class="role custom">${role.toLowerCase().replaceAll("_", " ")}</span>`
            }
        })
        .join(", ")
}

function loadManageInterface(){
  const buttons = document.querySelectorAll("header button")
  const content = document.getElementById("content")

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      buttons.forEach(btn => btn.classList.remove('active'))

      button.classList.add('active')
      const componentName = button.id
      const response = await fetch(`${componentName}.html`)
      const componentHtml = await response.text()
      content.innerHTML = componentHtml  

      if (componentName === "collaboration") {
        const modifyTeamBtn = document.getElementById("modify-team-btn")

        if (modifyTeamBtn) {
          modifyTeamBtn.addEventListener("click", () => {
            const URLParams = new URLSearchParams(window.location.search)
            const projectID = URLParams.get("projectID")
            const url = `/collaborators/index.html?projectID=${projectID}`
            window.location.href = url
          })
        } 
        const { projectData } = await getActiveProject()
        console.log(projectData)
        const contributors = projectData.contributors

        const projectDetailsElement = document.getElementById('project-details')
        const contributorsListElement = projectDetailsElement.querySelector('ul')

        for (const contributorId in contributors) {
          const contributor = contributors[contributorId]
          const name = contributor?.displayName ?? contributor?.email
          contributorsListElement.innerHTML += `<li class="red">${name} (${renderRoles(contributor.roles)}) </li> `
        } 
      } 
      if (componentName === "projectsHighlight") {
        const { loadProjects } = await import('./projectsHighlight.mjs')
        loadProjects()
      }
    })
  })
  document.getElementById("projectsHighlight").click()
}

document.addEventListener("DOMContentLoaded", () => getActiveProject)
