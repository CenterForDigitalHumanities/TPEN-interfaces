import getActiveProject from '../utilities/getActiveProject.mjs'
import renderRoles from '../utilities/renderRoles.mjs'

document.addEventListener("DOMContentLoaded", () => {
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
  // document.getElementById("collaboration").click()
})
