class EventDispatcher extends EventTarget {
    constructor() {
        super()
    }

    // Method to add an event listener
    on(event, listener) {
        this.addEventListener(event, listener)
    }

    // Method to add a one-time event listener that auto-removes after first execution
    one(event, listener) {
        this.addEventListener(event, listener, { once: true })
    }

    // Method to remove an event listener
    off(event, listener) {
        this.removeEventListener(event, listener)
    }

    // Method to dispatch an event
    dispatch(event, detail = {}) {
        this.dispatchEvent(new CustomEvent(event, { detail }))
    }
}

// Export a shared instance of EventDispatcher
const eventDispatcher = new EventDispatcher()

/**
 * Helper function to safely handle confirm dialogs with race condition prevention.
 * Uses a unique confirmId to prevent listener collisions when multiple confirms fire.
 * 
 * @param {string} message - The confirmation message to display
 * @param {Function} onConfirm - Callback for positive action (Delete, Yes, OK, etc.)
 * @param {Function} [onCancel] - Callback for negative action (Cancel, No, etc.)
 * @param {Object} [options] - Configuration options
 * @param {string} [options.positiveButtonText='Yes'] - Text for positive button
 * @param {string} [options.negativeButtonText='No'] - Text for negative button
 */
function confirmAction(message, onConfirm, onCancel, options = {}) {
    const confirmId = crypto.randomUUID()
    const { positiveButtonText = 'Yes', negativeButtonText = 'No' } = options

    const handlePositive = (ev) => {
        if (ev.detail?.confirmId !== confirmId) return
        eventDispatcher.off('tpen-confirm-negative', handleNegative)
        onConfirm?.()
    }

    const handleNegative = (ev) => {
        if (ev.detail?.confirmId !== confirmId) return
        eventDispatcher.off('tpen-confirm-positive', handlePositive)
        onCancel?.()
    }

    eventDispatcher.on('tpen-confirm-positive', handlePositive)
    eventDispatcher.on('tpen-confirm-negative', handleNegative)
    eventDispatcher.dispatch('tpen-confirm', {
        message,
        confirmId,
        positiveButtonText,
        negativeButtonText
    })
}

export { eventDispatcher, EventDispatcher, confirmAction }
