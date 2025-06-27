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
import { minPermissionsCheck } from "../../components/check-permissions/min-permissions-check.js"

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
        let canView = true
        let canEdit = true
        if(this.hasAttribute("tpen-min-view")) {
            canView = minPermissionsCheck(this.getAttribute("tpen-min-view"), project, userId)
            if(!canView) this.remove()
        }
        if(canView && this.hasAttribute("tpen-min-edit")) {
            canEdit = minPermissionsCheck(this.getAttribute("tpen-min-edit"), project, userId)
            if(!canEdit) {
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
}

customElements.define('tpen-can', PermissionCheck)