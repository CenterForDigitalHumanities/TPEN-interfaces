/**
 * This custom element is intended for use directly on an HTML interface or within in components.
 * Include it with a <script> tag in a <head> element like 
 * <script type="module" src="../../components/check-permissions/min-permissions-element.js"></script>
 * or import it into your component like
 * import "../../components/check-permissions/min-permissions-element.js"
 * Use it like
    <tpen-can tpen-min-view="ANY_ANY_LINES" tpen-min-edit="EDIT_*_LINES">
        <tpen-line-annotator></tpen-line-annotator>
    </tpen-can>
 * All direct children of the <tpen-can>, including their shadowRoot, will be affected.
 */

import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from "../../components/iiif-tools/index.js"

export class PermissionCheck extends HTMLElement {
    #entities = [
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

    constructor() {
        super()
        TPEN.attachAuthentication(this)
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.render(ev.detail))
    }

    render(project) {
        // Must have a loaded project or we can't do anything
        if(!project) return
        const userId = getUserFromToken(TPEN.getAuthorization())
        // Must have been on an authenticated interface or we can't do anything
        if(!userId) return
        let view = true
        let edit = true
        if(this.hasAttribute("tpen-min-view")) {
            view = this.check(this.getAttribute("tpen-min-view"), project, userId)
            if(!view) this.remove()
        }
        if(view && this.hasAttribute("tpen-min-edit")) {
            edit = this.check(this.getAttribute("tpen-min-edit"), project, userId)
            if(!edit) {
                // The element itself
                this.querySelectorAll("input,textarea,select,button,.button").forEach(e => e.setAttribute("disabled", ""))
                Array.from(this.children).forEach(child => { 
                    // Direct children of the element
                    child.querySelectorAll("input,textarea,select,button,.button").forEach(e => e.setAttribute("disabled", ""))
                    // The shadowRoot of the direct children of the element.
                    child.shadowRoot.querySelectorAll("input,textarea,select,button,.button").forEach(e => e.setAttribute("disabled", ""))
                })  
            }
        }
    }

    /**
     * Check if the user has the minimum permissions for the project.
     * A minimum permission value may include the key word "ANY" for action, scope, or entity.
     *
     * @param minPermissions - A action_scope_entity string representing a single minimum permission.
     * @param project - A TPEN3 Project from a tpen-project-loaded event payload.
     * @param userId - A TPEN3 User id hash from the user encoded in a idToken.
     * @return boolean
     */
    check(minPermission, project, userId) {
        // Can't process malformed permission so it is allowed to render.  The value should be a single action_scope_entity string.
        if(!minPermission || minPermission.includes(",") || !minPermission.split("_").length === 3) return true
        const minAction = minPermission.split("_")[0].toUpperCase()
        const minScope = minPermission.split("_")[1].toUpperCase()
        const minEntity = minPermission.split("_")[2].toUpperCase()
        // Can't check if we don't understand the entity so it is allowed to render.  
        if(!minEntity || !this.#entities.includes(minEntity)) return true
        const userRoles = project?.collaborators?.[userId]?.roles
        const allPermissions = Array.from(new Set(
            userRoles.flatMap(role => project.roles[role])
        ))
        return allPermissions.filter(p => {
            const action = p.split("_")[0]
            const scope = p.split("_")[1]
            const entity = p.split("_")[2]
            return (minAction === "ANY" || action === "*" || action === minAction)
                && (minScope === "ANY" || scope === "*" || scope === minScope )
                && (minEntity === "ANY" || entity === "*" || entity === minEntity)
        }).length > 0
    }
}

customElements.define('tpen-can', PermissionCheck)