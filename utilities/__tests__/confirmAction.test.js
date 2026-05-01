import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { confirmAction } = await import('../confirmAction.js')
const { eventDispatcher } = await import('../../api/events.js')

describe('confirmAction', () => {
    it('dispatches tpen-confirm with the provided message', () => {
        let dispatched = null
        const off = eventDispatcher.on('tpen-confirm', (ev) => {
            dispatched = ev.detail
        })
        confirmAction('Are you sure?', () => {}, undefined)
        eventDispatcher.off('tpen-confirm', off)
        assert.equal(dispatched?.message, 'Are you sure?')
    })

    it('calls onConfirm when tpen-confirm-positive fires with matching confirmId', () => {
        let confirmed = false
        // Capture the confirmId dispatched by this specific confirmAction call
        let confirmId
        const capture = (ev) => { confirmId = ev.detail?.confirmId }
        eventDispatcher.on('tpen-confirm', capture)
        confirmAction('Proceed?', () => { confirmed = true }, undefined)
        eventDispatcher.off('tpen-confirm', capture)

        // Fire the positive response with the captured id
        eventDispatcher.dispatch('tpen-confirm-positive', { confirmId })
        assert.equal(confirmed, true)
    })

    it('calls onCancel when tpen-confirm-negative fires with matching confirmId', async () => {
        let cancelled = false
        let capturedId

        const captureEvent = (ev) => { capturedId = ev.detail?.confirmId }
        eventDispatcher.on('tpen-confirm', captureEvent)
        confirmAction('Delete?', () => {}, () => { cancelled = true })
        eventDispatcher.off('tpen-confirm', captureEvent)

        eventDispatcher.dispatch('tpen-confirm-negative', { confirmId: capturedId })
        assert.equal(cancelled, true)
    })

    it('does not fire onConfirm for a different confirmId', () => {
        let confirmed = false
        confirmAction('Are you sure?', () => { confirmed = true }, undefined)
        eventDispatcher.dispatch('tpen-confirm-positive', { confirmId: 'other-id' })
        assert.equal(confirmed, false)
    })
})
