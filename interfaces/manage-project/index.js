import TPEN from "../../api/TPEN.js"
import "../../components/project-collaborators/index.js"
import "../../components/project-details/index.js"
import "../../components/project-metadata/index.js"
import "../../components/projects/project-list-view.js"
import "../../components/project-permissions/index.js"
import "../../components/project-export/index.js"
import "../../components/project-layers/index.js"
import "../../components/project-tools/index.js"
import { decodeUserToken } from '../../components/iiif-tools/index.js'

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

document.getElementById('manage-layers-btn').addEventListener('click', () => {
    window.location.href = `/components/manage-layers/index.html?projectID=${TPEN.screen.projectInQuery}`
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
    const collaborators = TPEN.activeProject.collaborators
    const agent = decodeUserToken(TPEN.getAuthorization())['http://store.rerum.io/agent']
    const agentRoles = collaborators[agent.split("/").pop()]?.roles
    const isManager = ["OWNER", "LEADER"].some(role => agentRoles.includes(role))
    if(!isManager) {
        alert("You do not have permissions to use this page.")
        document.location.href = `/project?projectID=${TPEN.screen.projectInQuery}`
    }
    document.getElementById("add-custom-role-btn").addEventListener('click', async () => {
        window.location.href = `/components/manage-role/index.html?projectID=${TPEN.screen.projectInQuery}`  
    })
    // const roles = TPEN.activeProject.roles
    // const permissionList = []
    // Object.values(roles).map((role) => {
    //     role.forEach((permission) => {
    //         permissionList.push(permission)
    //     })
    // })
    // if (Object.keys(roles).includes('OWNER', 'LEADER') || permissionList.includes('*_*_*', '*_*_ROLE', 'CREATE_*_ROLE', 'DELETE_*_ROLE', 'UPDATE_*_ROLE', 'READ_*_ROLE')){
    //     document.getElementById("add-custom-role-btn").addEventListener('click', async () => {
    //         window.location.href = `/components/manage-role/index.html?projectID=${TPEN.screen.projectInQuery}`  
    //     })
    // }
}
