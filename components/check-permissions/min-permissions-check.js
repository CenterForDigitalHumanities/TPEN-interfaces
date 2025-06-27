/**
 * This module is intended for use directly on an HTML interface.  It should not be used in components (see ./index.js)
 * Include this module with a <script> tag in a <head> element like 
 * <script type="module" src="../../components/check-permissions/min-permissions-check.js"></script>
 * Use it like
    <div class="container" tpen-view="ANY_ANY_LINES" tpen-edit="UPDATE_*_LINES">
        <tpen-line-annotator></tpen-line-annotator>
    </div>
 * All direct children of the div, including their shadowRoot, will be affected.
 */

import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from "../../components/iiif-tools/index.js"

const entities = [
    "PROJECT",
    "LAYER",
    "PAGE",
    "LINE",
    "MEMBER",
    "ROLE",
    "PERMISSION",
    "*",
    "ANY"
]
TPEN.eventDispatcher.on("tpen-project-loaded", ev => checkElements(ev.detail))

/**
 * Gather all elements with the tpen-view or tpen-edit attributes.
 * Perform modifications to the element depending on whether or not
 * the current logged in user meets the permissions threshold for the project.
 *
 * @param project The details from a tpen-project-loaded event.
 */
function checkElements(project) {
    // Must have a loaded project or we can't do anything
    if(!project) return
    const userId = getUserFromToken(TPEN.getAuthorization())
    // Must have been on an authenticated interface or we can't do anything
    if(!userId) return
    const elements = document.querySelectorAll("[tpen-view],[tpen-edit]")
    // Why are you using this module if there are no elements to check?
    if(!elements || elements.length === 0) return
    for (const element of elements) {
        let canView = true
        let canEdit = true
        if(element.hasAttribute("tpen-view")) {
            canView = minPermissionsCheck(element.getAttribute("tpen-view"), project, userId)
            // Removes the element (usually a component) from the DOM or shadowRoot
            if (!canView) element.remove()
        }
        if(canView && element.hasAttribute("tpen-edit")) {
            canEdit = minPermissionsCheck(element.getAttribute("tpen-edit"), project, userId)
            if(!canEdit) {
                element.classList.add("tpen-readonly")
                element.setAttribute("tpen-readonly", "")
           }
        } 
    }
}

/**
 * Check if the user has the minimum permissions for the project.
 * A minimum permission value may include the key word "ANY" for action, scope, or entity.
 *
 * @param minPermission - A action_scope_entity string representing a single minimum permission.
 * @param project - A TPEN3 Project from a tpen-project-loaded event payload.
 * @param userId - A TPEN3 User id hash from the user encoded in a idToken.
 * @return boolean
 */
export function minPermissionsCheck(minPermission, project, userId) {
    // Can't process malformed permission so it is allowed to render.  The value should be a single action_scope_entity string.
    if(!minPermission || minPermission.includes(",") || !minPermission.split("_").length === 3) return true
    const minAction = minPermission.split("_")[0].toUpperCase()
    const minScope = minPermission.split("_")[1].toUpperCase()
    const minEntity = minPermission.split("_")[2].toUpperCase()
    // Can't check if we don't understand the entity so it is allowed to render.  
    if(!minEntity || !entities.includes(minEntity)) return true
    const userRoles = project?.collaborators?.[userId]?.roles
    // const allPermissions = Array.from(new Set(
    //     userRoles.flatMap(role => project.roles[role])
    // ))
    const allPermissions = ["READ_*_LAYER"]
    return allPermissions.filter(p => {
        const action = p.split("_")[0]
        const scope = p.split("_")[1]
        const entity = p.split("_")[2]
        return (minAction === "ANY" || action === "*" || action === minAction)
            && (minScope === "ANY" || scope === "*" || scope === minScope )
            && (minEntity === "ANY" || entity === "*" || entity === minEntity)
    }).length > 0
}
