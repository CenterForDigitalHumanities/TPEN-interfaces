import TPEN from "../../api/TPEN.js"
import "../../components/project-collaborators/index.js"
import "../../components/project-details/index.js"
import "../../components/project-metadata/index.js"
import "../../components/projects/project-list-view.js"
import "../../components/project-permissions/index.js"
import "../../components/project-export/index.js"
import "../../components/project-layers/index.js"
import "../../components/project-tools/index.js"
import CheckPermissions from "../../utilities/checkPermissions.js"

TPEN.eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.body
TPEN.attachAuthentication(container)

document.getElementById('manage-collaboration-btn').addEventListener('click', () => {
    const url = `/project/manage/collaborators?projectID=${TPEN.screen.projectInQuery}`
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
    }).then(response => {
        return TPEN.eventDispatcher.dispatch("tpen-toast", 
        response.ok ? 
            { status: "info", message: 'Successfully Exported Project Manifest' } : 
            { status: "error", message: 'Error Exporting Project Manifest' }
        )
    }).catch(error => {
        console.error('Error exporting project manifest:', error)
    })
})

document.getElementById('manage-project-options-btn').addEventListener('click', () => {
    window.location.href = `/project/options?projectID=${TPEN.screen.projectInQuery}`
})

document.getElementById('leave-project-btn').addEventListener('click', (e) => {
    window.location.href = `/project/leave?projectID=${TPEN.screen.projectInQuery}`
})

async function render() {
    const isManageProjectPermission = await CheckPermissions.checkEditAccess('PROJECT')
    if(!isManageProjectPermission) {
        alert("You do not have permissions to use this page.")
        document.location.href = `/project?projectID=${TPEN.screen.projectInQuery}`
    }
    document.querySelector('tpen-project-details').setAttribute('tpen-project-id', TPEN.screen.projectInQuery)
    document.getElementById("add-custom-role-btn").addEventListener('click', async () => {
        window.location.href = `/components/manage-role/index.html?projectID=${TPEN.screen.projectInQuery}`  
    })
}
