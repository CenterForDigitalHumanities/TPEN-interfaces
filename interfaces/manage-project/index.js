import TPEN from "../../api/TPEN.js"
import "../../components/project-collaborators/index.js"
import "../../components/project-details/index.js"
import "../../components/project-metadata/index.js"
import "../../components/projects/project-list-view.js"
import "../../components/project-permissions/index.js"
import "../../components/project-export/index.js"
import "../../components/project-layers/index.js"
import "../../components/project-tools/index.js"
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"

const container = document.body
TPEN.attachAuthentication(container)

// Single consolidated listener for project loaded event
TPEN.eventDispatcher.on('tpen-project-loaded', () => {
    const projectID = TPEN.screen.projectInQuery

    // Set href for navigation links
    const manageCollabBtn = document.getElementById('manage-collaboration-btn')
    if (manageCollabBtn) {
        manageCollabBtn.href = `/project/manage/collaborators?projectID=${projectID}`
    }

    const updateMetadataBtn = document.getElementById("update-metadata-btn")
    if (updateMetadataBtn) {
        updateMetadataBtn.href = `/project/metadata?projectID=${projectID}`
    }

    const manageLayersBtn = document.getElementById('manage-layers-btn')
    if (manageLayersBtn) {
        manageLayersBtn.href = `/project/manage/layers?projectID=${projectID}`
    }

    const manageProjectOptionsBtn = document.getElementById('manage-project-options-btn')
    if (manageProjectOptionsBtn) {
        manageProjectOptionsBtn.href = `/project/options?projectID=${projectID}`
    }

    const leaveProjectBtn = document.getElementById('leave-project-btn')
    if (leaveProjectBtn) {
        leaveProjectBtn.href = `/project/leave?projectID=${projectID}`
    }

    // Apply project context with permissions check
    applyProjectContext()
})

document.getElementById('export-project-btn').addEventListener('click', async () => {
    if (!confirm('This will publish a new Manifest which will be available to the public.')) return
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

function applyProjectContext() {
    const isManageProjectPermission = CheckPermissions.checkEditAccess('PROJECT')
    if(!isManageProjectPermission) {
        alert("You do not have permissions to use this page.")
        document.location.href = `/project?projectID=${TPEN.screen.projectInQuery}`
    }
    document.querySelector('tpen-project-details').setAttribute('tpen-project-id', TPEN.screen.projectInQuery)
    
    const manageCustomRoleBtn = document.getElementById("manage-custom-role-btn")
    if (manageCustomRoleBtn) {
        manageCustomRoleBtn.href = `/role/manage?projectID=${TPEN.screen.projectInQuery}`
    }
}
