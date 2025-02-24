import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"
import "../../components/project-collaborators/index.js"
import "../../components/project-details/index.js"
import "../../components/project-metadata/index.js"
import "../../components/projects-list/project-list-view.js"


eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.body
TPEN.attachAuthentication(container)

document.getElementById('manage-collaboration-btn').addEventListener('click', () => {
    const URLParams = new URLSearchParams(window.location.search)
    const projectID = URLParams.get("projectID")
    const url = `/interfaces/collaborators.html?projectID=${projectID}`
    window.location.href = url
})

document.getElementById("update-metadata-btn").addEventListener('click', () => {  
    window.location.href = `/components/update-metadata/index.html?projectID=${TPEN.activeProject._id}`
})

function render() {
    if (!TPEN.activeProject) {
        return projectInfo.innerHTML = "No project"
    }
    const projectTitle = document.querySelector('.project-title')
    projectTitle.innerHTML = TPEN.activeProject.label
}
