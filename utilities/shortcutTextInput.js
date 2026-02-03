/**
 * Text input utilities for inserting text at cursor position.
 * @module utilities/shortcutTextInput
 */

/**
 * Inserts text at the current cursor position in an input or textarea element.
 * Preserves selection behavior and dispatches an 'input' event to trigger any listeners.
 * @param {HTMLInputElement|HTMLTextAreaElement} element - The input element to insert text into
 * @param {string} text - The text to insert at the cursor position
 * @returns {boolean} True if insertion was successful, false otherwise
 */
export function insertTextAtCursor(element, text) {
    if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        return false
    }
    if (typeof text !== 'string' || text.length === 0) {
        return false
    }

    const start = element.selectionStart
    const end = element.selectionEnd
    const value = element.value

    // Insert text at cursor position, replacing any selected text
    element.value = value.slice(0, start) + text + value.slice(end)

    // Move cursor to end of inserted text
    element.selectionStart = element.selectionEnd = start + text.length
    element.focus()

    // Dispatch input event to trigger autosave and other listeners
    element.dispatchEvent(new Event('input', { bubbles: true }))

    return true
}
