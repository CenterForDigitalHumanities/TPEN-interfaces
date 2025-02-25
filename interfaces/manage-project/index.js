import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.getElementById('container')
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

document.getElementById("add-custom-role-btn").addEventListener('click', async () => {
    window.location.href = `/components/add-custom-role/index.html?projectID=${TPEN.activeProject._id}`  
})

function render() {
    if (!TPEN.activeProject) {
        return projectInfo.innerHTML = "No project"
    }
    const projectTitle = document.querySelector('.project-title')
    projectTitle.innerHTML = TPEN.activeProject.label
}
