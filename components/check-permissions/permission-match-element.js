/**
 * A custom element <tpen-can> that acts as a wrapper around components and HTML that require permissions.
 * If the permission supplied does not match on any of the permissions a user has for a project,
 * then alterations occur to the wrapped elements.  This is processed once when it is loaded
 * and does not listen for changes.
 *
 * Use the tpen-view attribute to check if the component should be removed as unviewable.
 * Use the tpen-edit attribute to check if the component should be read-only as uneditable.  
 * - If the attribute is not present or is invalid they are considered permitted.
 *
 * To use directly on an HTML interface include this module with a <script> tag in a <head> element like 
 * <script type="module" src="../../components/check-permissions/permission-match-element.js"></script>
 *
 * Ex. Show a tpen-line-component if a user has any Line permissions.  Make it read-only if the user cannot update all Line scopes.
    <tpen-can tpen-view="ANY_ANY_LINE" tpen-edit="UPDATE_*_LINE">
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
    // TODO use these from a central location, such as a Permission Class.
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
    #viewPermission = null
    #editPermission = null

    constructor() {
        super()
        this.#viewPermission = this.getAttribute("tpen-view")
        this.#editPermission = this.getAttribute("tpen-edit")
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.render(ev.detail))
    }

    connectedCallback() {}

    render(project) {
        // Must have a loaded project with collaborators or we can't check anything
        if (!project?.collaborators || !Object.keys(project.collaborators).length) return
        const userId = getUserFromToken(TPEN.getAuthorization())
        // Must have been on an authenticated interface or we can't check anything
        if (!userId) return
        const canEdit = this.#editPermission ? permissionMatch(this.#editPermission, project, userId) : true
        if (!canEdit) {
            // The element itself
            this.classList.add("tpen-readonly")
            this.setAttribute("tpen-readonly", "")
            // Also mark the element's direct children since those are likely to be components that need to know.
            if (this.children?.length) {
                Array.from(this.children).forEach(child => {
                    child.classList.add("tpen-readonly")
                    child.setAttribute("tpen-readonly", "")
                })
            }
        }
        // If they can edit, then they can view.
        const canView = 
            canEdit ? true 
            : this.#viewPermission ? permissionMatch(this.#viewPermission, project, userId) 
            : true
        // Removes the element (along with everything in it, of course)
        if (!canView) this.remove() 
    }
}

customElements.define('tpen-can', PermissionMatch)
