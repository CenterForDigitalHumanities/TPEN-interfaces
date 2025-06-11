import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from "../../components/iiif-tools/index.js"

class checkPermissions {
    constructor() {
        // TPEN.eventDispatcher.on("tpen-project-loaded", ev => this.project = ev.detail)
    }

    async checkDeleteAccess() {
        const userId = getUserFromToken(TPEN.getAuthorization())
        const project = TPEN.activeProject || await new Promise(resolve => {
            TPEN.eventDispatcher.on("tpen-project-loaded", ev => resolve(ev.detail))
        })
        if (!project) return false

        const userRoles = project.collaborators?.[userId]?.roles || []
        const allPermissions = Array.from(new Set(
            userRoles.flatMap(role => project.roles?.[role] || [])
        ))

        return allPermissions.some(p => {
            if (p === '*_*_*') return true
            if (p.startsWith('DELETE_')) {
                const parts = p.split('_')
                return parts.length === 3 && (parts[1] === 'LINE' || parts[2] === 'LINE')
            }
            return false
        })
    }

    async checkViewAccess(entity) {
        const userId = getUserFromToken(TPEN.getAuthorization())
        const project = TPEN.activeProject || await new Promise(resolve => {
            TPEN.eventDispatcher.on("tpen-project-loaded", ev => resolve(ev.detail))
        })
        if (!project) return false

        const userRoles = project.collaborators?.[userId]?.roles || []
        const allPermissions = Array.from(new Set(
            userRoles.flatMap(role => project.roles?.[role] || [])
        ))

        return allPermissions.some(p => {
            if (p === '*_*_*') return true
            if (p.startsWith('READ_')) {
                const parts = p.split('_')
                return parts.length === 3 && (parts[1] === entity || parts[2] === entity)
            }
            return false
        })
    }

    async checkEditAccess(entity) {
        const userId = getUserFromToken(TPEN.getAuthorization())
        const project = TPEN.activeProject || await new Promise(resolve => {
            TPEN.eventDispatcher.on("tpen-project-loaded", ev => resolve(ev.detail))
        })
        if (!project) return false

        const userRoles = project.collaborators?.[userId]?.roles || []
        const allPermissions = Array.from(new Set(
            userRoles.flatMap(role => project.roles?.[role] || [])
        ))

        return allPermissions.some(p => {
            if (p === '*_*_*') return true
            if (p.startsWith('UPDATE_')) {
                const parts = p.split('_')
                return parts.length === 3 && (parts[1] === entity || parts[2] === entity)
            }
            return false
        })
    }
}

const CheckPermissions = new checkPermissions()
export default CheckPermissions