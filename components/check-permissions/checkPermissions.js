import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from '../../components/iiif-tools/index.js'
import { permissionMatch } from "../../components/check-permissions/permission-match.js"

class checkPermissions {
    #project
    #userId

    constructor() {
        TPEN.eventDispatcher.on('tpen-project-loaded', (ev) => {
            this.#project = ev.detail
            this.#userId = getUserFromToken(TPEN.getAuthorization())
        })
    }

    #getProject() {
        return this.#project ?? TPEN.activeProject
    }

    #getUserId() {
        return this.#userId ?? getUserFromToken(TPEN.getAuthorization())
    }

    // Note that this will default to 'all' instead of 'any'.
    #checkAccess(action = '*', entity = '*', scope = '*') {
        const project = this.#getProject()
        if (!project) throw new Error('No Project Loaded!')
        const userId = this.#getUserId()
        if(!userId) throw new Error('No User Loaded!')
        if(!(action && entity && scope)) 
            throw new Error(`Missing permission paramaters!.  See action_scope_entity : '${action}_${scope}_${entity}'`)
        return permissionMatch(`${action}_${scope}_${entity}`, project, userId, true)
    }

    // Note that these will default to 'all' instead of 'any'.  Be specific when you use them.
    // Ex. - CheckPermissions.checkViewAccess("PROJECT", "CONTENT")
    checkDeleteAccess(entity = '*', scope = '*') {
        return this.#checkAccess('DELETE', entity, scope)
    }

    checkViewAccess(entity = '*', scope = '*') {
        return this.#checkAccess('READ', entity, scope)
    }

    checkEditAccess(entity = '*', scope = '*') {
        return this.#checkAccess('UPDATE', entity, scope)
    }

    checkCreateAccess(entity = '*', scope = '*') {
        return this.#checkAccess('CREATE', entity, scope)
    }

    checkAllAccess(entity = '*', scope = '*') {
        return this.#checkAccess('*', entity, scope)
    }
}

const CheckPermissions = new checkPermissions()
export default CheckPermissions
