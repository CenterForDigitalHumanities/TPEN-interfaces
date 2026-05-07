import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { openModalHost, closeModalHost, closeModalHostWhenEmpty } = await import('../modalHost.js')

function makeDialog(open = false) {
    const dialog = document.createElement('dialog')
    dialog.open = open
    let isOpen = open
    dialog.showModal = () => { isOpen = true; dialog.open = true }
    dialog.close = () => { isOpen = false; dialog.open = false }
    dialog.classList.add = (cls) => dialog._classes = [...(dialog._classes ?? []), cls]
    dialog.classList.remove = (cls) => dialog._classes = (dialog._classes ?? []).filter(c => c !== cls)
    dialog.querySelector = () => null
    return dialog
}

describe('openModalHost', () => {
    it('calls showModal when dialog is not already open', () => {
        const dialog = makeDialog(false)
        openModalHost(dialog)
        assert.equal(dialog.open, true)
    })

    it('does not call showModal when dialog is already open', () => {
        let callCount = 0
        const dialog = makeDialog(true)
        dialog.showModal = () => callCount++
        openModalHost(dialog)
        assert.equal(callCount, 0)
    })

    it('does nothing when passed null', () => {
        assert.doesNotThrow(() => openModalHost(null))
    })
})

describe('closeModalHost', () => {
    it('calls close() when dialog is open', () => {
        const dialog = makeDialog(true)
        closeModalHost(dialog)
        assert.equal(dialog.open, false)
    })

    it('removes "show" class', () => {
        const removed = []
        const dialog = makeDialog(true)
        dialog.classList.remove = (cls) => removed.push(cls)
        closeModalHost(dialog)
        assert.ok(removed.includes('show'))
    })

    it('does nothing when passed null', () => {
        assert.doesNotThrow(() => closeModalHost(null))
    })
})

describe('closeModalHostWhenEmpty', () => {
    it('closes dialog when no matching items are found after initial delay', async () => {
        const dialog = makeDialog(true)
        closeModalHostWhenEmpty(dialog, '.nonexistent', { initialDelay: 0, interval: 0, attempts: 1 })
        await new Promise(r => setTimeout(r, 20))
        assert.equal(dialog.open, false)
    })
})
