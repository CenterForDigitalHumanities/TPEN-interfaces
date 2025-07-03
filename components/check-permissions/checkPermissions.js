/**
 * A class to that uses loaded project and user information to check if the user
 * has matching/qualifying permission to perform a given action_scope_entity.
 * It supports _entity values that are not within our defined entities.
 *
 * It is intended for use in components that need to check a users permission
 * to make a decision on what to do.

 * To use
     import CheckPermissions from '../../components/check-permissions/checkPermissions.js'
 * Then check permissions by providing entity and scope to one of the check functions
     if(!CheckPermissions.checkViewAccess("member", "*"))
        this.shadowRoot.innerHTML = `insufficient user permissions`
 *
 */

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
        return this.#userId ?? TPEN.currentUser?._id ?? getUserFromToken(TPEN.getAuthorization())
    }

    /**
     * Proxy through to the imported permissionMatch().
     * Note that these will default to 'all' instead of 'any'.  Be specific when you use them.
     * Ex. - CheckPermissions.checkViewAccess("PROJECT", "CONTENT")
     * 
     */
    #checkAccess(action = '*', entity = '*', scope = '*') {
        const project = this.#getProject()
        if (!project) throw new Error('No Project Loaded!')
        const userId = this.#getUserId()
        if(!userId) throw new Error('No User Loaded!')
        if(!(action && entity && scope)) 
            throw new Error(`Missing permission paramaters!.  See action_scope_entity : '${action}_${scope}_${entity}'`)
        // Use permission match without strict entity checks
        return permissionMatch(`${action}_${scope}_${entity}`, project, userId, true)
    }

    // Note that these will default to 'all' instead of 'any'.
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
