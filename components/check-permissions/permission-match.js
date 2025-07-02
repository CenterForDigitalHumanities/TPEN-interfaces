/**
 * A module that processes the "tpen-view" and "tpen-edit" attributes on elements and components throughout the document.
 * If the permission supplied does not match on any of the permissions a user has for a project,
 * then alterations occur to the wrapped elements.  This is processed once when it is loaded
 * and does not listen for changes.
 *
 * Use the tpen-view attribute to check if the component should be removed as unviewable.
 * Use the tpen-edit attribute to check if the component should be read-only as uneditable.  
 * - If the attribute is not present or is invalid they are considered permitted.
 *
 * To use directly on an HTML interface include this module with a <script> tag in a <head> element like 
 * <script type="module" src="../../components/check-permissions/permission-match.js"></script>
 * Including the module automatically checks all elements in the document.
 *
 * Ex. Show a tpen-line-component if a user has any Line permissions.  Make it read-only if the user cannot update all Line scopes.
    <div class="container" tpen-view="ANY_ANY_LINE" tpen-edit="UPDATE_*_LINE">
        <tpen-line-component></tpen-line-component>
    </div>
 *
 * To use within a component, import the permissionMatch function like
 * import { permissionMatch } from '../check-permissions/permission-match.js'
 * Use it like
    const canView = permissionMatch(elem.getAttribute("tpen-view"), project, userId)
 *
 */

import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from "../../components/iiif-tools/index.js"
// TODO use these from a central location, such as a Permission Class.
const entities = [
    "PROJECT",
    "LAYER",
    "PAGE",
    "LINE",
    "MEMBER",
    "ROLE",
    "PERMISSION",
    "TOOL",
    "*",
    "ANY"
]
TPEN.eventDispatcher.on("tpen-project-loaded", ev => checkElements(ev.detail))

/**
 * Gather all elements with the tpen-view or tpen-edit attributes.
 * Perform modifications to the element depending on whether or not
 * the current logged in user has sufficient project permissions.
 *
 * @param project - The details from a tpen-project-loaded event.
 */
function checkElements(project) {
    // Must have a loaded project with collaborators or we can't check anything
    if (!project?.collaborators || !Object.keys(project.collaborators).length) return
    const userId = getUserFromToken(TPEN.getAuthorization())
    // Must have been on an authenticated interface or we can't do anything
    if (!userId) return
    const elements = document.querySelectorAll("[tpen-view],[tpen-edit]")
    // Why are you using this module if there are no elements to check?
    if (!elements || elements.length === 0) return
    for (const element of elements) {
        let canView = true
        let canEdit = true
        if (element.hasAttribute("tpen-edit")) {
            canEdit = permissionMatch(element.getAttribute("tpen-edit"), project, userId)
            if (!canEdit) {
                // The element itself
                element.classList.add("tpen-readonly")
                element.setAttribute("tpen-readonly", "")
                // Also mark the element's direct children since those are likely to be components that need to know.
                if (element.children?.length) {
                    Array.from(element.children).forEach(child => {
                        child.classList.add("tpen-readonly")
                        child.setAttribute("tpen-readonly", "")
                    })
                }
            }
        }
        if (element.hasAttribute("tpen-view")) {
            // If they can edit, then they can view.
            canView = canEdit ? true : permissionMatch(element.getAttribute("tpen-view"), project, userId)
            // Removes the element (along with everything in it, of course)
            if (!canView) element.remove()
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
    if (!permission || typeof permission !== "string" || permission.includes(",") || permission.split("_").length !== 3) return true
    const provided = permission.split("_").map(ase => ase.toUpperCase())
    // Permissions are project based.  If there is no project then the user is permitted.
    if (!project) return true
    // If it isn't an entity we expect then the user is permitted because we have no say in it.
    if (!provided[2] || !entities.includes(provided[2])) return true
    const userRoles = project?.collaborators?.[userId]?.roles
    const allUserPermissions = (userRoles && userRoles.length) ?
        Array.from(new Set(
            userRoles.flatMap(role => project.roles?.[role])
        )) : []
    // If there are no permissions they will not be permitted.  They might not be in the project.
    let permitted = false
    for (const permission of allUserPermissions) {
        const current = permission.split("_")
        permitted =
            (provided[0] === "ANY" || current[0] === "*" || provided[0] === current[0]) &&
            (provided[1] === "ANY" || current[1] === "*" || provided[1] === current[1]) &&
            (provided[2] === "ANY" || current[2] === "*" || provided[2] === current[2])
        if (permitted) return permitted
    }
    return permitted
}
