import TPEN from "../../api/TPEN.js"
import CheckPermissions from '../../components/check-permissions/checkPermissions.js'

class ManageRole extends HTMLElement {
    permissions = []
    constructor() {
        super()
        this.attachShadow({ mode : "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    render() {
        const permitted = CheckPermissions.checkAllAccess("role", "*")
        if(!permitted) {
            this.shadowRoot.innerHTML = `<div>You don't have permission to create or edit roles</div>`
            return
        }
        this.shadowRoot.innerHTML = `
            <style>
                .tpen-project-manage-permissions {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #fff;
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin: 2rem auto;
                }

                .permissions-label {
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }

                .role-name-container {
                    display: flex;
                    gap: 0.5rem;
                }

                .text-input {
                    padding: 0.5rem;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    width: 100%;
                    font-size: 1rem;
                }

                .radio-permission {
                    display: none;
                }

                .radio-group {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .radio-btn {
                    padding: 0.5rem 1rem;
                    border: 0.2px solid #ccc;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
                    font-size: 1rem;
                    background-color: #fff;
                    color: #4f46e5;
                    user-select: none;
                    box-shadow: 0 2px 7px rgba(0, 0, 0, 0.1);
                }

                .radio-permission:checked + .radio-btn {
                    background-color: #4f46e5;
                    color: #fff;
                    border-color: #4f46e5;
                }

                .role-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 8px;
                    background-color: #4f46e5;
                    color: #fff;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                    font-size: 1rem;
                }

                .role-btn:hover {
                    background-color: #4338ca;
                }

                .role-btn:disabled {
                    background-color: #a5b4fc;
                    cursor: not-allowed;
                }

                .permissions-actions {
                    display: flex;
                    justify-content: space-between;
                    gap: 0.5rem;
                    margin: 1rem 0 0;
                }

                .reset-permissions {
                    width: 30%;
                }

                .add-permissions {
                    width: 50%;
                }

                .add-role {
                    width: 20%;
                    margin: 0 auto;
                    background-color: green;
                    border-radius: 20px;
                }

                .hide-div {
                    display: none;
                }

                #permissions {
                    padding: 1rem;
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    margin: 1rem 0;
                    font-weight: 600;
                }

                @media (min-width: 800px) {
                    .tpen-project-manage-permissions {
                        width: 90%;
                    }
                }

                @media (min-width: 1000px) {
                    .tpen-project-manage-permissions {
                        width: 70%;
                    }
                } 
            </style>
            <div class="tpen-project-manage-permissions">
                <label class="permissions-label" for="role-name">Enter Role Name:</label>
                <div class="role-name-container">
                    <input class="text-input role-name" type="text" id="role-name" placeholder="Role name">
                    <button class="role-btn edit-role-name hide-div" type="button" id="edit-role-name">Edit</button>
                </div>

                <label class="permissions-label" for="permission">Enter Permission as Text (action_scope_entity):</label>
                <input class="text-input" type="text" id="permission" placeholder="Permission">

                <div id="permissions">List of Permissions: []</div>

                <label class="permissions-label" for="action-permissions">Select an Action Permissions:</label>
                <div class="radio-group">
                    <input class="radio-permission" type="radio" id="action-create" name="action-permissions" value="CREATE">
                    <label for="action-create" class="radio-btn permissions-label">CREATE</label>
                
                    <input class="radio-permission" type="radio" id="action-read" name="action-permissions" value="READ">
                    <label for="action-read" class="radio-btn permissions-label">READ</label>
                
                    <input class="radio-permission" type="radio" id="action-update" name="action-permissions" value="UPDATE">
                    <label for="action-update" class="radio-btn permissions-label">UPDATE</label>
                
                    <input class="radio-permission" type="radio" id="action-delete" name="action-permissions" value="DELETE">
                    <label for="action-delete" class="radio-btn permissions-label">DELETE</label>
                
                    <input class="radio-permission" type="radio" id="action-all" name="action-permissions" value="*">
                    <label for="action-all" class="radio-btn permissions-label">ALL</label>
                </div>

                <label class="permissions-label" for="scope-permissions">Select a Scope Permissions:</label>
                <div class="radio-group">
                    <input class="radio-permission" type="radio" id="scope-metadata" name="scope-permissions" value="METADATA">
                    <label for="scope-metadata" class="radio-btn permissions-label">METADATA</label>

                    <input class="radio-permission" type="radio" id="scope-text" name="scope-permissions" value="TEXT">
                    <label for="scope-text" class="radio-btn permissions-label">TEXT</label>

                    <input class="radio-permission" type="radio" id="scope-content" name="scope-permissions" value="CONTENT">
                    <label for="scope-content" class="radio-btn permissions-label">CONTENT</label>
                    
                    <input class="radio-permission" type="radio" id="scope-options" name="scope-permissions" value="OPTIONS">
                    <label for="scope-options" class="radio-btn permissions-label">OPTIONS</label>

                    <input class="radio-permission" type="radio" id="scope-order" name="scope-permissions" value="ORDER">
                    <label for="scope-order" class="radio-btn permissions-label">ORDER</label>

                    <input class="radio-permission" type="radio" id="scope-selector" name="scope-permissions" value="SELECTOR">
                    <label for="scope-selector" class="radio-btn permissions-label">SELECTOR</label>

                    <input class="radio-permission" type="radio" id="scope-description" name="scope-permissions" value="DESCRIPTION">
                    <label for="scope-description" class="radio-btn permissions-label">DESCRIPTION</label>

                    <input class="radio-permission" type="radio" id="scope-all" name="scope-permissions" value="*">
                    <label for="scope-all" class="radio-btn permissions-label">ALL</label>
                </div>

                <label class="permissions-label" for="entity-permissions">Select an Entity Permissions:</label>
                <div class="radio-group">
                    <input class="radio-permission" type="radio" id="entity-project" name="entity-permissions" value="PROJECT">
                    <label for="entity-project" class="radio-btn permissions-label">PROJECT</label>

                    <input class="radio-permission" type="radio" id="entity-member" name="entity-permissions" value="MEMBER">
                    <label for="entity-member" class="radio-btn permissions-label">MEMBER</label>

                    <input class="radio-permission" type="radio" id="entity-layer" name="entity-permissions" value="LAYER">
                    <label for="entity-layer" class="radio-btn permissions-label">LAYER</label>

                    <input class="radio-permission" type="radio" id="entity-page" name="entity-permissions" value="PAGE">
                    <label for="entity-page" class="radio-btn permissions-label">PAGE</label>

                    <input class="radio-permission" type="radio" id="entity-line" name="entity-permissions" value="LINE">
                    <label for="entity-line" class="radio-btn permissions-label">LINE</label>

                    <input class="radio-permission" type="radio" id="entity-role" name="entity-permissions" value="ROLE">
                    <label for="entity-role" class="radio-btn permissions-label">ROLE</label>

                    <input class="radio-permission" type="radio" id="entity-permission" name="entity-permissions" value="PERMISSION">
                    <label for="entity-permission" class="radio-btn permissions-label">PERMISSION</label>

                    <input class="radio-permission" type="radio" id="entity-tools" name="entity-permissions" value="TOOL">
                    <label for="entity-tools" class="radio-btn permissions-label">TOOL</label>

                    <input class="radio-permission" type="radio" id="entity-all" name="entity-permissions" value="*">
                    <label for="entity-all" class="radio-btn permissions-label">ALL</label>
                </div>
            
                <div class="permissions-actions">
                    <button class="role-btn reset-permissions" id="resetPermissions">Reset Permissions</button>
                    <button class="role-btn add-permissions" id="add-permissions">Add Permissions to List</button>
                </div>
                <button class="role-btn add-role hide-div" id="add-role">Save Role</button>
            </div>
        `

        this.shadowRoot.getElementById('add-role').addEventListener('click', () => this.addRole())
        this.shadowRoot.getElementById("add-permissions").addEventListener('click', () => this.addPermissions())
        this.shadowRoot.getElementById("resetPermissions").addEventListener('click', () => this.resetPermissions())
        this.shadowRoot.getElementById("edit-role-name").addEventListener('click', () => this.editRoleName())
    }

    editRoleName() {
        const role = this.shadowRoot.getElementById('role-name')
        role.disabled = false
    }

    checkedValues() {
        let action = this.shadowRoot.querySelector('input[name="action-permissions"]:checked')
        let scope = this.shadowRoot.querySelector('input[name="scope-permissions"]:checked')
        let entity = this.shadowRoot.querySelector('input[name="entity-permissions"]:checked')

        if (action) {
            action.checked = false
        }
        
        if (scope) {
            scope.checked = false
        }
        
        if (entity) {
            entity.checked = false
        }
    }

    resetPermissions() {
        let permissionString = this.shadowRoot.getElementById('permission')
        const permissionsDiv = this.shadowRoot.getElementById('permissions')
        const role = this.shadowRoot.getElementById('role-name')
    
        this.permissions = []
        role.value = ''
        role.disabled = false
        this.checkedValues()
        permissionString.value = ''
        permissionsDiv.innerHTML = 'Permissions List: []'
        this.shadowRoot.getElementById('edit-role-name').classList.add('hide-div')
        this.shadowRoot.getElementById('add-role').classList.add('hide-div')
    }

    isValidPermissionText(permissionText) {
        const regex = /^[A-Za-z]+$/
        return regex.test(permissionText)
    }

    inPermissionList(permissionValue) {
        return this.permissions.includes(permissionValue)
    }

    checkRoleName() {
        const role = this.shadowRoot.getElementById('role-name')
        const defaultRoles = ['OWNER', 'LEADER', 'CONTRIBUTOR', 'VIEWER']
        return defaultRoles.includes(role.value)
    }

    checkExistingRole() {
        const role = this.shadowRoot.getElementById('role-name')
        const existingRoles = Object.keys(TPEN.activeProject.roles)
        return existingRoles.includes(role.value)
    }

    addPermissions() {
        let permissionString = this.shadowRoot.getElementById('permission')
        const permissionsDiv = this.shadowRoot.getElementById('permissions')
        const role = this.shadowRoot.getElementById('role-name')
        let action = this.shadowRoot.querySelector('input[name="action-permissions"]:checked')
        let scope = this.shadowRoot.querySelector('input[name="scope-permissions"]:checked')
        let entity = this.shadowRoot.querySelector('input[name="entity-permissions"]:checked')

        if (role.value) {
            if (this.checkRoleName()) {
                role.value = ''
                permissionString.value = ''
                this.checkedValues()
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: 'Default roles cannot be edited',
                        status: 500
                    }
                })
                return TPEN.eventDispatcher.dispatch(toast)
            }
            if (this.checkExistingRole()) {
                role.value = ''
                permissionString.value = ''
                this.checkedValues()
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: 'Role already exists',
                        status: 500
                    }
                })
                return TPEN.eventDispatcher.dispatch(toast)
            }
            this.shadowRoot.getElementById('edit-role-name').classList.remove('hide-div')
            role.disabled = true
        }

        if (!action && !scope && !entity && !permissionString.value) {
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: 'Please select an action, scope, entity or permission text',
                    status: 500
                }
            })
            return TPEN.eventDispatcher.dispatch(toast)
        }

        if (permissionString.value && !this.isValidPermissionText(permissionString.value)) {
            permissionString.value = ''
            this.checkedValues()
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: 'Invalid permission text',
                    status: 500
                }
            })
            return TPEN.eventDispatcher.dispatch(toast)
        }

        if (permissionString.value) {
            if (this.inPermissionList(permissionString.value)) {
                permissionString.value = ''
                this.checkedValues()
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: 'Permission already in list',
                        status: 500
                    }
                })
                return TPEN.eventDispatcher.dispatch(toast)
            }
            this.permissions.push(permissionString.value)
            permissionString.value = ''
            permissionsDiv.innerText = `Permissions List: [${this.permissions}]`
        }

        if (action || scope || entity) {
            if (!action || !scope || !entity) {
                permissionString.value = ''
                this.checkedValues()
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: 'Please select an action, scope and entity',
                        status: 500
                    }
                })
                return TPEN.eventDispatcher.dispatch(toast)
            }
        }

        if (action && scope && entity) {
            if (this.inPermissionList(`${action.value}_${scope.value}_${entity.value}`)) {
                action.checked = false
                scope.checked = false
                entity.checked = false
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: 'Permission already in list',
                        status: 500
                    }
                })
                return TPEN.eventDispatcher.dispatch(toast)
            }
            this.permissions.push(`${action.value}_${scope.value}_${entity.value}`)
            action.checked = false
            scope.checked = false
            entity.checked = false
            permissionsDiv.innerText = `Permissions List: [${this.permissions}]`
        }

        if(this.permissions.length > 0) {
            this.shadowRoot.getElementById('add-role').classList.remove('hide-div')
        }
    }

    async addRole() {
        const role = this.shadowRoot.getElementById('role-name')
 
        if (!role.value) {
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: 'Role name is required',
                    status: 500
                }
            })
            return TPEN.eventDispatcher.dispatch(toast)
        }

        if (this.checkRoleName()) {
            role.value = ''
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: 'Default roles cannot be edited',
                    status: 500
                }
            })
            return TPEN.eventDispatcher.dispatch(toast)
        }

        if (this.checkExistingRole()) {
            role.value = ''
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: 'Role already exists',
                    status: 500
                }
            })
            return TPEN.eventDispatcher.dispatch(toast)
        }

        if (this.permissions.length === 0) {
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: 'At least one permission is required',
                    status: 500
                }
            })
            return TPEN.eventDispatcher.dispatch(toast)
        }

        await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/addCustomRoles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            },
            body: JSON.stringify({
                roles: {
                    [role.value]: this.permissions
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: `Custom role added successfully`
                    }
                })
                TPEN.eventDispatcher.dispatch(toast)
            }
        })
        .catch(error => {
            const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: `Error fetching projects: ${error.message}`,
                    status: error.status
                }
            })
            TPEN.eventDispatcher.dispatch(toast)
        })
    }


}

customElements.define('tpen-manage-role', ManageRole)
