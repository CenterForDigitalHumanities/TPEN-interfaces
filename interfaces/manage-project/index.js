import TPEN from "../../api/TPEN.mjs"
import "../../components/project-collaborators/index.js"
import "../../components/project-details/index.js"
import "../../components/project-metadata/index.js"
import "../../components/projects/project-list-view.js"
import "../../components/project-permissions/index.js"
import "../../components/project-export/index.js"

TPEN.eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.body
TPEN.attachAuthentication(container)

document.getElementById('manage-collaboration-btn').addEventListener('click', () => {
    const url = `/interfaces/collaborators.html?projectID=${TPEN.screen.projectInQuery}`
    window.location.href = url
})

document.getElementById("update-metadata-btn").addEventListener('click', () => {  
    window.location.href = `/components/update-metadata/index.html?projectID=${TPEN.screen.projectInQuery}`
})

document.getElementById('export-project-btn').addEventListener('click', async () => {
    await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/manifest`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${TPEN.getAuthorization()}`
        }
    })
})

function render() {
    document.querySelector('tpen-project-details').setAttribute('tpen-project-id', TPEN.screen.projectInQuery)

    const roles = TPEN.activeProject.roles
    const permissionList = []
    Object.values(roles).map((role) => {
        role.forEach((permission) => {
            permissionList.push(permission)
        })
    })
    if (Object.keys(roles).includes('OWNER', 'LEADER') || permissionList.includes('*_*_*', '*_*_ROLE', 'CREATE_*_ROLE', 'DELETE_*_ROLE', 'UPDATE_*_ROLE', 'READ_*_ROLE')){
        document.getElementById("add-custom-role-btn").addEventListener('click', async () => {
            window.location.href = `/components/manage-role/index.html?projectID=${TPEN.screen.projectInQuery}`  
        })
    }
}
