import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from '../../components/iiif-tools/index.js'

class checkPermissions {
    #entities = [
        "PROJECT",
        "LAYER",
        "PAGE",
        "LINE",
        "MEMBER",
        "ROLE",
        "PERMISSION",
        "TOOL",
        "*"
    ]
    #project

    constructor() {
        TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.#project = ev.detail)
    }

    #getProject() {
        return TPEN.activeProject ?? this.#project
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
        const actionUpperCase = action ? action.toUpperCase() : '*'
        const scopeUpperCase = scope ? scope.toUpperCase() : '*'
        const entityUpperCase = entity ? entity.toUpperCase() : '*'

        return permissions.some(permission => {
            const [permAction, permScope, permEntity] = permission.toUpperCase().split('_')

            if (!permAction || !permScope || !permEntity) {
                console.warn('Invalid permission format:', permission)
                return false
            }

            return (
                (permAction === actionUpperCase || permAction === '*') &&
                (permScope === scopeUpperCase || permScope === '*') &&
                (permEntity === entityUpperCase || permEntity === '*')
            )
        })
    }

    #checkAccess(prefix, entity, scope) {
        const project = this.#getProject()
        if (!project) throw new Error("No Project Loaded!")
        const userId = this.#getUserId()
        if(!userId) throw new Error("No User Loaded!")
        const permissions = this.#extractPermissions(project, userId)
        return this.#hasPermission(permissions, prefix, entity, scope)
    }

    checkDeleteAccess(entity = null, scope = null) {
        return this.#checkAccess('DELETE', entity, scope)
    }

    checkViewAccess(entity = null, scope = null) {
        return this.#checkAccess('READ', entity, scope)
    }

    checkEditAccess(entity = null, scope = null) {
        return this.#checkAccess('UPDATE', entity, scope)
    }

    checkCreateAccess(entity = null, scope = null) {
        return this.#checkAccess('CREATE', entity, scope)
    }

    checkAllAccess(entity = null, scope = null) {
        return this.#checkAccess('*', entity, scope)
    }
}

const CheckPermissions = new checkPermissions()
export default CheckPermissions