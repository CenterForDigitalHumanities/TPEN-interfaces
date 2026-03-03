import { eventDispatcher } from '../api/events.js'

/**
 * Shows a modal confirm dialog using the tpen-confirm event system.
 * Uses a unique confirmId so concurrent dialogs do not cross-fire each
 * other's callbacks — each response event is matched back to the dialog
 * that produced it.
 *
 * @param {string}   message              - The message to display.
 * @param {function} onConfirm            - Called when the user clicks the positive button.
 * @param {function} [onCancel]           - Called when the user clicks the negative button.
 * @param {object}   [options]            - Additional options forwarded to tpen-confirm.
 * @param {string}   [options.positiveButtonText] - Label for the positive button (default: 'Yes').
 * @param {string}   [options.negativeButtonText] - Label for the negative button (default: 'No').
 */
export function confirmAction(message, onConfirm, onCancel, options = {}) {
    const confirmId = typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const onPositive = (ev) => {
        if (ev.detail?.confirmId !== confirmId) return
        eventDispatcher.off('tpen-confirm-positive', onPositive)
        eventDispatcher.off('tpen-confirm-negative', onNegative)
        onConfirm()
    }
    const onNegative = (ev) => {
        if (ev.detail?.confirmId !== confirmId) return
        eventDispatcher.off('tpen-confirm-positive', onPositive)
        eventDispatcher.off('tpen-confirm-negative', onNegative)
        onCancel?.()
    }

    eventDispatcher.on('tpen-confirm-positive', onPositive)
    eventDispatcher.on('tpen-confirm-negative', onNegative)
    eventDispatcher.dispatch('tpen-confirm', { message, confirmId, ...options })
}
