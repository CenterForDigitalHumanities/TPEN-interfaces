import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

class ManageRole extends HTMLElement {
    permissions = []
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        TPEN.attachAuthentication(this)
    }

    static get observedAttributes() {
        return ['tpen-user-id']
    }

    async connectedCallback() {
        this.addEventListeners()
        this.render()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <label for="action-permissions">Action Permissions:</label><br><br>
            <label for="scope-permissions">Scope Permissions:</label><br><br>
            <label for="entity-permissions">Entity Permissions:</label><br><br>
        `
    }

    async getPermissions() {
        let action = []
        let scope = []
        let entity = []

        if (!TPEN.activeProject) {
            return this.innerHTML = "No project"
        }
        else {
            const token = TPEN.getAuthorization()
            await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => {
                let roles = Object.entries(data.roles || {}).map(([key, value]) => ({
                    id: key,
                    name: value
                }))
                roles = roles.filter(role => data.collaborators[this.getAttribute("tpen-user-id")].roles.includes(role.id))
                roles.forEach(role => {
                    const names = role.name
                    names.map(name => {
                        const nameSplit = name.split("_")
                        action.push(nameSplit[0])
                        scope.push(nameSplit[1])
                        entity.push(nameSplit[2])
                    })
                    scope = [...new Set(scope)]
                    entity = [...new Set(entity)]
                    action = [...new Set(action)]
                })
            })
            const actionRadio = this.shadowRoot.querySelector(`label[for="action-permissions"]`)
            const scopeRadio = this.shadowRoot.querySelector(`label[for="scope-permissions"]`)
            const entityRadio = this.shadowRoot.querySelector(`label[for="entity-permissions"]`)
            
            if(action.includes("*")){
                actionRadio.innerHTML += `
                    <br><input type="radio" name="action-permissions" value="CREATE"> CREATE <br>
                    <input type="radio" name="action-permissions" value="READ"> READ <br>
                    <input type="radio" name="action-permissions" value="UPDATE"> UPDATE <br>
                    <input type="radio" name="action-permissions" value="DELETE"> DELETE <br>
                    <input type="radio" name="action-permissions" value="*"> ALL
                    `
            } else {
                for (let i = 0; i < action.length; i++) {
                    actionRadio.innerHTML += `<br><input type="radio" name="action-permissions" value="${action[i]}">${action[i]}`
                }
            }

            if(scope.includes("*")){
                scopeRadio.innerHTML += `
                    <br><input type="radio" name="scope-permissions" value="METADATA"> METADATA <br>
                    <input type="radio" name="scope-permissions" value="TEXT"> TEXT <br>
                    <input type="radio" name="scope-permissions" value="ORDER"> ORDER <br>
                    <input type="radio" name="scope-permissions" value="SELECTOR"> SELECTOR <br>
                    <input type="radio" name="scope-permissions" value="DESCRIPTION"> DESCRIPTION <br>
                    <input type="radio" name="scope-permissions" value="*"> ALL
                    `
            } else {
                for (let i = 0; i < scope.length; i++) {
                    scopeRadio.innerHTML += `<br><input type="radio" name="scope-permissions" value="${scope[i]}">${scope[i]}`
                }
            }

            if(entity.includes("*")){
                entityRadio.innerHTML += `
                    <br><input type="radio" name="entity-permissions" value="PROJECT"> PROJECT <br>
                    <input type="radio" name="entity-permissions" value="MEMBER"> MEMBER <br>
                    <input type="radio" name="entity-permissions" value="LAYER"> LAYER <br>
                    <input type="radio" name="entity-permissions" value="PAGE"> PAGE <br>
                    <input type="radio" name="entity-permissions" value="LINE"> LINE <br>
                    <input type="radio" name="entity-permissions" value="ROLE"> ROLE <br>
                    <input type="radio" name="entity-permissions" value="PERMISSION"> PERMISSION <br>
                    <input type="radio" name="entity-permissions" value="*"> ALL
                    `
            } else {
                for (let i = 0; i < entity.length; i++) {
                    entityRadio.innerHTML += `<br><input type="radio" name="entity-permissions" value="${entity[i]}">${entity[i]}`
                }
            }
        }
    }

    addEventListeners() {
        this.getPermissions()
        eventDispatcher.on('tpen-project-loaded', () => this.getPermissions()    )
        document.getElementById('add-role').addEventListener('click', () => this.addRole())
        document.getElementById('add-permissions').addEventListener('click', () => this.addPermissions())
        document.getElementById('reset').addEventListener('click', () => this.reset())
        document.getElementById('edit-role-name').addEventListener('click', () => this.editRoleName())
    }

    editRoleName() {
        document.getElementById('role-name').disabled = false
    }

    checkedValues() {
        const actionValue = this.shadowRoot.querySelector('input[name="action-permissions"]:checked')
        const scopeValue = this.shadowRoot.querySelector('input[name="scope-permissions"]:checked')
        const entityValue = this.shadowRoot.querySelector('input[name="entity-permissions"]:checked')
        
        if (actionValue) {
            actionValue.checked = false
        }
        
        if (scopeValue) {
            scopeValue.checked = false
        }
        
        if (entityValue) {
            entityValue.checked = false
        }
    }

    reset() {
        this.permissions = []
        document.getElementById('role-name').value = ''
        document.getElementById('role-name').disabled = false
        this.checkedValues()
        const permissionsDiv = document.getElementById('permissions')
        permissionsDiv.innerHTML = 'Permissions List: []'
    }

    async addPermissions() {
        let action = this.shadowRoot.querySelector('input[name="action-permissions"]:checked')
        let scope = this.shadowRoot.querySelector('input[name="scope-permissions"]:checked')
        let entity = this.shadowRoot.querySelector('input[name="entity-permissions"]:checked')
        let permissionString = document.getElementById('permission').value

        if (action && scope && entity) {
            this.permissions.push(` ${action.value}_${scope.value}_${entity.value}`)
            action.checked = false
            scope.checked = false
            entity.checked = false
        }
        else {
            alert('Please select an action, scope, and entity')
        }

        if (permissionString) {
            this.permissions.push(permissionString)
            permissionString = ''
        }

        const permissionsDiv = document.getElementById('permissions')
        permissionsDiv.innerText = `Permissions List: [${this.permissions} ]`

        if (document.getElementById('role-name').value) {
            document.getElementById('role-name').disabled = true
        }
    }

    async addRole() {
        if (!document.getElementById('role-name').value) {
            alert('Role name is required')
            return
        }

        if (this.permissions.length === 0) {
            alert('At least one permission is required')
            return
        }

        const role = document.getElementById('role-name').value
        await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/addCustomRoles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            },
            body: JSON.stringify({
                roles: {
                    [role]: this.permissions
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

}

customElements.define('manage-role', ManageRole)