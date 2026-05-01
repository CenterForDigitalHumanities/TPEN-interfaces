/**
 * Pact consumer contract tests for TPEN-interfaces ↔ TPEN-Services: Project endpoints.
 *
 * These tests define the expected request/response shapes that TPEN-interfaces
 * relies on. The generated pact file is published to PactFlow for the TPEN-Services
 * team to verify against their provider implementation.
 *
 * Run: npm run test:contracts
 * Publish: npm run pact:publish
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { PactV3, MatchersV3 } from '@pact-foundation/pact'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import '../../test/helpers/dom.js'

const { like, string, integer, eachLike } = MatchersV3

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const provider = new PactV3({
    consumer: 'tpen-interfaces',
    provider: 'tpen-services',
    dir: path.resolve(__dirname, '../../../pacts'),
    logLevel: 'error'
})

// Boot TPEN mock before importing Project — TPEN reads servicesURL at call time
const { default: TPEN } = await import('../../TPEN.js')
TPEN.getAuthorization = () => 'test-bearer-token'
TPEN.login = () => 'test-bearer-token'

const { default: Project } = await import('../../Project.js')

const PROJECT_ID = 'test-project-001'
const USER_ID = 'user-001'
const AUTH_HEADER = { Authorization: like('Bearer test-bearer-token') }

describe('Project consumer contracts', () => {
    describe('GET /project/:id — fetch project', () => {
        it('returns a project object when the project exists', async () => {
            provider
                .uponReceiving('a request to fetch project test-project-001')
                .withRequest({
                    method: 'GET',
                    path: `/project/${PROJECT_ID}`,
                    headers: AUTH_HEADER
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        _id: string(PROJECT_ID),
                        label: string('Test Project'),
                        collaborators: like({
                            [USER_ID]: {
                                roles: eachLike('LEADER'),
                                profile: like({ displayName: 'Test User' })
                            }
                        }),
                        layers: like([]),
                        creator: string(USER_ID)
                    }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const project = new Project(PROJECT_ID)
                const result = await project.fetch()
                assert.equal(result._id, PROJECT_ID)
            })
        })
    })

    describe('PUT /project/:id/collaborator/:userId/setRoles — cherryPickRoles', () => {
        it('returns success when roles are updated', async () => {
            provider
                .uponReceiving('a request to set roles for user-001 on project test-project-001')
                .withRequest({
                    method: 'PUT',
                    path: `/project/${PROJECT_ID}/collaborator/${USER_ID}/setRoles`,
                    headers: { ...AUTH_HEADER, 'Content-Type': like('application/json') },
                    body: { roles: ['CONTRIBUTOR'] }
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: { success: true, message: string('Roles updated') }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const project = new Project(PROJECT_ID)
                project.collaborators = { [USER_ID]: { roles: ['LEADER'] } }
                const result = await project.cherryPickRoles(USER_ID, ['CONTRIBUTOR'])
                assert.equal(result.success, true)
                assert.deepEqual(project.collaborators[USER_ID].roles, ['CONTRIBUTOR'])
            })
        })

        it('returns an error shape when the last leader cannot be removed', async () => {
            provider
                .uponReceiving('a rejected setRoles request — last leader constraint')
                .withRequest({
                    method: 'PUT',
                    path: `/project/${PROJECT_ID}/collaborator/${USER_ID}/setRoles`,
                    headers: { ...AUTH_HEADER, 'Content-Type': like('application/json') },
                    body: { roles: ['VIEWER'] }
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        status: 400,
                        message: string('Cannot remove the last leader'),
                        ok: false
                    }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const project = new Project(PROJECT_ID)
                project.collaborators = { [USER_ID]: { roles: ['LEADER', 'CONTRIBUTOR'] } }
                await assert.rejects(
                    project.cherryPickRoles(USER_ID, ['VIEWER']),
                    /Cannot remove the last leader/
                )
                assert.deepEqual(project.collaborators[USER_ID].roles, ['LEADER', 'CONTRIBUTOR'])
            })
        })
    })

    describe('POST /project/:id/remove-member — removeMember', () => {
        it('returns success when a member is removed', async () => {
            provider
                .uponReceiving('a request to remove user-001 from project test-project-001')
                .withRequest({
                    method: 'POST',
                    path: `/project/${PROJECT_ID}/remove-member`,
                    headers: { ...AUTH_HEADER, 'Content-Type': like('application/json') },
                    body: { userId: USER_ID }
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: { success: true, message: string('Member removed') }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const project = new Project(PROJECT_ID)
                project.collaborators = { [USER_ID]: { roles: ['CONTRIBUTOR'] } }
                const result = await project.removeMember(USER_ID)
                assert.equal(result.success, true)
                assert.equal(project.collaborators[USER_ID], undefined)
            })
        })
    })

    describe('POST /project/:id/invite-member — addMember', () => {
        it('returns success when a member is invited', async () => {
            provider
                .uponReceiving('a request to invite member by email to project test-project-001')
                .withRequest({
                    method: 'POST',
                    path: `/project/${PROJECT_ID}/invite-member`,
                    headers: { ...AUTH_HEADER, 'Content-Type': like('application/json') },
                    body: { email: 'newuser@example.com', roles: ['CONTRIBUTOR'] }
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: { success: true }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const project = new Project(PROJECT_ID)
                const result = await project.addMember('newuser@example.com', ['CONTRIBUTOR'])
                assert.equal(result.success, true)
            })
        })
    })

    describe('POST /project/:id/collaborator/:userId/addRoles — makeLeader', () => {
        it('returns success when LEADER role is added', async () => {
            provider
                .uponReceiving('a request to add LEADER role to user-001')
                .withRequest({
                    method: 'POST',
                    path: `/project/${PROJECT_ID}/collaborator/${USER_ID}/addRoles`,
                    headers: { ...AUTH_HEADER, 'Content-Type': like('application/json') },
                    body: ['LEADER']
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: { success: true }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const project = new Project(PROJECT_ID)
                project.collaborators = { [USER_ID]: { roles: ['CONTRIBUTOR'] } }
                await project.makeLeader(USER_ID)
                assert.ok(project.collaborators[USER_ID].roles.includes('LEADER'))
            })
        })
    })
})
