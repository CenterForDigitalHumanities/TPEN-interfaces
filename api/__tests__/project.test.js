
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'
import { TPEN as TPENMock } from '../../test/helpers/tpen-mock.js'
import { jsonResponse } from '../../test/helpers/fetch-mock.js'

const { default: TPEN } = await import('../TPEN.js')
const { default: Project } = await import('../Project.js')

// Patch TPEN singleton for tests
Object.assign(TPEN, TPENMock)

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
