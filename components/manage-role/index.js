import TPEN from "../../api/TPEN.js"
import CheckPermissions from '../../components/check-permissions/checkPermissions.js'

class ManageRole extends HTMLElement {
    permissions = []
    isExistingRole = false
    constructor() {
        super()
        this.attachShadow({ mode : "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    async render() {
        const permitted = CheckPermissions.checkAllAccess("role", "*")
        if(!permitted) {
            this.shadowRoot.innerHTML = `<div>You don't have permission to create or edit roles</div>`
            return
        }
        const group = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/customRoles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            }
        }).then(response => response.json())
        this.shadowRoot.innerHTML = `
            <style>
                h3 {
                    margin-bottom: 20px;
                    font-size: 24px;
                    color: var(--text-primary);
                    margin-left: 10px;
                }

                .xyz {
                    display: flex;
                    gap: 8px;
                    margin: 0 auto;
                }

                .abc {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: var(--white);
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    width: 40%;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .tpen-project-manage-permissions {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: var(--white);
                    padding: 2rem;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    width: 60%;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .card-title {
                    margin: 0px;
                    margin-bottom: 10px;
                    font-size: 24px;
                    color: var(--primary-color);
                }

                .permissions-label {
                    font-weight: 600;
                }

                .text-input::placeholder {
                    font-size: 15px;
                    color: var(--text-muted);
                    font-style: italic;
                }

                .role-name-container {
                    display: flex;
                    gap: 0.5rem;
                }

                .text-input {
                    padding: 0.5rem;
                    border: 1px solid var(--light-gray);
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
                    padding: 0.2rem 0.5rem;
                    border: 0.2px solid var(--light-gray);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
                    font-size: 15px;
                    background-color: var(--white);
                    color: var(--primary-color);
                    user-select: none;
                    box-shadow: 0 2px 7px rgba(0, 0, 0, 0.1);
                }

                .radio-permission:checked + .radio-btn {
                    background-color: var(--primary-color);
                    color: var(--white);
                    border-color: var(--primary-color);
                }

                .role-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 8px;
                    background-color: var(--primary-color);
                    color: var(--white);
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                    font-size: 1rem;
                }

                .role-btn:disabled {
                    background-color: var(--gray);
                    cursor: not-allowed;
                }

                .permissions-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    margin: 1rem 0 0;
                }

                .hide-div {
                    display: none;
                }

                #permissions {
                    padding: 1rem;
                    background-color: var(--light-color);
                    border: 1px solid var(--light-gray);
                    border-radius: 6px;
                    font-size: 0.9rem;
                    margin: 1rem 0;
                    font-weight: 600;
                }

                .roles-list {
                    margin: 0 auto;
                    padding: 0px 2px;
                    margin-bottom: 10px;
                    width: 100%;
                }

                .roles-list .role-li {
                    font-size: 0.875rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    padding: 5px 20px 5px 20px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    border-radius: 4px;
                    margin-bottom: 10px;
                    cursor: pointer;
                } 
                
                .roles-list .role-li #roleID {
                    text-align: left;
                    width: 30%;
                    font-weight: bold;
                    padding: 5px 0px;
                    color: var(--primary-color);
                }

                .role-ol {
                    width: 60%;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                
                .roles-list .role-li span .name-ol {
                    gap: 5px;
                    list-style-type: disc;
                    text-align: left;
                }
                
                .roles-list .role-li span .name-ol .name-li {
                    padding: 5px 0px;
                    font-size: 0.875rem;
                    display: list-item;
                    border-bottom: none;
                    box-shadow: none;
                    margin-bottom: 0px;
                }
                
                .remove-field-btn {
                    background-color: var(--error-color);
                    color: var(--white);
                    border: none;
                    cursor: pointer;
                    border-radius: 4px;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    margin: auto;
                    padding: 4px;
                    z-index: 10;
                }

                .remove-field-btn:hover {
                    background-color: var(--accent);
                }

                .icon {
                    width: 18px;
                    height: 18px;
                }

                @media (min-width: 800px) {
                    .tpen-project-manage-permissions {
                        width: 90%;
                    }
                }

                @media (min-width: 1000px) {
                    .tpen-project-manage-permissions {
                        width: 60%;
                    }
                }

                #projectManagementBtn {
                    position: absolute;
                    display: none;
                    background-color: var(--primary-color);
                    padding: 10px 20px;
                    color: var(--white);
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                #projectManagementBtn:hover {
                  background-color: var(--primary-light);
                }

                #projectManagementBtn span {
                  position: relative;
                  left: -10px;
                  display: inline-block;
                  transform: rotate(180deg);
                  -webkit-transform: rotate(180deg);
                  -moz-transform: rotate(180deg);
                  -o-transform: rotate(180deg);
                  -ms-transform: rotate(180deg);
                }
            </style>
            <h3>Edit Roles & Permissions</h3>
            <div class="xyz">
                <div class="abc">
                    <h3 class="card-title">Update/Delete Custom Roles</h3>
                    <ol class="roles-list"></ol>
                </div>
                <div class="tpen-project-manage-permissions">
                    <h3 class="card-title">Add Custom Roles</h3>
                    <label class="permissions-label" for="role-name">Enter Role Name:</label>
                    <div class="role-name-container">
                        <input class="text-input role-name" type="text" id="role-name" placeholder="Role name">
                        <button class="role-btn edit-role-name hide-div" type="button" id="edit-role-name">Edit</button>
                    </div>

                    <label class="permissions-label" for="permission">Enter Permission as Text (action_scope_entity):</label>
                    <div class="role-name-container">
                        <input class="text-input" type="text" id="permission" placeholder="Permission">
                    </div>

                    <div id="permissions">List of Permissions: 
                        <ol class="name-ol" style="margin: 0; list-style-type: disc;"></ol>
                    </div>

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
                        <button class="role-btn hide-div" id="save-role">Save Role</button>
                        <button class="role-btn hide-div" id="update-role">Update Role</button>
                    </div>
                </div>
            </div>
            <button id="projectManagementBtn"><span>↪</span> Go to Project Management</button>
        `

