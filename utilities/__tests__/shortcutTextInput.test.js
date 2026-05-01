import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { insertTextAtCursor } = await import('../shortcutTextInput.js')

function makeInput(value = '', selectionStart = 0, selectionEnd = 0) {
    const el = document.createElement('input')
    el.value = value
    el.selectionStart = selectionStart
    el.selectionEnd = selectionEnd
    return el
}

describe('insertTextAtCursor', () => {
    it('inserts text at cursor position', () => {
        const el = makeInput('hello world', 5, 5)
        insertTextAtCursor(el, ', beautiful')
        assert.equal(el.value, 'hello, beautiful world')
    })

    it('replaces selected text', () => {
        const el = makeInput('hello world', 6, 11)
        insertTextAtCursor(el, 'there')
        assert.equal(el.value, 'hello there')
    })

    it('moves cursor to end of inserted text', () => {
        const el = makeInput('abc', 1, 1)
        insertTextAtCursor(el, 'XY')
        assert.equal(el.selectionStart, 3)
        assert.equal(el.selectionEnd, 3)
    })

    it('returns true on success', () => {
        const el = makeInput('test', 2, 2)
        const result = insertTextAtCursor(el, '!')
        assert.equal(result, true)
    })

    it('returns false for a non-input element', () => {
        const div = document.createElement('div')
        const result = insertTextAtCursor(div, 'text')
        assert.equal(result, false)
    })

    it('returns false for empty text', () => {
        const el = makeInput('test', 2, 2)
        const result = insertTextAtCursor(el, '')
        assert.equal(result, false)
    })

    it('returns false when element is null', () => {
        const result = insertTextAtCursor(null, 'text')
        assert.equal(result, false)
    })

    it('dispatches an input event after insertion', () => {
        const el = makeInput('test', 4, 4)
        let inputFired = false
        el.addEventListener('input', () => { inputFired = true })
        insertTextAtCursor(el, '!')
        assert.equal(inputFired, true)
    })
})
