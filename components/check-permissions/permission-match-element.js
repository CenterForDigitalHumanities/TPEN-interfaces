/**
 * A custom element <tpen-can> that acts as a wrapper around components and HTML that require permissions.
 * If the permission supplied does not match on any of the permissions a user has for a project,
 * then alterations occur to the wrapped elements.
 *
 * To use directly on an HTML interface include this module with a <script> tag in a <head> element like 
 * <script type="module" src="../../components/check-permissions/permission-match-element.js"></script>
 * Use it like
    <tpen-can tpen-view="ANY_ANY_LINE" tpen-edit="EDIT_*_LINE">
        <tpen-line-component></tpen-line-component>
    </tpen-can>
 *
 * To use within a component, import the <tpen-can> element like
 * import "../components/check-permissions/permission-match-element.js"
 * Use it the same way in the component HTML.  
 */

import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from "../../components/iiif-tools/index.js"
import { permissionMatch } from "../../components/check-permissions/permission-match.js"

export class PermissionMatch extends HTMLElement {
    #entities = [
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

    constructor() {
        super()
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.render(ev.detail))
    }

    connectedCallback() {}

    render(project) {
        // Must have a loaded project with collaborators or we can't check anything
        if(!project || !project?.collaborators || !Object.keys(project.collaborators).length) return
        const userId = getUserFromToken(TPEN.getAuthorization())
        // Must have been on an authenticated interface or we can't check anything
        if(!userId) return
        let canView = true
        let canEdit = true
        if(this.hasAttribute("tpen-view")) {
            canView = permissionMatch(this.getAttribute("tpen-view"), project, userId)
            if(!canView) {
                this.remove()
                // No reason to check tpen-edit.  The element is gone.
                return
            }
        }
        if(this.hasAttribute("tpen-edit")) {
            canEdit = permissionMatch(this.getAttribute("tpen-edit"), project, userId)
            if(!canEdit) {
                // The element itself
                this.classList.add("tpen-readonly")
                this.setAttribute("tpen-readonly", "")
                // Also mark the element's direct children since those are likely to be components that need to know.
                if(this?.children && this.children.length) {
                    Array.from(this.children).forEach(child => {
                        child.classList.add("tpen-readonly")
                        child.setAttribute("tpen-readonly", "")
                    })    
                }
            }
        }
    }
}

customElements.define('tpen-can', PermissionMatch)
