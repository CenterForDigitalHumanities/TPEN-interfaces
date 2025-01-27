import Roles from './roles';
import { Action, Scope, Entity } from './permissions_parameters';
import { checkPermissions } from './permissions.mjs';
import hasPermissions from './checkPermissions.mjs';
import { updateUIBasedOnRoles } from '../roleBasedDisplay.mjs';

const testProperties = (obj, properties) => {
    properties.forEach(prop => {
        expect(obj).toHaveProperty(prop);
    });
};

const roleProperties = ['OWNER', 'LEADER', 'CONTRIBUTOR'];
const actionProperties = ['READ', 'UPDATE', 'DELETE', 'CREATE', 'ALL'];
const scopeProperties = ['METADATA', 'TEXT', 'ORDER', 'SELECTOR', 'DESCRIPTION', 'ALL'];
const entityProperties = ['PROJECT', 'MEMBER', 'LAYER', 'PAGE', 'LINE', 'ROLE', 'PERMISSION', 'ALL'];

describe('Roles', () => {
    test('properties are defined correctly', () => {
        testProperties(Roles, roleProperties);
    });
});

describe('Action', () => {
    test('properties are defined correctly', () => {
        testProperties(Action, actionProperties);
    });
});

describe('Scope', () => {
    test('properties are defined correctly', () => {
        testProperties(Scope, scopeProperties);
    });
});

describe('Entity', () => {
    test('properties are defined correctly', () => {
        testProperties(Entity, entityProperties);
    });
});

describe('checkPermissions function', () => {
    test('OWNER can perform any action on any entity', () => {
        expect(checkPermissions('OWNER', 'UPDATE', '*', '*')).toBe(true);
        expect(checkPermissions('OWNER', 'DELETE', '*', '*')).toBe(true);
        expect(checkPermissions('OWNER', 'READ', '*', '*')).toBe(true);
    });

    test('LEADER can UPDATE a PROJECT', () => {
        expect(checkPermissions('LEADER', 'UPDATE', '*', 'PROJECT')).toBe(true);
    });

    test('LEADER can READ a MEMBER', () => {
        expect(checkPermissions('LEADER', 'READ', '*', 'MEMBER')).toBe(true);
    });

    test('CONTRIBUTOR can UPDATE TEXT on any entity', () => {
        expect(checkPermissions('CONTRIBUTOR', 'UPDATE', 'TEXT', '*')).toBe(true);
    });

    test('CONTRIBUTOR can UPDATE DESCRIPTION on LAYER', () => {
        expect(checkPermissions('CONTRIBUTOR', 'UPDATE', 'DESCRIPTION', 'LAYER')).toBe(true);
    });

    test('CONTRIBUTOR cannot UPDATE DESCRIPTION on PAGE', () => {
        expect(checkPermissions('CONTRIBUTOR', 'UPDATE', 'DESCRIPTION', 'PAGE')).toBe(false);
    });

    test('CONTRIBUTOR can READ MEMBER on any scope', () => {
        expect(checkPermissions('CONTRIBUTOR', 'READ', '*', 'MEMBER')).toBe(true);
    });

    test('CONTRIBUTOR cannot DELETE a LAYER', () => {
        expect(checkPermissions('CONTRIBUTOR', 'DELETE', '*', 'LAYER')).toBe(false);
    });

    test('CONTRIBUTOR can DELETE a LINE', () => {
        expect(checkPermissions('CONTRIBUTOR', 'DELETE', '*', 'LINE')).toBe(true);
    });
});

describe('hasPermission function',() => {
    test('CONTRIBUTOR can DELETE a LINE', () => {
        expect(hasPermissions('CONTRIBUTOR', 'DELETE', '*', 'LINE')).toBe(true);
    });
    test('CONTRIBUTOR can UPDATE DESCRIPTION on LAYER', () => {
        expect(hasPermissions('CONTRIBUTOR', 'UPDATE', 'DESCRIPTION', 'LAYER')).toBe(true); 
    });
    test('CONTRIBUTOR cannot UPDATE DESCRIPTION on PAGE', () => {
        expect(hasPermissions('CONTRIBUTOR', 'UPDATE', 'DESCRIPTION', 'PAGE')).toBe(false);
    });
    test('LEADER cannot UPDATE a MEMBER', () => {
        expect(hasPermissions('LEADER', 'UPDATE', '*', 'MEMBER')).toBe(true); 
    });
    test('LEADER can perform any action to METADATA of PERMISSION', () => {
        expect(hasPermissions('LEADER','*','METADATA','PERMISSION')).toBe(true); 
    });
    test('OWNER can perform any action on any entity', () => { 
        expect(hasPermissions('OWNER', 'UPDATE', '*', '*')).toBe(true);
        expect(hasPermissions('OWNER', 'DELETE', '*', '*')).toBe(true);
        expect(hasPermissions('OWNER', 'READ', '*', '*')).toBe(true);
    });
    test('CONTRIBUTOR can UPDATE the ORDER of any entity', () => {
        expect(hasPermissions('CONTRIBUTOR','UPDATE','ORDER','*')).toBe(true); 
    });
    test('OWNER can CREATE any entity', () => {
        expect(hasPermissions('OWNER','CREATE','*','*')).toBe(true);
    });
    test('CONTRIBUTOR cannot DELETE every entity', () => {
        expect(hasPermissions('CONTRIBUTOR','DELETE','*','*')).toBe(false);
    });
    test('OWNER can perform any action on the SELECTOR of any entity', () => {
        expect(hasPermissions('OWNER','*','SELECTOR','*')).toBe(true);
    });
    test('OWNER can perform any action on a ROLE', () => {
        expect(hasPermissions('OWNER','*','*','ROLE')).toBe(true);
    });
});

