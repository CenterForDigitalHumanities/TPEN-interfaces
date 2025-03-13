import TPEN from "../../api/TPEN.mjs"

TPEN.eventDispatcher.on('tpen-project-loaded', () => render())
const container = document.body
TPEN.attachAuthentication(container)

let permissions = []
let action = document.querySelector('input[name="action-permissions"]:checked')
let scope = document.querySelector('input[name="scope-permissions"]:checked')
let entity = document.querySelector('input[name="entity-permissions"]:checked')
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
}

function isValidPermissionText(permissionText) {
    const regex = /^[A-Z]+_[A-Z]+[A-Z]/
    return regex.test(permissionText)
}

function inPermissionList(permissionValue) {
    if (permissions.includes(permissionValue)) {
        return true
    }
    return false
}

function addPermissions() {
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
        permissionsDiv.innerText = `Permissions List: [${permissions} ]`
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
        permissionsDiv.innerText = `Permissions List: [${permissions} ]`
    }

    if (role.value) {
        role.disabled = true
    }
}

async function addRole() {
    if (!role) {
        alert('Role name is required')
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
                [role]: permissions
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Custom roles added successfully')
        }
    })
    .catch(error => {
        console.error('Error:', error)
    })
}