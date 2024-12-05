import { Roles } from "./roles.mjs"
import {Action,Scope,Entity} from "./permissions_parameters.mjs"
const hasPermission = require('./checkPermissions.mjs');

export const Permissions = {
    [Roles.OWNER]: ['*_*_*'],
    [Roles.LEADER]: [
        /* ACTION_SCOPE_ENTITY */
        'UPDATE_*_PROJECT',
        '*_*_MEMBER',
        '*_*_ROLE',
        '*_*_PERMISSION',
        '*_*_LAYER',
        '*_*_PAGE'
    ],
    [Roles.CONTRIBUTOR]: [
        /* ACTION_SCOPE_ENTITY */
        'READ_*_MEMBER',
        'UPDATE_TEXT_*',
        'UPDATE_ORDER_*',
        'UPDATE_SELECTOR_*',
        'CREATE_SELECTOR_*',
        'DELETE_*_LINE',
        'UPDATE_DESCRIPTION_LAYER',
        'CREATE_*_LAYER'
    ]
};

// Generate possible patterns to match
export function generatePatterns(action, scope, entity) {
    return [
        `${action}_${scope}_${entity}`,
        `${action}_${scope}_*`,
        `${action}_*_${entity}`,
        `*_${scope}_${entity}`,
        `*_*_${entity}`,
        `*_${scope}_*`,
        `${action}_*_*`,
        '*_*_*'
    ];
};

/* validate whether a specific role can perform 
an action on a particular entity and scope. */
export function checkPermissions(role, action, scope, entity) {
    if (!Permissions[role]) return false; // If role doesn't exist

    // Get the permissions for the specified role
    const rolePerms = Permissions[role];
    const patterns = generatePatterns(action, scope, entity);

    // Check if any pattern matches the role's permissions
    return patterns.some(pattern => rolePerms.includes(pattern));
};

//can we combine checkPermissions with permissions here?
//we also need a function to assign permissions to a user object once we have that class defined (no user attributes or anything to assign right now, just a lot of constants)

export function createCustomRole(role){ 
    if(typeof role!="string"){
        console.log("Input needs to be of type string.");
        return;
    }
    if (Roles[role]){
        console.log("Role already exists.");
        return;
    }
    Object.defineProperty(Roles,role,{value:role,writable:true,enumerable:true,configurable:true}); //adding role to role object in roles.mjs
    Object.defineProperty(Permissions,role,{value:[],writable:true,enumerable:true,configurable:true}); //adding role to Permissions const
    }

export function addPermission(role,action,scope,entity){
    if(typeof role!="string"||typeof action!="string"||typeof scope!="string"||typeof entity!="string"){
        console.log("All inputs are required to be of type string.");
        return;
    }
    if (!Permissions[role]){
        console.log("Cannot find role.");
        return;
    }

    let definedActions = Object.values(Action);
    let definedScopes = Object.values(Scope);
    let definedEntities = Object.values(Entity);

    if(definedActions.includes(action)==false){
        console.log("Action input is not a valid action.");
        return;
    }
    if(definedScopes.includes(scope)==false){
        console.log("Scope input is not a valid scope.");
        return;
    }
    if(definedEntities.includes(entity)==false){
        console.log("Entity input is not a valid entity.");
        return;
    }

    if(action=="ALL"){
        action="*"
    }
    if(scope=="ALL"){
        scope="*"
    }
    if(entity=="ALL"){
        entity="*"
    }
    if(hasPermission(role,action,scope,entity)){
        console.log("Role already encompasses specified permission.");
        return;
    }

    Object.defineProperty(Permissions,Roles[role],{value:`${action}_${scope}_${entity}`,writable:true,enumerable:true,configurable:true});
}