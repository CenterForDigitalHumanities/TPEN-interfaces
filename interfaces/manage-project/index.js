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
import { confirmAction } from "../../utilities/confirmAction.js"

const container = document.body
TPEN.attachAuthentication(container)

// [tpen-race C] manage-project/index.js about to register listener.  Issue #541 diagnostic.
const _alreadyLoaded = !!TPEN.activeProject?._createdAt
console.log(`%c[tpen-race C]%c manage-project/index.js registering tpen-project-loaded listener; activeProject._createdAt=${_alreadyLoaded ? TPEN.activeProject._createdAt : 'UNSET'} @${performance.now().toFixed(1)}ms`, _alreadyLoaded ? 'color:#cc0000;font-weight:bold' : 'color:#008800;font-weight:bold', 'color:inherit')
let _mpListenerFired = false
setTimeout(() => {
    if (!_mpListenerFired) {
        console.log(`%c[tpen-race !]%c manage-project/index.js LISTENER NEVER FIRED — race lost @${performance.now().toFixed(1)}ms`, 'color:#fff;background:#cc0000;font-weight:bold;padding:2px 4px', 'color:inherit')
    }
}, 4000)

// Single consolidated listener for project loaded event
TPEN.eventDispatcher.on('tpen-project-loaded', () => {
    _mpListenerFired = true
    console.log(`%c[tpen-race D]%c manage-project/index.js listener fired @${performance.now().toFixed(1)}ms`, 'color:#008800;font-weight:bold', 'color:inherit')
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

document.getElementById('export-project-btn').addEventListener('click', () => {
    confirmAction(
        "This will publish a new Manifest which will be available to the public.",
        () => {
            fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/manifest`, {
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
        },
        null,
        { positiveButtonText: "Publish", negativeButtonText: "Cancel" }
    )
})

function applyProjectContext() {
    const isManageProjectPermission = CheckPermissions.checkEditAccess('PROJECT')
    if(!isManageProjectPermission) {
        TPEN.eventDispatcher.dispatch('tpen-alert', { message: "You do not have permissions to use this page." })
        TPEN.eventDispatcher.one('tpen-alert-acknowledged', () => {
            document.location.href = `/project?projectID=${TPEN.screen.projectInQuery}`
        })
        return
    }
    document.querySelector('tpen-project-details').setAttribute('tpen-project-id', TPEN.screen.projectInQuery)
    
    const manageCustomRoleBtn = document.getElementById("manage-custom-role-btn")
    if (manageCustomRoleBtn) {
        manageCustomRoleBtn.href = `/role/manage?projectID=${TPEN.screen.projectInQuery}`
    }
}
