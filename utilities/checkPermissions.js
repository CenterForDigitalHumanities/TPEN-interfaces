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

    #hasPermission(permissions, action, entity, scope) {
        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            return false
        }
        const actionUpperCase = action.toUpperCase()
        const scopeUpperCase = scope ? scope.toUpperCase() : '*'
        const entityUpperCase = entity ? entity.toUpperCase() : '*'

        return permissions.some(permission => {
            const [permAction, permScope, permEntity] = permission.toUpperCase().split('_')

            if (!permAction || !permScope || !permEntity) {
                console.warn('Invalid permission format:', permission)
                return false
            }

            if (permAction === '*' && permScope === '*' && permEntity === '*') {
                return true
            }

            return (
                (permAction === actionUpperCase || permAction === '*') &&
                (permScope === scopeUpperCase || permScope === '*') &&
                (permEntity === entityUpperCase || permEntity === '*')
            )
        })
    }

    async #checkAccess(prefix, entity, scope) {
        const project = await this.#getProject()
        if (!project) return false

        const userId = this.#getUserId()
        const permissions = this.#extractPermissions(project, userId)

        return this.#hasPermission(permissions, prefix, entity, scope)
    }

    async checkDeleteAccess(entity = null, scope = null) {
        return this.#checkAccess('DELETE', entity, scope)
    }

    async checkViewAccess(entity = null, scope = null) {
        return this.#checkAccess('READ', entity, scope)
    }

    async checkEditAccess(entity = null, scope = null) {
        return this.#checkAccess('UPDATE', entity, scope)
    }

    async checkCreateAccess(entity = null, scope = null) {
        return this.#checkAccess('CREATE', entity, scope)
    }

    async checkAllAccess(entity = null, scope = null) {
        return this.#checkAccess('*', entity, scope)
    }
}

const CheckPermissions = new checkPermissions()
export default CheckPermissions