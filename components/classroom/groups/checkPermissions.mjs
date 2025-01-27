import {Roles} from "./roles.mjs"
import {Permissions} from "./permissions.mjs"

/**
 * Checks if a role has permission for a specific action on an entity 
 * within a given scope, considering various permission patterns.
 * @param {string} role - The role to be checked.
 * @param {string} action - The action being requested.
 * @param {string} scope - The scope being requested.
 * @param {string} entity - The entity being requested.
 * @return - boolean value, true if role has permission and false otherwise
 */

function hasPermission(role, action, scope, entity){
    if (!Permissions[Roles[role]]) return false; 

    let rolePermissions = Permissions[Roles[role]];
    
    if(rolePermissions.includes(`${action}_${scope}_${entity}`)){ 
        return true;
    }
    if(rolePermissions.includes('*_*_*')){
        return true;
    }
    if(rolePermissions.includes(`*_${scope}_${entity}`)){
        return true;
    }
    if(rolePermissions.includes(`${action}_*_${entity}`)){
        return true;
    }
    if(rolePermissions.includes(`${action}_${scope}_*`)){ 
        return true;
    }
    if(rolePermissions.includes(`${action}_*_*`)){ 
        return true;
    }
    if(rolePermissions.includes(`*_${scope}_*`)){
        return true;
    }
    if(rolePermissions.includes(`*_*_${entity}`)){ 
        return true;
    }

    return false;
}

module.exports = hasPermission;