import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

// Stub TPEN before importing utils (utils.js imports TPEN for servicesURL/RERUMURL)
const { default: TPEN } = await import('../../api/TPEN.js')
TPEN.servicesURL = 'https://api.t-pen.test'
TPEN.RERUMURL = 'https://store.rerum.test/v1'

const { stringFromDate, urlFromIdAndType, escapeHtml } = await import('../utils.js')

describe('stringFromDate', () => {
    it('returns empty string for falsy input', () => {
        assert.equal(stringFromDate(null), '')
        assert.equal(stringFromDate(undefined), '')
        assert.equal(stringFromDate(0), '')
    })

    it('returns "Never" for -1', () => {
        assert.equal(stringFromDate(-1), 'Never')
    })

    it('returns "Today" for timestamps within the last hour', () => {
        const result = stringFromDate(Date.now())
        assert.equal(result, 'Today')
    })

    it('returns hours ago for timestamps within today', () => {
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
        const result = stringFromDate(twoHoursAgo)
        assert.match(result, /hour/)
    })

    it('returns days ago for timestamps within the last week', () => {
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000)
        const result = stringFromDate(threeDaysAgo)
        assert.match(result, /day/)
    })

    it('returns formatted date for timestamps older than a week', () => {
        const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000)
        const result = stringFromDate(twoWeeksAgo)
        // Should be a month+day string, not "days ago"
        assert.ok(!result.includes('day'), `Expected formatted date, got "${result}"`)
    })
})

describe('urlFromIdAndType', () => {
    const ids = { projectId: 'proj-1', pageId: 'page-1', layerId: 'layer-1' }

    it('returns null when id or type is missing', () => {
        assert.equal(urlFromIdAndType(null, 'canvas', ids), null)
        assert.equal(urlFromIdAndType('abc', null, ids), null)
    })

    it('returns the id directly when it is already a full URL', () => {
        assert.equal(
            urlFromIdAndType('https://example.com/resource', 'annotation', ids),
            'https://example.com/resource'
        )
    })

    it('builds annotationpage URL from servicesURL + projectId + id', () => {
        const url = urlFromIdAndType('page-abc', 'annotationpage', { projectId: 'proj-1' })
        assert.equal(url, 'https://api.t-pen.test/project/proj-1/page/page-abc')
    })

    it('returns null for annotationpage when projectId is missing', () => {
        assert.equal(urlFromIdAndType('page-abc', 'annotationpage', {}), null)
    })

    it('builds annotation URL from servicesURL + projectId + pageId + id', () => {
        const url = urlFromIdAndType('line-1', 'annotation', { projectId: 'proj-1', pageId: 'page-1' })
        assert.equal(url, 'https://api.t-pen.test/project/proj-1/page/page-1/line/line-1')
    })

    it('returns null for annotation when projectId or pageId is missing', () => {
        assert.equal(urlFromIdAndType('line-1', 'annotation', { projectId: 'proj-1' }), null)
    })

    it('builds annotationcollection URL from servicesURL + projectId + id', () => {
        const url = urlFromIdAndType('layer-1', 'annotationcollection', { projectId: 'proj-1' })
        assert.equal(url, 'https://api.t-pen.test/project/proj-1/layer/layer-1')
    })

    it('returns null for canvas, manifest, collection types', () => {
        assert.equal(urlFromIdAndType('abc', 'canvas', ids), null)
        assert.equal(urlFromIdAndType('abc', 'manifest', ids), null)
        assert.equal(urlFromIdAndType('abc', 'collection', ids), null)
    })

    it('falls back to RERUMURL for unknown types', () => {
        const url = urlFromIdAndType('hex123', 'unknown', ids)
        assert.equal(url, 'https://store.rerum.test/v1/id/hex123')
    })
})

describe('escapeHtml', () => {
    it('escapes & < > " \'', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b')
        assert.equal(escapeHtml('<script>'), '&lt;script&gt;')
        assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;')
        assert.equal(escapeHtml("it's"), 'it&#39;s')
    })

    it('returns empty string for null/undefined', () => {
        assert.equal(escapeHtml(null), '')
        assert.equal(escapeHtml(undefined), '')
    })

    it('coerces numbers to string', () => {
        assert.equal(escapeHtml(42), '42')
    })
})
