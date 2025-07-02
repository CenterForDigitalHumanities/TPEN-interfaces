import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from '../../components/iiif-tools/index.js'
import { permissionMatch } from "../../components/check-permissions/permission-match.js"

class checkPermissions {
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

    #checkAccess(action="*", entity="*", scope="*") {
        const project = this.#getProject()
        if (!project) throw new Error("No Project Loaded!")
        const userId = this.#getUserId()
        if(!userId) throw new Error("No User Loaded!")
        return permissionMatch(`${action.toUpperCase()}_${scope.toUpperCase()}_${entity.toUpperCase()}`, project, userId)
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