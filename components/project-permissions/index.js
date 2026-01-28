import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * ProjectPermissions - Displays all project roles and their associated permissions.
 * Requires PERMISSION view access.
 * @element tpen-project-permissions
 */
class ProjectPermissions extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Shows permission message if user lacks PERMISSION view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess('PERMISSION', '*')) {
            this.shadowRoot.innerHTML = `<p>You don't have permission to view project permissions</p>`
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    async render() {
        
        this.shadowRoot.innerHTML = `
            <style>
                .roles-list {
                    margin: 0 auto;
                    padding: 0px 2px;
                    margin-bottom: 10px;
                }
                .roles-list li {
                    font-size: 0.875rem;
                    display: flex;
                    justify-content: flex-start;
                    align-items: start;
                    padding: 5px 0px 5px 20px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    border-radius: 4px;
                    margin-bottom: 10px;
                } 
                .roles-list li #roleID {
                    text-align: left;
                    width: 30%;
                    font-weight: bold;
                    padding: 5px 0px;
                    color: var(--primary-color);
                }
                .roles-list li span .name-ol {
                    gap: 5px;
                    list-style-type: disc;
                    text-align: left;
                }
                .roles-list li span .name-ol .name-li {
                    padding: 5px 0px;
                    font-size: 0.875rem;
                    display: list-item;
                    border-bottom: none;
                    box-shadow: none;
                    margin-bottom: 0px;
                }
            </style>
            <ol class="roles-list"></ol>
        `
        const rolesList = this.shadowRoot.querySelector(".roles-list")
        const group = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/customRoles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            }
        }).then(response => response.json())
        const defaultRoles = {
            OWNER: ["*_*_*"],
            LEADER: ["UPDATE_*_PROJECT", "READ_*_PROJECT", "*_*_MEMBER", "*_*_ROLE", "*_*_PERMISSION", "*_*_LAYER", "*_*_PAGE"],
            CONTRIBUTOR: ["READ_*_*", "UPDATE_TEXT_*", "UPDATE_ORDER_*", "UPDATE_SELECTOR_*", "CREATE_SELECTOR_*", "DELETE_*_LINE", "UPDATE_DESCRIPTION_LAYER", "CREATE_*_LAYER"],
            VIEWER: ["READ_*_PROJECT", "READ_*_MEMBER", "READ_*_LAYER", "READ_*_PAGE", "READ_*_LINE"]
        }
        const roles = { ...defaultRoles, ...group }
        Object.entries(roles || {}).map(([key, value]) => ({
            id: key,
            name: value
        }))
        .forEach(role => {
            rolesList.innerHTML += `
                <li>
                    <span id="roleID">${role.id.charAt(0).toUpperCase() + role.id.slice(1).toLowerCase()}</span>
                    <span>
                        <ol class="name-ol">
                            ${role.name.map(name => 
                            `<li class="name-li">${this.getReadablePermission(name).toLowerCase()}</li>`)
                            .join("")}
                        </ol>
                    </span>
                </li>
            `
        })
    } 
    
    getReadablePermission(permissionString) {
        const [action, scope, entity] = permissionString.split('_')
    
        const actionMap = {
            READ: 'Read',
            UPDATE: 'Update',
            DELETE: 'Delete',
            CREATE: 'Create',
            ALL: 'Full Access to'
        }
        
        const scopeMap = {
            METADATA: 'Metadata',
            TEXT: 'Text',
            ORDER: 'Order',
            CONTENT: "Content",
            OPTIONS: "options",
            SELECTOR: 'Selectors',
            DESCRIPTION: 'Descriptions',
            ALL: 'All Data'
        }
        
        const entityMap = {
            PROJECT: 'Project',
            MEMBER: 'Member',
            LAYER: 'Layer',
            PAGE: 'Page',
            LINE: 'Line',
            ROLE: 'Role',
            TOOL: 'Tools',
            PERMISSION: 'Permission',
            ALL: 'All Entities'
        }
        
        const specialPatterns = {
            [`${action}_${scope}_${entity}`]: `${actionMap[action]} ${scopeMap[scope]} of ${entityMap[entity]}`,
            [`${action}_${scope}_*`]: `${actionMap[action]} ${scopeMap[scope]} of any entity`,
            [`${action}_*_${entity}`]: `${actionMap[action]} all data in ${entityMap[entity]}`,
            [`*_${scope}_${entity}`]: `Manage ${scopeMap[scope]} in ${entityMap[entity]}`,
            [`*_*_${entity}`]: `Manage all data in ${entityMap[entity]}`,
            [`*_${scope}_*`]: `Manage ${scopeMap[scope]} across all entities`,
            [`${action}_*_*`]: `${actionMap[action]} all data in all entities`,
            [`*_*_WILD`]: `Manage all data`,
            [`*_*_*`]: "Full system-wide access"
        }
    
        const key = `${action}_${scope}_${entity}`
        return specialPatterns[key] || `${actionMap[action]} ${scopeMap[scope]} of ${entityMap[entity]}`
    }
}
customElements.define("tpen-project-permissions", ProjectPermissions)
