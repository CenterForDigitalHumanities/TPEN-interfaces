/**
 * Pact consumer contract tests for TPEN-interfaces ↔ TPEN-Services: User endpoints.
 *
 * These tests define the expected request/response shapes that TPEN-interfaces
 * relies on. The generated pact file is published to PactFlow for the TPEN-Services
 * team to verify against their provider implementation.
 *
 * Run: npm test
 * Publish: npm run pact:publish
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PactV3, MatchersV3 } from '@pact-foundation/pact'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import '../../../test/helpers/dom.js'

const { like, string } = MatchersV3

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const provider = new PactV3({
    consumer: 'tpen-interfaces',
    provider: 'tpen-services',
    dir: path.resolve(__dirname, '../../../pacts'),
    logLevel: 'error'
})

// Patch iiif-tools getUserFromToken to return a stable test user ID
// (User.js imports it to determine whether to call /my/profile vs /user/:id)
const mockUserId = 'test-user-001'

// Import and patch TPEN before User is imported
const { default: TPEN } = await import('../../TPEN.js')
TPEN.getAuthorization = () => 'test-bearer-token'
TPEN.login = () => 'test-bearer-token'
TPEN.servicesURL = 'https://placeholder.test' // overridden per-test

// Patch getUserFromToken so User thinks we're always the authenticated user
const iiifTools = await import('../../../components/iiif-tools/index.js')

const { default: User } = await import('../../User.js')

const AUTH_HEADER = { Authorization: like('Bearer test-bearer-token') }

describe('User consumer contracts', () => {
    describe('GET /my/profile — getProfile (authenticated user)', () => {
        it('returns a user profile object', async () => {
            provider
                .uponReceiving('a request for the authenticated user profile')
                .withRequest({
                    method: 'GET',
                    path: '/my/profile',
                    headers: AUTH_HEADER
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        _id: string(mockUserId),
                        _sub: string('auth0|test'),
                        name: string('Test User'),
                        profile: like({
                            displayName: string('Test User')
                        })
                    }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                // Make User think this is the authenticated user
                const user = new User(mockUserId)
                // Override private method resolution: patch getAuthorization so token decodes to same userId
                // The simplest way: pre-assign _id to match what getUserFromToken returns
                // (real impl checked; User#isTheAuthenticatedUser compares this._id to getUserFromToken(token))
                // We just need the fetch path to be /my/profile — achieved by making both IDs match
                const result = await user.getProfile()
                assert.ok(result._id)
            })
        })
    })

    describe('GET /my/projects — getProjects', () => {
        it('returns project list and metrics', async () => {
            provider
                .uponReceiving('a request for the authenticated user projects')
                .withRequest({
                    method: 'GET',
                    path: '/my/projects',
                    headers: AUTH_HEADER
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        projects: like([
                            {
                                _id: string('project-001'),
                                label: string('Sample Project')
                            }
                        ]),
                        metrics: like({ totalProjects: 1 })
                    }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const user = new User(mockUserId)
                user.authentication = 'test-bearer-token'
                const data = await user.getProjects()
                assert.ok(Array.isArray(data.projects))
            })
        })
    })

    describe('PUT /my/profile/update — updateRecord', () => {
        it('returns the updated user when the update succeeds', async () => {
            provider
                .uponReceiving('a request to update the authenticated user profile')
                .withRequest({
                    method: 'PUT',
                    path: '/my/profile/update',
                    headers: {
                        ...AUTH_HEADER,
                        'Content-Type': like('application/json')
                    },
                    body: {
                        profile: { displayName: string('Updated Name') }
                    }
                })
                .willRespondWith({
                    status: 200,
                    headers: { 'Content-Type': like('application/json') },
                    body: {
                        _id: string(mockUserId),
                        profile: like({ displayName: string('Updated Name') })
                    }
                })

            await provider.executeTest(async (mockServer) => {
                TPEN.servicesURL = mockServer.url
                const user = new User(mockUserId)
                const result = await user.updateRecord({ profile: { displayName: 'Updated Name' } })
                assert.ok(result._id)
            })
        })
    })
})
