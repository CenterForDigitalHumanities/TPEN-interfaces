import './Confirm.js'
import { eventDispatcher } from '../../../api/events.js'
import { CleanupRegistry } from '../../../utilities/CleanupRegistry.js'
import { closeModalHostWhenEmpty } from '../../../utilities/modalHost.js'
import { sharedModalStyles } from '../modal.css.js'

/**
 * ConfirmContainer - Global container for displaying confirmation dialogs.
 * Listens for 'tpen-confirm' events and displays modal confirm dialogs.
 * Manages a queue of pending dialogs - only one is shown at a time.
 * @element tpen-confirm-container
 */
class ConfirmContainer extends HTMLElement {
    #screenLockingSection
    #confirmElem
    #dialogQueue = []
    #keydownHandler
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        const confirmHandler = ({ detail }) => this.addConfirm(
            detail?.message,
            detail?.positiveButtonText,
            detail?.negativeButtonText,
            detail?.confirmId
        )
        const positiveHandler = () => this.dismissCurrent()
        const negativeHandler = () => this.dismissCurrent()

        this.cleanup.onEvent(eventDispatcher, 'tpen-confirm', confirmHandler)
        this.cleanup.onEvent(eventDispatcher, 'tpen-confirm-positive', positiveHandler)
        this.cleanup.onEvent(eventDispatcher, 'tpen-confirm-negative', negativeHandler)
    }

    disconnectedCallback() {
        this.cleanup.run()
    }

    /**
     * Add the confirm dialogue with positive and negative confirmation buttons.
     * Dialogs are queued - only one is shown at a time.
     *
     * @params message {String} A message to show in the confirm dialogue.
     * @params positiveButtonText {String} The text label for the positive confirm button.
     * @params negativeButtonText {String} The text label for the negative confirm button.
     * @params confirmId {String} Unique ID to prevent listener collisions on rapid confirms.
     */
    addConfirm(message, positiveButtonText, negativeButtonText, confirmId) {
        if (!message || typeof message !== 'string') return
        // Prevent multiple dialogs from stacking when actions are triggered rapidly
        if (this.#screenLockingSection.querySelector('tpen-confirm')) return
        if (!positiveButtonText || typeof positiveButtonText !== 'string') positiveButtonText = 'Yes'
        if (!negativeButtonText || typeof negativeButtonText !== 'string') negativeButtonText = 'No'

        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add('button-container')
        const confirmElem = document.createElement('tpen-confirm')
        const confirmButton = document.createElement('button')
        confirmButton.style.marginRight = '10px'
        const denyButton = document.createElement('button')

        confirmElem.textContent = message
        confirmButton.textContent = positiveButtonText
        denyButton.textContent = negativeButtonText

        const handlePositive = (e) => {
            eventDispatcher.dispatch('tpen-confirm-positive', { confirmId })
        }
        const handleNegative = (e) => {
            eventDispatcher.dispatch('tpen-confirm-negative', { confirmId })
        }

        confirmButton.addEventListener('click', handlePositive)
        denyButton.addEventListener('click', handleNegative)
        buttonContainer.appendChild(confirmButton)
        buttonContainer.appendChild(denyButton)
        confirmElem.appendChild(buttonContainer)

        const dialogEntry = {
            elem: confirmElem,
            buttons: { positive: confirmButton, negative: denyButton }
        }

        this.#dialogQueue.push(dialogEntry)

        // If this is the first dialog, show it immediately
        if (this.#dialogQueue.length === 1) {
            this.#showCurrent()
        }
    }

    /**
     * Display the current (first) dialog in the queue and set focus.
     */
    #showCurrent() {
        if (this.#dialogQueue.length === 0) return

        const current = this.#dialogQueue[0]
        this.#confirmElem = current.elem

        this.#screenLockingSection.appendChild(current.elem)
        current.elem.show()

        // Set focus to positive button (Yes/OK/Delete) by default
        current.buttons.positive.focus()

        // Attach keyboard handler for current dialog
        if (this.#keydownHandler) {
            document.removeEventListener('keydown', this.#keydownHandler)
        }
        this.#keydownHandler = (e) => this.#handleKeydown(e)
        document.addEventListener('keydown', this.#keydownHandler)
    }

    /**
     * Handle keyboard navigation in confirm dialogs.
     * - Tab: cycle focus between buttons
     * - Enter: activate focused button
     * - Escape: dismiss dialog (treat as negative/cancel)
     */
    #handleKeydown(e) {
        if (!this.#confirmElem) return

        if (e.key === 'Escape') {
            e.preventDefault()
            this.dismissCurrent()
            return
        }

        if (e.key === 'Enter') {
            e.preventDefault()
            if (document.activeElement?.tagName === 'BUTTON') {
                document.activeElement.click()
            }
            return
        }

        if (e.key === 'Tab') {
            const buttons = this.#confirmElem.querySelectorAll('button')
            if (buttons.length !== 2) return

            const focused = document.activeElement
            const isPositive = buttons[0] === focused
            const isNegative = buttons[1] === focused

            if (e.shiftKey) {
                // Shift+Tab: move to previous button
                if (isPositive || !isNegative) {
                    e.preventDefault()
                    buttons[1].focus()
                } else {
                    e.preventDefault()
                    buttons[0].focus()
                }
            } else {
                // Tab: move to next button
                if (isNegative || !isPositive) {
                    e.preventDefault()
                    buttons[0].focus()
                } else {
                    e.preventDefault()
                    buttons[1].focus()
                }
            }
        }
    }

    /**
     * Dismiss the current dialog and show the next one in queue.
     */
    dismissCurrent() {
        if (this.#dialogQueue.length === 0) return

        const current = this.#dialogQueue.shift()
        current.elem.dismiss()

        // Remove keyboard handler
        if (this.#keydownHandler) {
            document.removeEventListener('keydown', this.#keydownHandler)
            this.#keydownHandler = null
        }

        // Show next dialog in queue if available
        if (this.#dialogQueue.length > 0) {
            setTimeout(() => this.#showCurrent(), 600) // Wait for dismiss animation
            return
        }

        closeModalHostWhenEmpty(this.#screenLockingSection, 'tpen-confirm')
    }

    render() {
        const style = document.createElement('style')
        style.textContent = sharedModalStyles
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const screenLockingSection = document.createElement('dialog')
        screenLockingSection.classList.add('confirm-area')

        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(screenLockingSection)
        this.#screenLockingSection = screenLockingSection
    }
}

// Guard against duplicate registration when module is loaded via different URL paths
if (!customElements.get('tpen-confirm-container')) {
    customElements.define('tpen-confirm-container', ConfirmContainer)
    document?.body.after(new ConfirmContainer())
}
