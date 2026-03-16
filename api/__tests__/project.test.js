import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

if (!global.HTMLElement) {
    global.HTMLElement = class {
        constructor() {
            this.shadowRoot = null
            this.classList = { add() {}, remove() {}, contains() { return false } }
        }

        attachShadow() {
            this.shadowRoot = {
                innerHTML: '',
                querySelector() {
                    return null
                },
                appendChild() {},
                replaceChildren() {}
            }
            return this.shadowRoot
        }

        remove() {}
    }
}

if (!global.customElements) {
    global.customElements = {
        registry: new Map(),
        define(name, ctor) {
            this.registry.set(name, ctor)
        },
        get(name) {
            return this.registry.get(name)
        }
    }
}

if (!global.window) {
    global.window = {
        location: {
            search: '',
            origin: 'http://localhost'
        }
    }
}

if (!global.document) {
    global.document = {
        title: 'Test',
        querySelector() {
            return null
        },
        createElement() {
            return {
                classList: {
                    add() {},
                    remove() {},
                    contains() { return false }
                },
                style: {},
                setAttribute() {},
                appendChild() {},
                replaceChildren() {},
                remove() {},
                querySelector() {
                    return null
                },
                innerHTML: ''
            }
        },
        body: {
            appendChild() {},
            after() {}
        }
    }
}

const { default: TPEN } = await import('../TPEN.js')
const { default: Project } = await import('../Project.js')

function jsonResponse(data, ok = true, status = ok ? 200 : 400) {
    return {
        ok,
        status,
        headers: {
            get(name) {
                return name?.toLowerCase() === 'content-type' ? 'application/json' : null
            }
        },
        async json() {
            return data
        },
        async text() {
            return JSON.stringify(data)
        }
    }
}

describe('Project collaborator mutation integrity', () => {
    const originalFetch = global.fetch
    const originalGetAuthorization = TPEN.getAuthorization
    const originalLogin = TPEN.login
    const originalServicesURL = TPEN.servicesURL

    beforeEach(() => {
        TPEN.getAuthorization = () => 'test-token'
        TPEN.login = () => 'test-token'
        TPEN.servicesURL = 'https://example.test'
    })

    afterEach(() => {
        global.fetch = originalFetch
        TPEN.getAuthorization = originalGetAuthorization
        TPEN.login = originalLogin
        TPEN.servicesURL = originalServicesURL
    })

    it('rejects semantic failures returned with HTTP 200 and does not mutate local roles', async () => {
        const project = new Project('project-1')
        project.collaborators = {
            'user-1': { roles: ['LEADER', 'CONTRIBUTOR'] }
        }

        global.fetch = async () => jsonResponse({
            status: 400,
            message: 'Cannot remove the last leader',
            ok: false
        }, true, 200)

        await assert.rejects(
            project.cherryPickRoles('user-1', ['VIEWER']),
            /Cannot remove the last leader/
        )

        assert.deepEqual(project.collaborators['user-1'].roles, ['LEADER', 'CONTRIBUTOR'])
    })

    it('applies local role changes only after validated success response', async () => {
        const project = new Project('project-1')
        project.collaborators = {
            'user-1': { roles: ['LEADER'] }
        }

        global.fetch = async () => jsonResponse({
            success: true,
            message: 'Roles updated'
        }, true, 200)

        const response = await project.cherryPickRoles('user-1', ['CONTRIBUTOR'])

        assert.equal(response.success, true)
        assert.deepEqual(project.collaborators['user-1'].roles, ['CONTRIBUTOR'])
    })

    it('rejects removeMember semantic failures and keeps collaborator in local cache', async () => {
        const project = new Project('project-1')
        project.collaborators = {
            'user-1': { roles: ['CONTRIBUTOR'] }
        }

        global.fetch = async () => jsonResponse({
            error: 'Cannot remove required collaborator'
        }, true, 200)

        await assert.rejects(
            project.removeMember('user-1'),
            /Cannot remove required collaborator/
        )

        assert.ok(project.collaborators['user-1'])
    })
})
