/**
 * A module that processes the "tpen-view" and "tpen-edit" attributes on elements and components throughout the document.
 * If the permission supplied in the attributes does not match on any of the permissions a user has for a project,
 * then alterations occur to the elements. 
 *
 * To use directly on an HTML interface include this module with a <script> tag in a <head> element like 
 * <script type="module" src="../../components/check-permissions/permission-match.js"></script>
 * Including the module automatically checks all elements in the document.  Decorate elements like
    <div class="container" tpen-view="ANY_ANY_LINES" tpen-edit="UPDATE_*_LINES">
        <tpen-line-annotator></tpen-line-annotator>
    </div>
 * To use within a component, import the permissionMatch function like
 * import { permissionMatch } from '../check-permissions/permission-match.js'
 * Use it like
    const canView = permissionMatch(elem.getAttribute("tpen-view"), project, userId)
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
 * the current logged in user has sufficient permissions for the project.
 *
 * @param project The details from a tpen-project-loaded event.
 */
function checkElements(project) {
    // Must have a loaded project with collaborators or we can't check anything
    if(!project || !project?.collaborators || !project.collaborators.length) return
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
            canView = permissionMatch(element.getAttribute("tpen-view"), project, userId)
            // Removes the element (along with everything in it, of course)
            if (!canView) element.remove()
        }
        if(canView && element.hasAttribute("tpen-edit")) {
            canEdit = permissionMatch(element.getAttribute("tpen-edit"), project, userId)
            if(!canEdit) {
                // The element itself
                element.classList.add("tpen-readonly")
                element.setAttribute("tpen-readonly", "")
                // Also mark the element's direct children since those are likely to be components that need to know.
                Array.from(element.children).forEach(child => {
                    child.classList.add("tpen-readonly")
                    child.setAttribute("tpen-readonly", "")
                })
           }
        } 
    }
}

/**
 * Check if the user has sufficient permissions to match a provided permission.
 * The provided permission must be a single action_scope_entity string.
 * The provided permission may include the key word "ANY" for action, scope, or entity.
 * "ANY" is a positive match on any action, scope, or entity a user's permission contains.
 * Malformed or invalid permissions or a bad project will result in a 'permitted' response.
 *
 * @param permission - A action_scope_entity string representing a single permission.
 * @param project - A TPEN3 Project from a tpen-project-loaded event payload.
 * @param userId - A TPEN3 User id hash from the user encoded in a idToken.
 * @return boolean
 */
export function permissionMatch(permission, project, userId) {
    // Can't process malformed permission so it is allowed to render.  The value should be a single action_scope_entity string.
    // Check for ',' specifically in case someone tried to supply multiple permissions in the attribute.
    if(!permission || permission.includes(",") || permission.split("_").length !== 3) return true
    const provided = permission.split("_")
    // Permissions are project based.  If there is no project then the user is permitted.
    if(!project) return true
    // If it isn't an entity we expect then the user is permitted because we have no say in it.
    if(!minEntity || !entities.includes(minEntity)) return true
    const userRoles = project?.collaborators?.[userId]?.roles
    const allUserPermissions = (userRoles && userRoles.length) ? 
        Array.from(new Set(
            userRoles.flatMap(role => project.roles[role])
        )) : []
    // If there are no permissions they will not be permitted.  They might not be in the project.
    let permitted = false
    for(const permission of allUserPermissions) {
        const current = permission.split("_")
        permitted = 
            (provided[0] === "ANY" || current[0] === "*" || provided[0] === current[0])
         && (provided[1] === "ANY" || current[1] === "*" || provided[1] === current[1])
         && (provided[2] === "ANY" || current[2] === "*" || provided[2] === current[2])
         if(permitted) return
    }
    return permitted
}