        this.shadowRoot.getElementById("add-permissions").addEventListener('click', () => this.addPermissions(group))
        this.shadowRoot.getElementById("resetPermissions").addEventListener('click', () => this.resetPermissions())
        this.shadowRoot.getElementById("edit-role-name").addEventListener('click', () => this.editRoleName())
        this.shadowRoot.getElementById("save-role").addEventListener('click', () => this.addRole(group))
        this.shadowRoot.getElementById("update-role").addEventListener('click', () => this.updateRole(group))
        if (await CheckPermissions.checkEditAccess("project")) {
            this.shadowRoot.getElementById("projectManagementBtn").addEventListener('click', () => document.location.href = `/project/manage?projectID=${TPEN.screen.projectInQuery}`)
        }

        const rolesList = this.shadowRoot.querySelector(".roles-list")
        Object.entries(group || {}).map(([key, value]) => ({ id: key, name: value }))
        .filter(role => !['OWNER', 'LEADER', 'VIEWER', 'CONTRIBUTOR'].includes(role.id.toUpperCase()))
        .forEach(role => {
            rolesList.innerHTML += `
                <li class="role-li">
                    <span id="roleID">${role.id.toUpperCase()}</span>
                    <span class="role-ol">
                        <ol class="name-ol">
                            ${role.name.map(name => 
                                `<li class="name-li">${this.getReadablePermission(name).toLowerCase()}</li>`)
                            .join("")}
                        </ol>
                    </span>
                    <button type="button" class="remove-field-btn">
                        <img class="icon" src="../../assets/icons/delete.png" alt="Remove" />
                    </button>
                </li>
            `

            this.shadowRoot.querySelectorAll(".role-li .remove-field-btn").forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation()
                    const roleLi = btn.closest("li")
                    this.shadowRoot.getElementById('role-name').value = ''
                    this.permissions = []
                    const roleId = roleLi.querySelector("#roleID").textContent.toUpperCase()
                    await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/removeCustomRoles`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${TPEN.getAuthorization()}`
                        },
                        body: JSON.stringify({ roles: [roleId] })
                    }).then(response => {
                        TPEN.eventDispatcher.dispatch("tpen-toast", response.ok ? { status: "info", message: 'Successfully Removed Role' } : { status: "error", message: 'Error Removing Role' })
                    })
                    this.render()
                })
            })

            this.shadowRoot.querySelectorAll(".roles-list li").forEach(li => {
                li.addEventListener('click', () => this.updateRolePermissions(group, li))
            })
        })
    }

    updateRolePermissions(group, selectedRole) {
        this.shadowRoot.getElementById('role-name').value = selectedRole.querySelector('#roleID').textContent
        this.permissions = []
        this.isExistingRole = true
        const key = Object.keys(group).find(k => k.toUpperCase() === selectedRole.querySelector('#roleID').textContent.toUpperCase())
        this.permissions.push(...(group[key] || []))
        const ol = this.shadowRoot.getElementById('permissions').querySelector('.name-ol')
        ol.innerHTML = this.permissions.map(p => `
            <li class="name-li" style="justify-content: space-between; width: 100%; display: flex; align-items: center; padding: 5px 0; list-style-type: disc;">
                    <span>${p}</span>
                    <button type="button" class="remove-field-btn" style="display: inline !important; margin: 0;">
                        <!-- Icon source: https://www.flaticon.com/free-icons/delete by Freepik -->
                        <img class="icon" src="../../assets/icons/delete.png" alt="Remove" />
                    </button>
                </li>`).join('')

        this.shadowRoot.getElementById('edit-role-name').classList.remove('hide-div')
        this.shadowRoot.getElementById('update-role').classList.remove('hide-div')
        this.shadowRoot.getElementById('save-role').classList.add('hide-div')

        this.shadowRoot.querySelectorAll(".remove-field-btn").forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation()
                const li = btn.closest("li")
                const permissionText = li.querySelector("span").textContent
                this.permissions = this.permissions.filter(p => p !== permissionText)
                li.remove()
            })
        })
    }

    async updateRole(group) {
        const role = this.shadowRoot.getElementById('role-name')
        if (!role.value) return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'No role selected for update' })

        Object.keys(group || {}).forEach(key => {
            if (key.toUpperCase() === role.value.toUpperCase()) {
                group[key] = this.permissions
            }
        })

        await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/updateCustomRoles`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            },
            body: JSON.stringify({ roles: group })
        }).then(response => {
            if (response.ok) {
                TPEN.eventDispatcher.dispatch("tpen-toast", { status: "info", message: 'Successfully Updated Role' })
                this.render()
            } else {
                TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Error Updating Role' })
            }
        }).catch(error => {
            TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: `Error updating role: ${error.message}` })
        })

        this.resetPermissions()
        role.value = ''
        this.permissions = []
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

    editRoleName() {
        this.shadowRoot.getElementById('role-name').disabled = false
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
        this.isExistingRole = false
        this.permissions = []
        this.shadowRoot.getElementById('save-role').classList.add('hide-div')
        this.shadowRoot.getElementById('update-role').classList.add('hide-div')
        this.shadowRoot.getElementById('role-name').value = ''
        this.shadowRoot.getElementById('role-name').disabled = false
        this.shadowRoot.getElementById('permission').value = ''
        this.shadowRoot.querySelector('.name-ol').innerHTML = ''
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

    checkExistingRole(group) {
        const role = this.shadowRoot.getElementById('role-name')
        const existingRoles = Object.keys(group || {}).map(key => key.toUpperCase())
        return existingRoles.includes(role.value.toUpperCase() )
    }

    addPermissions(group) {
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
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Default roles cannot be edited' })
            }
            if (!this.isExistingRole) {
                if (this.checkExistingRole(group)) {
                    role.value = ''
                    permissionString.value = ''
                    this.checkedValues()
                    return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Role already exists' })
                }
            }
            this.shadowRoot.getElementById('edit-role-name').classList.remove('hide-div')
            role.disabled = true
        }

        if (!action && !scope && !entity && !permissionString.value) {
            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please select an action, scope, entity or permission text' })
        }

        if (permissionString.value && !this.isValidPermissionText(permissionString.value)) {
            permissionString.value = ''
            this.checkedValues()
            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Invalid permission text' })
        }

        if (permissionString.value) {
            if (this.inPermissionList(permissionString.value)) {
                permissionString.value = ''
                this.checkedValues()
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Permission already in list' })
            }
            this.permissions.push(permissionString.value)
            permissionString.value = ''
            permissionsDiv.innerText = `Permissions List: [${this.permissions}]`
        }

        if (action || scope || entity) {
            if (!action || !scope || !entity) {
                permissionString.value = ''
                this.checkedValues()
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please select an action, scope and entity' })
            }
        }

        if (action && scope && entity) {
            if (this.inPermissionList(`${action.value}_${scope.value}_${entity.value}`)) {
                action.checked = false
                scope.checked = false
                entity.checked = false
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Permission already in list' })
            }
            this.permissions.push(`${action.value}_${scope.value}_${entity.value}`)
            action.checked = false
            scope.checked = false
            entity.checked = false
            const permissionsOl = this.shadowRoot.getElementById('permissions').querySelector('.name-ol')
            const newPermissionLi = 
                `<li class="name-li" style="justify-content: space-between; width: 100%; display: flex; align-items: center; padding: 5px 0; list-style-type: disc;">
                    <span>${action.value}_${scope.value}_${entity.value}</span>
                    <button type="button" class="remove-field-btn" style="display: inline !important; margin: 0;">
                        <!-- Icon source: https://www.flaticon.com/free-icons/delete by Freepik -->
                        <img class="icon" src="../../assets/icons/delete.png" alt="Remove" />
                    </button>
                </li>`
            if (permissionsOl.innerHTML.length > 0) {
                permissionsOl.innerHTML += newPermissionLi
            }
            else {
                permissionsOl.innerHTML = newPermissionLi
            }

            this.shadowRoot.querySelectorAll(".remove-field-btn").forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    const li = btn.closest("li")
                    const permissionText = li.querySelector("span").textContent
                    this.permissions = this.permissions.filter(p => p !== permissionText)
                    li.remove()
                })
            })
        }

        const saveBtn = this.shadowRoot.getElementById('save-role')
        const updateBtn = this.shadowRoot.getElementById('update-role')

        if (this.isExistingRole) {
            saveBtn.classList.add('hide-div')
            updateBtn.classList.remove('hide-div')
        } else {
            saveBtn.classList.remove('hide-div')
            updateBtn.classList.add('hide-div')
        }
    }

    async addRole(group) {
        const role = this.shadowRoot.getElementById('role-name')
 
        if (!role.value) {
            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Role name is required' })
        }

        if (this.checkRoleName()) {
            role.value = ''
            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Default roles cannot be edited' })
        }

        if (this.checkExistingRole(group)) {
            role.value = ''
            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Role already exists' })
        }

        if (this.permissions.length === 0) {
            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'At least one permission is required' })
        }

        await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/addCustomRoles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            },
            body: JSON.stringify({
                roles: {
                    [role.value.toUpperCase()]: this.permissions
                }
            })
        })
        .then(response => {
            if (response.ok) {
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "info", message: 'Custom role added successfully' })
            }
        })
        .catch(error => {
            TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: `Error adding role: ${error.message}` })
        })

        this.resetPermissions()
        this.render()
    }
}

customElements.define('tpen-manage-role', ManageRole)
