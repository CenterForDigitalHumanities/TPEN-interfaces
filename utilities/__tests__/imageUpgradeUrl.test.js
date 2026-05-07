import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { getHigherResolutionImageCandidates } = await import('../imageUpgradeUrl.js')

describe('getHigherResolutionImageCandidates', () => {
    describe('with a IIIF Image API v3 service object', () => {
        const service = {
            id: 'https://iiif.example.com/image/abc',
            type: 'ImageService3'
        }

        it('returns candidates using "max" for width > 2000', () => {
            const candidates = getHigherResolutionImageCandidates({
                imageUrl: null,
                imageService: service,
                requestedWidth: 3000
            })
            assert.ok(candidates.some(c => c.includes('/max/')), `Expected "max" candidate, got: ${candidates}`)
        })

        it('returns candidates using numeric width for width <= 2000', () => {
            const candidates = getHigherResolutionImageCandidates({
                imageUrl: null,
                imageService: service,
                requestedWidth: 800
            })
            assert.ok(candidates.some(c => c.includes('/800,/')))
        })
    })

    describe('with a IIIF Image API v2 service object', () => {
        const service = {
            '@id': 'https://iiif.example.com/image/def',
            '@context': 'http://iiif.io/api/image/2/context.json'
        }

        it('returns candidates using "full" for width > 2000', () => {
            const candidates = getHigherResolutionImageCandidates({
                imageUrl: null,
                imageService: service,
                requestedWidth: 3000
            })
            assert.ok(candidates.some(c => c.includes('/full/')), `Expected "full" candidate, got: ${candidates}`)
        })
    })

    describe('with a plain imageUrl containing IIIF path segments', () => {
        it('rewrites the size segment to the requested width', () => {
            const candidates = getHigherResolutionImageCandidates({
                imageUrl: 'https://iiif.example.com/image/abc/full/300,/0/default.jpg',
                imageService: null,
                requestedWidth: 600
            })
            assert.ok(candidates.some(c => c.includes('/600,')))
        })
    })

    describe('with a URL containing width query params', () => {
        it('returns a candidate with the updated width param', () => {
            const candidates = getHigherResolutionImageCandidates({
                imageUrl: 'https://example.com/image?w=200',
                imageService: null,
                requestedWidth: 800
            })
            assert.ok(candidates.some(c => c.includes('w=800')))
        })
    })

    it('deduplicates candidates', () => {
        const service = { id: 'https://iiif.example.com/image/abc', type: 'ImageService3' }
        const candidates = getHigherResolutionImageCandidates({
            imageUrl: null,
            imageService: service,
            requestedWidth: 800
        })
        const unique = new Set(candidates)
        assert.equal(candidates.length, unique.size)
    })

    it('returns empty array when no service or imageUrl provided', () => {
        const candidates = getHigherResolutionImageCandidates({
            imageUrl: null,
            imageService: null,
            requestedWidth: 800
        })
        assert.deepEqual(candidates, [])
    })
})
