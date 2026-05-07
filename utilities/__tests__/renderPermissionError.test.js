import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { renderPermissionError } = await import('../renderPermissionError.js')

describe('renderPermissionError', () => {
    it('injects HTML into the provided shadowRoot', () => {
        const container = { innerHTML: '' }
        renderPermissionError(container, 'project-123')
        assert.ok(container.innerHTML.length > 0)
    })

    it('includes the project ID in the rendered output', () => {
        const container = { innerHTML: '' }
        renderPermissionError(container, 'project-abc')
        assert.ok(container.innerHTML.includes('project-abc'))
    })

    it('works without a project ID (uses empty string)', () => {
        const container = { innerHTML: '' }
        assert.doesNotThrow(() => renderPermissionError(container))
    })
})
