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

    #hasPermission(permissions, prefix, entity) {
        return permissions.some(p => {
            if (p === '*_*_*') return true
            if (p.startsWith(prefix)) {
                const [, ent1, ent2] = p.split('_')
                return ent1 === entity || ent2 === entity
            }
            return false
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
        return this.#checkAccess('DELETE_', entity)
    }

    async checkViewAccess(entity) {
        return this.#checkAccess('READ_', entity)
    }

    async checkEditAccess(entity) {
        return this.#checkAccess('UPDATE_', entity)
    }

    async checkCreateAccess(entity) {
        return this.#checkAccess('CREATE_', entity)
    }
}

const CheckPermissions = new checkPermissions()
export default CheckPermissions