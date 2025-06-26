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
 * Gather all elements with the tpen-min-view or tpen-min-edit attributes.
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
    const elements = document.querySelectorAll("[tpen-min-view],[tpen-min-edit]")
    // Why are you using this module if there are no elements to check?
    if(!elements || elements.length === 0) return
    for (const element of elements) {
        let rendered = true
        if(element.hasAttribute("tpen-min-view")) rendered = renderCheck(element, project, userId)
        if(rendered && element.hasAttribute("tpen-min-edit")) editCheck(element, project, userId)
    }
}

/**
 * Process a tpen-min-read attribute on a element.
 * If the logged in user does not have at least the minimum permission, then remove the component element.
 * A minimum permission value may include the key word "ANY" for action, scope, or entity.
 *
 * @param element - The HTML Element to check.
 * @param project - A TPEN3 Project from a tpen-project-loaded event payload.
 * @param userId - A TPEN3 User id hash from the user encoded in a idToken.
 */
function renderCheck(element, project, userId) {
    const minPermission = element.getAttribute('tpen-min-view')
    // Can't process malformed permission so it is allowed to render.  The value should be a single action_scope_entity string.
    if(minPermission.includes(",") || !minPermission.split("_").length === 3) return true
    const minAction = minPermission.split("_")[0].toUpperCase()
    const minScope = minPermission.split("_")[1].toUpperCase()
    const minEntity = minPermission.split("_")[2].toUpperCase()
    // Can't check if we don't understand the entity so it is allowed to render.  
    if(!minEntity || !entities.includes(minEntity)) return true
    const userRoles = project?.collaborators?.[userId]?.roles
    const allPermissions = Array.from(new Set(
        userRoles.flatMap(role => project.roles[role])
    ))
    // They will not be able to render if they have no roles/permissions
    const canRead = allPermissions.includes("*_*_*") ? true : 
        allPermissions.filter(p => {
            const action = p.split("_")[0]
            const scope = p.split("_")[1]
            const entity = p.split("_")[2]
            return (minAction === "ANY" || action === "*" || action === minAction)
                && (minScope === "ANY" || scope === "*" || scope === minScope )
                && (minEntity === "ANY" || entity === "*" || entity === minEntity)
        }).length > 0
    if(!canRead) element.remove()
    return canRead
}

/**
 * Process a tpen-min-read attribute on a element.
 * If the logged in user does not have at least the minimum permission, then disables all inputs and buttons in the component element.
 * A minimum permission value may include the key word "ANY" for action, scope, or entity.
 *
 * @param element - The HTML Element to check.
 * @param project - A TPEN3 Project from a tpen-project-loaded event payload.
 * @param userId - A TPEN3 User id hash from the user encoded in a idToken.
 */
function editCheck(element, project, userId) {
    const minPermission = element.getAttribute('tpen-min-edit')
    // Can't process malformed permission so they are allowed to edit.
    if(minPermission.includes(",") || !minPermission.split("_").length === 3) return true
    const minAction = minPermission.split("_")[0].toUpperCase()
    const minScope = minPermission.split("_")[1].toUpperCase()
    const minEntity = minPermission.split("_")[2].toUpperCase()
    // Can't check if we don't understand the entity so they are allowed to edit.
    if(!minEntity || !entities.includes(minEntity)) return true
    const userRoles = project?.collaborators?.[userId]?.roles
    const allPermissions = Array.from(new Set(
        userRoles.flatMap(role => project.roles[role])
    ))
    // They will not be able to edit if they have no roles/permissions
    const canWrite = allPermissions.includes("*_*_*") ? true : 
        allPermissions.filter(p => {
            const action = p.split("_")[0]
            const scope = p.split("_")[1]
            const entity = p.split("_")[2]
            return (minAction === "ANY" || action === "*" || action === minAction)
                && (minScope === "ANY" || scope === "*" || scope === minScope )
                && (minEntity === "ANY" || entity === "*" || entity === minEntity)
        }).length > 0
    if(!canWrite) {
        // The element itself
        element.querySelectorAll("input,textarea,select,button,.button").forEach(e => e.setAttribute("disabled", ""))
        Array.from(element.children).forEach(child => {
            // Direct children of the element
            child.querySelectorAll("input,textarea,select,button,.button").forEach(e => e.setAttribute("disabled", ""))
            // The shadowRoot of the direct children of the element
            child.shadowRoot.querySelectorAll("input,textarea,select,button,.button").forEach(e => e.setAttribute("disabled", ""))
        })
    }
    return canWrite
}
