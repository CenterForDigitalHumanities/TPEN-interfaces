import TPEN from "../../api/TPEN.mjs"

class ProjectPermissions extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode : "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    async render() {
        this.shadowRoot.innerHTML = `
            <style>
                .roles-list {
                    max-height: 180px;
                    overflow-y: auto;
                    margin: 0 auto;
                    padding: 20px 10px;
                }
                .roles-list li {
                    font-size: 0.875rem;
                    display: flex;
                    justify-content: flex-start;
                    align-items: start;
                    padding: 5px 0px;
                    border-bottom: 1px solid #ccc;
                }
                .roles-list li:last-child {
                    border-bottom: none;
                }  
                .roles-list li #roleID {
                    text-align: left;
                    width: 30%;
                    font-weight: bold;
                    padding: 5px 0px;
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
                }
            </style>
            <ol class="roles-list"></ol>
        `
        const rolesList = this.shadowRoot.querySelector(".roles-list")
        if (!TPEN.activeProject) {
            return this.shadowRoot.innerHTML = "No project"
        }
        const project = this.Project ?? TPEN.activeProject
        Object.entries(project.roles || {}).map(([key, value]) => ({
            id: key,
            name: value
        })).filter(role => project.collaborators[this.getAttribute("tpen-user-id")]
        .roles.includes(role.id))
        .forEach(role => {
            rolesList.innerHTML += `
                <li>
                    <span id="roleID">${role.id}</span>
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
            ORDER: 'Ordering',
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