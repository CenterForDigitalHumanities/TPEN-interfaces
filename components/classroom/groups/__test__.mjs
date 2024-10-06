const Roles = require('./roles');
const { Action, Scope, Entity } = require('./permissions_parameters');


const testProperties = (obj, properties) => {
    properties.forEach(prop => {
        expect(obj).toHaveProperty(prop, prop);
    });
};

roleProperties = ['OWNER','LEADER','CONTRIBUTOR'];
actionProperties = ['READ','UPDATE','DELETE','CREATE','ALL']
scopeProperties = ['METADATA','TEXT','ORDER','SELECTOR','DESCRIPTION','ALL']
entityProperties = ['PROJECT','MEMBER','LAYER','PAGE','LINE','ROLE','PERMISSION','ALL']

describe('Roles',()=>{
    test('properties are defined correctly', () =>{
        testProperties(Roles,roleProperties);
    });
});

describe('Action',()=>{
    test('properties are defined correctly', () =>{
        testProperties(Action,actionProperties);
    });
});

describe('Scope',()=>{
    test('properties are defined correctly', () =>{
        testProperties(Scope,scopeProperties);
    });
});

describe('Entity',()=>{
    test('properties are defined correctly', () =>{
        testProperties(Entity,entityProperties);
      
const checkPermissions = require('./permissions.mjs');

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