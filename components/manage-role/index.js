import TPEN from "../../api/TPEN.mjs"

TPEN.eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.body
TPEN.attachAuthentication(container)

let permissions = []
let permissionString = document.getElementById('permission')
const permissionsDiv = document.getElementById('permissions')
const role = document.getElementById('role-name')

document.getElementById('add-role').addEventListener('click', () => addRole())
document.getElementById("add-permissions").addEventListener('click', () => addPermissions())
document.getElementById("resetPermissions").addEventListener('click', () => resetPermissions())
document.getElementById("edit-role-name").addEventListener('click', () => editRoleName())

function render() {
    document.querySelector('.tpen-project-manage-permissions').setAttribute('tpen-project-id', TPEN.screen.projectInQuery)
}

function editRoleName() {
    role.disabled = false
}

function checkedValues() {
    let action = document.querySelector('input[name="action-permissions"]:checked')
    let scope = document.querySelector('input[name="scope-permissions"]:checked')
    let entity = document.querySelector('input[name="entity-permissions"]:checked')

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

function resetPermissions() {
    permissions = []
    role.value = ''
    role.disabled = false
    checkedValues()
    permissionString.value = ''
    permissionsDiv.innerHTML = 'Permissions List: []'
    document.getElementById('edit-role-name').classList.add('hide-div')
    document.getElementById('add-role').classList.add('hide-div')
}

function isValidPermissionText(permissionText) {
    const regex = /^[A-Z*]+_[A-Z*]+_[A-Z*]+$/
    return regex.test(permissionText)
}

function inPermissionList(permissionValue) {
    if (permissions.includes(permissionValue)) {
        return true
    }
    return false
}

function checkRoleName() {
    const defaultRoles = ['OWNER', 'LEADER', 'CONTRIBUTOR', 'VIEWER']
    if (defaultRoles.includes(role.value)) {
        return true
    }
    return false
}

function checkExistingRole() {
    const existingRoles = Object.keys(TPEN.activeProject.roles)
    if (existingRoles.includes(role.value)) {
        return true
    }
    return false
}

function addPermissions() {
    let action = document.querySelector('input[name="action-permissions"]:checked')
    let scope = document.querySelector('input[name="scope-permissions"]:checked')
    let entity = document.querySelector('input[name="entity-permissions"]:checked')

    if (role.value) {
        if (checkRoleName()) {
            role.value = ''
            permissionString.value = ''
            checkedValues()
            return alert('Default roles cannot be edited')
        }
        if (checkExistingRole()) {
            role.value = ''
            permissionString.value = ''
            checkedValues()
            return alert('Role already exists')
        }
        document.getElementById('edit-role-name').classList.remove('hide-div')
        role.disabled = true
    }

    if (!action && !scope && !entity && !permissionString.value) {
        return alert('Please select an action, scope, entity or permission text')
    }

    if (permissionString.value && !isValidPermissionText(permissionString.value)) {
        permissionString.value = ''
        checkedValues()
        return alert('Invalid permission text')
    }

    if (permissionString.value) {
        if (inPermissionList(permissionString.value)) {
            permissionString.value = ''
            checkedValues()
            return alert('Permission already in list')
        }
        permissions.push(permissionString.value)
        permissionString.value = ''
        permissionsDiv.innerText = `Permissions List: [${permissions}]`
    }

    if (action || scope || entity) {
        if (!action || !scope || !entity) {
            permissionString.value = ''
            checkedValues()
            return alert('Please select an action, scope and entity')
        }
    }

    if (action && scope && entity) {
        if (inPermissionList(`${action.value}_${scope.value}_${entity.value}`)) {
            action.checked = false
            scope.checked = false
            entity.checked = false
            return alert('Permission already in list')
        }
        permissions.push(`${action.value}_${scope.value}_${entity.value}`)
        action.checked = false
        scope.checked = false
        entity.checked = false
        permissionsDiv.innerText = `Permissions List: [${permissions}]`
    }

    if(permissions.length > 0) {
        document.getElementById('add-role').classList.remove('hide-div')
    }
}

async function addRole() {
    if (!role.value) {
        alert('Role name is required')
        return
    }

    if (checkRoleName()) {
        role.value = ''
        alert('Default roles cannot be edited')
        return
    }

    if (checkExistingRole()) {
        role.value = ''
        alert('Role already exists')
        return
    }

    if (permissions.length === 0) {
        alert('At least one permission is required')
        return
    }

    await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/addCustomRoles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TPEN.getAuthorization()}`
        },
        body: JSON.stringify({
            roles: {
                [role.value]: permissions
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
            return TPEN.eventDispatcher.dispatchEvent(toast)
        }
    })
    .catch(error => {
        const toast = new CustomEvent('tpen-toast', {
            detail: {
                message: `Error fetching projects: ${error.message}`,
                status: error.status
            }
        })
        return TPEN.eventDispatcher.dispatchEvent(toast)
    })
}