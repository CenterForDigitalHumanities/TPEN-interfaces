import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

const container = document.getElementById('container')
TPEN.attachAuthentication(container)

eventDispatcher.on('tpen-project-loaded', () => render())

function render() {
    if (!TPEN.activeProject) {
        return projectInfo.innerHTML = "No project"
    }
    const projectTitle = document.querySelector('.project-title')
    projectTitle.innerHTML = TPEN.activeProject.label
    renderProjectDetails()
}

function renderProjectDetails() {
    const projectInfo = document.querySelector('.project-card')
    const userId = container.getAttribute('tpen-user-id')
    const projectOwner = TPEN.activeProject.collaborators[userId].profile.displayName
    const collaboratorCount = Object.keys(TPEN.activeProject.collaborators).length

    projectInfo.innerHTML = `
        <p>Project ID <span>${TPEN.activeProject._id}</span></p>
        <p>Project Title <span>${TPEN.activeProject.label}</span></p>
        <p>Project Owner <span>${projectOwner}</span></p>
        <p>Project Collaborator Count <span>${collaboratorCount}</span></p>
        <div class="manuscripts">
            <img src="../assets/images/manuscript_img.webp" />
            <img src="../assets/images/manuscript.webp" />
        </div>
    `
}