describe('updateUIBasedOnRoles function', () => {
    let managementOptions;
    let viewOptions;

    beforeEach(() => {
        // Mocked DOM elements
        document.body.innerHTML = `
            <div id="managementOptions" style="display: none;"></div>
            <div id="viewOptions" style="display: none;"></div>
        `;

        managementOptions = document.getElementById('managementOptions');
        viewOptions = document.getElementById('viewOptions');
    });

    test('OWNER role displays management options', () => {
        const roles = ['OWNER'];
        updateUIBasedOnRoles(roles);

        expect(managementOptions.style.display).toBe('block');
    });

    test('CONTRIBUTOR role displays view options only', () => {
        const roles = ['CONTRIBUTOR'];
        updateUIBasedOnRoles(roles);

        expect(managementOptions.style.display).toBe('none');
        expect(viewOptions.style.display).toBe('block');
    });

    test('LEADER role displays management options', () => {
        const roles = ['LEADER'];
        updateUIBasedOnRoles(roles);

        expect(managementOptions.style.display).toBe('block');
    });

    test('Multiple roles display both management and view options', () => {
        const roles = ['LEADER', 'CONTRIBUTOR'];
        updateUIBasedOnRoles(roles);

        expect(managementOptions.style.display).toBe('block');
        expect(viewOptions.style.display).toBe('block');
    });

    test('Unknown roles hide both management and view options', () => {
        const roles = ['UNKNOWN'];
        updateUIBasedOnRoles(roles);

        expect(managementOptions.style.display).toBe('none');
        expect(viewOptions.style.display).toBe('none');
    });

    test('No roles hide both management and view options', () => {
        const roles = [];
        updateUIBasedOnRoles(roles);

        expect(managementOptions.style.display).toBe('none');
        expect(viewOptions.style.display).toBe('none');
    });
});

describe('createCustomRole function',() => {

    test('Successfully add custom role GUEST', () => {
        createCustomRole('GUEST');
        expect(Roles.GUEST).toBe('GUEST');
        expect(Permissions[[Roles.GUEST]]).toEqual([]);
    });

    test('Unsuccessfully adds LEADER role', () => {
        const logSpy = jest.spyOn(global.console, 'log');
        createCustomRole('LEADER');
        expect(logSpy).toHaveBeenCalledWith('Role already exists.');
        logSpy.mockRestore();
    });
    
    test('Unsuccessfully adds non-string role', () => {
        const logSpy = jest.spyOn(global.console, 'log');
        let role = 123;
        createCustomRole(role);
        expect(logSpy).toHaveBeenCalledWith('Input needs to be of type string.');
        logSpy.mockRestore();
    });

});

describe('addPermission function',() => {

    test('Add permission to existing role', () => {
        addPermission('CONTRIBUTOR','CREATE','TEXT','ROLE');
        expect(Permissions[[Roles.CONTRIBUTOR]]).toContain('CREATE_TEXT_ROLE');
    });

    test('Add permission to custom role', () => {
        createCustomRole('GUEST');
        addPermission('GUEST','READ','ALL','ALL');
        expect(Permissions[[Roles.GUEST]]).toContain('READ_*_*');
    });

    test('Unsuccessfully adds to non-existing role', () => {
        const logSpy = jest.spyOn(global.console, 'log');
        addPermission('TEST','READ','ALL','ALL')
        expect(logSpy).toHaveBeenCalledWith('Cannot find role.');
        logSpy.mockRestore();
    });
    
    test('Unsuccessfully adds non-string permission', () => {
        const logSpy = jest.spyOn(global.console, 'log');
        let scope = 123;
        addPermission('CONTRIBUTOR','READ',scope,'ALL')
        expect(logSpy).toHaveBeenCalledWith('All inputs are required to be of type string.');
        logSpy.mockRestore();
    });

    test('Unsuccessfully adds already existing permission', () => {
        const logSpy = jest.spyOn(global.console, 'log');
        addPermission('OWNER','READ','ALL','ALL')
        expect(logSpy).toHaveBeenCalledWith('Role already encompasses specified permission.');
        logSpy.mockRestore();
    });
});