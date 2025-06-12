import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from '../../components/iiif-tools/index.js'

class checkPermissions {
    constructor() {}

    async #getProject() {
        return TPEN.activeProject || await new Promise(resolve => {
            TPEN.eventDispatcher.on('tpen-project-loaded', ev => resolve(ev.detail))
        })
    }

    #getUserId() {
        return getUserFromToken(TPEN.getAuthorization())
    }

    #extractPermissions(project, userId) {
        const userRoles = project.collaborators?.[userId]?.roles || []
        return Array.from(new Set(
            userRoles.flatMap(role => project.roles?.[role] || [])
        ))
    }

    #hasPermission(permissions, action, entity) {
        const actionUpperCase = action.toUpperCase()
        const entityUpperCase = entity.toUpperCase()
        return permissions.some(permission => {
            if (permission === '*_*_*') return true

            const [permissionAction, permissionScope, permissionEntity] = permission.toUpperCase().split('_')
            const actionMatch = permissionAction === '*' || permissionAction === actionUpperCase
            const scopeMatch = true
            const entityMatch = permissionEntity === '*' || permissionEntity === entityUpperCase

            return actionMatch && scopeMatch && entityMatch
        })
    }

    async #checkAccess(prefix, entity) {
        const project = await this.#getProject()
        if (!project) return false

        const userId = this.#getUserId()
        const permissions = this.#extractPermissions(project, userId)

        return this.#hasPermission(permissions, prefix, entity)
    }

    async checkDeleteAccess(entity) {
        return this.#checkAccess('DELETE', entity)
    }

    async checkViewAccess(entity) {
        return this.#checkAccess('READ', entity)
    }

    async checkEditAccess(entity) {
        return this.#checkAccess('UPDATE', entity)
    }

    async checkCreateAccess(entity) {
        return this.#checkAccess('CREATE', entity)
    }

    async checkAllAccess(entity) {
        return this.#checkAccess('*', entity)
    }
}

const CheckPermissions = new checkPermissions()
export default CheckPermissions