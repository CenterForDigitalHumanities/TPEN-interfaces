import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from "../../components/iiif-tools/index.js"

export class CheckPermissions extends HTMLElement {
    constructor() {
        super()
        TPEN.attachAuthentication(this)
    }

    static get observedAttributes() {
        return ['tpen-entity']
    }


    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.render(ev.detail))
    }

    render(project) {
        const userId = getUserFromToken(TPEN.getAuthorization())
        const entity = this.getAttribute('tpen-entity')
        const userRoles = project?.collaborators?.[userId]?.roles
        const allPermissions = Array.from(new Set(
            userRoles.flatMap(role => project.roles[role])
        ))
        const entityUpperCase = entity?.toUpperCase()

        if(entity === 'metadata') {
            
            const hasPermission = allPermissions.map(permission => (['*_*_*', `CREATE_${entityUpperCase}_*`, `UPDATE_${entityUpperCase}_*`, `DELETE_${entityUpperCase}_*`, `*_${entityUpperCase}_*`]).includes(permission)).includes(true)
            const hasPermissionReadOnly = allPermissions.map(permission => ([`READ_${entityUpperCase}_*`]).includes(permission)).includes(true)
            Array.from(this.children).forEach(child => {
                child.style.display = (hasPermissionReadOnly || hasPermission) ? '' : 'none'
                this.style.display = (hasPermissionReadOnly || hasPermission) ? '' : 'none'
                child.querySelector('button').style.display = (hasPermission) ? '' : 'none'
            })
            return
        }

        if(entity === 'member' || entity === 'layer' || entity === 'role' || entity === 'page' || entity === 'line') {

            const hasPermission = allPermissions.map(permission => (['*_*_*', `CREATE_*_${entityUpperCase}`, `UPDATE_*_${entityUpperCase}`, `DELETE_*_${entityUpperCase}`, `*_*_${entityUpperCase}`]).includes(permission)).includes(true)
            const hasPermissionReadOnly = allPermissions.map(permission => ([`READ_*_${entityUpperCase}`]).includes(permission)).includes(true)
            Array.from(this.children).forEach(child => {
                child.style.display = (hasPermissionReadOnly || hasPermission) ? '' : 'none'
                this.style.display = (hasPermissionReadOnly || hasPermission) ? '' : 'none'
                child.querySelector('button').style.display = (hasPermission) ? '' : 'none'
            })
            return
        }

        if(entity === 'export') {

            const hasPermission = allPermissions.map(permission => (['*_*_*', 'UPDATE_*_PROJECT']).includes(permission)).includes(true)
            const hasPermissionReadOnly = allPermissions.map(permission => (['READ_*_PROJECT']).includes(permission)).includes(true)
            Array.from(this.children).forEach(child => {
                child.style.display = (hasPermissionReadOnly || hasPermission) ? '' : 'none'
                this.style.display = (hasPermissionReadOnly || hasPermission) ? '' : 'none'
                child.querySelector('button').style.display = (hasPermission) ? '' : 'none'            
            })
            return
        }
    }
}

customElements.define('check-permissions', CheckPermissions)