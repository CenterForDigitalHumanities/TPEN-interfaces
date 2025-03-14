import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"
import "../../components/project-collaborators/index.js"
import "../../components/project-details/index.js"
import "../../components/project-metadata/index.js"
import "../../components/projects/project-list-view.js"
import "../../components/project-permissions/index.js"

eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.body
TPEN.attachAuthentication(container)

document.getElementById('manage-collaboration-btn').addEventListener('click', () => {
    const url = `/interfaces/collaborators.html?projectID=${TPEN.screen.projectInQuery}`
    window.location.href = url
})

document.getElementById("update-metadata-btn").addEventListener('click', () => {  
    window.location.href = `/components/update-metadata/index.html?projectID=${TPEN.screen.projectInQuery}`
})

document.getElementById("add-custom-role-btn").addEventListener('click', async () => {
    window.location.href = `/components/manage-role/index.html?projectID=${TPEN.screen.projectInQuery}`  
})

function render() {
    document.querySelector('tpen-project-details').setAttribute('tpen-project-id', TPEN.screen.projectInQuery)
}
