import TPEN from "../../api/TPEN.mjs"

class AddCustomRole extends HTMLElement {
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
        this.render()
        this.addEventListener()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                    background: #516059;
                    color: #fff;
                    border: none;
                }
                button:hover {
                    background: #667a71;
                }
            </style>
            <label for="role-name">Role Name:</label><br>
            <input type="text" id="role-name" placeholder="Role name"><br><br>

            <label for="permission">Permissions:</label><br>
            <input type="text" id="permission" placeholder="Permission"><br><br>

            <label for="action-permissions">Action Permissions:</label><br>
            <input type="radio" name="action-permissions" value="READ"> READ <br>
            <input type="radio" name="action-permissions" value="UPDATE"> UPDATE <br>
            <input type="radio" name="action-permissions" value="DELETE"> DELETE <br>
            <input type="radio" name="action-permissions" value="CREATE"> CREATE <br>
            <input type="radio" name="action-permissions" value="*"> ALL <br><br>

            <label for="scope-permissions">Scope Permissions:</label><br>
            <input type="radio" name="scope-permissions" value="METADATA"> METADATA <br>
            <input type="radio" name="scope-permissions" value="TEXT"> TEXT <br>
            <input type="radio" name="scope-permissions" value="ORDER"> ORDER <br>
            <input type="radio" name="scope-permissions" value="SELECTOR"> SELECTOR <br>
            <input type="radio" name="scope-permissions" value="DESCRIPTION"> DESCRIPTION <br>
            <input type="radio" name="scope-permissions" value="*"> ALL <br><br>

            <label for="entity-permissions">Entity Permissions:</label><br>
            <input type="radio" name="entity-permissions" value="PROJECT"> PROJECT <br>
            <input type="radio" name="entity-permissions" value="MEMBER"> MEMBER <br>
            <input type="radio" name="entity-permissions" value="LAYER"> LAYER <br>
            <input type="radio" name="entity-permissions" value="PAGE"> PAGE <br>
            <input type="radio" name="entity-permissions" value="LINE"> LINE <br>
            <input type="radio" name="entity-permissions" value="ROLE"> ROLE <br>
            <input type="radio" name="entity-permissions" value="PERMISSION"> PERMISSION <br>
            <input type="radio" name="entity-permissions" value="*"> ALL <br><br>

            <button id="reset">Reset</button>
            <button id="add-permissions">Add permissions</button>
            <button id="add-role">Add custom role</button>
            <div id="permissions"></div>
        `
    }

    addEventListener() {
        this.shadowRoot.getElementById('add-role').addEventListener('click', () => this.addRole())
        this.shadowRoot.getElementById('add-permissions').addEventListener('click', () => this.addPermissions())
        this.shadowRoot.getElementById('reset').addEventListener('click', () => this.reset())
    }

    reset() {
        this.permissions = []
        this.shadowRoot.getElementById('role-name').value = ''
        this.shadowRoot.querySelector('input[name="action-permissions"]:checked').checked = false
        this.shadowRoot.querySelector('input[name="scope-permissions"]:checked').checked = false
        this.shadowRoot.querySelector('input[name="entity-permissions"]:checked').checked = false

        const permissionsDiv = this.shadowRoot.getElementById('permissions')
        permissionsDiv.innerHTML = ''
    }

    async addPermissions() {
        if (this.shadowRoot.querySelector('input[name="action-permissions"]:checked') && this.shadowRoot.querySelector('input[name="scope-permissions"]:checked') && this.shadowRoot.querySelector('input[name="entity-permissions"]:checked')) {
            const action = this.shadowRoot.querySelector('input[name="action-permissions"]:checked').value
            const scope = this.shadowRoot.querySelector('input[name="scope-permissions"]:checked').value
            const entity = this.shadowRoot.querySelector('input[name="entity-permissions"]:checked').value
            this.permissions.push(`${action}_${scope}_${entity}`)
        }

        if (this.shadowRoot.getElementById('permission').value) {
            const permissionString = this.shadowRoot.getElementById('permission').value
            this.permissions.push(permissionString)
        }

        const permissionsDiv = this.shadowRoot.getElementById('permissions')
        const permissionDiv = document.createElement('div')
        permissionDiv.innerText = `${this.permissions}`
        permissionsDiv.appendChild(permissionDiv)

        if (this.shadowRoot.getElementById('role-name').value) {
            // this.shadowRoot.getElementById('add-role').setAttribute('readonly', '')
        }

        this.shadowRoot.getElementById('permission').value = ''
        this.shadowRoot.querySelector('input[name="action-permissions"]:checked').checked = false
        this.shadowRoot.querySelector('input[name="scope-permissions"]:checked').checked = false
        this.shadowRoot.querySelector('input[name="entity-permissions"]:checked').checked = false
    }

    async addRole() {
        const role = this.shadowRoot.getElementById('role-name').value
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

customElements.define('add-custom-role', AddCustomRole)