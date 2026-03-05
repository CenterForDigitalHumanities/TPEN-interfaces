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
        const positiveHandler = ({ detail }) => {
            const current = this.#dialogQueue[0]
            if (current && detail?.confirmId === current.confirmId) {
                this.dismissCurrent()
            }
        }
        const negativeHandler = ({ detail }) => {
            const current = this.#dialogQueue[0]
            if (current && detail?.confirmId === current.confirmId) {
                this.dismissCurrent()
            }
        }

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
        if (!positiveButtonText || typeof positiveButtonText !== 'string') positiveButtonText = 'Yes'
        if (!negativeButtonText || typeof negativeButtonText !== 'string') negativeButtonText = 'No'

        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add('button-container')
        const confirmElem = document.createElement('tpen-confirm')
        const confirmButton = document.createElement('button')
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
            buttons: { positive: confirmButton, negative: denyButton },
            confirmId: confirmId
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

        // Set focus to negative/cancel button by default (UX best practice: avoid accidental destructive actions)
        current.buttons.negative.focus()

        // Use native dialog cancel event for Escape key (cleaner than document keydown)
        const cancelHandler = (e) => {
            e.preventDefault()
            current.buttons.negative.click()
        }
        this.#screenLockingSection.addEventListener('cancel', cancelHandler)

        // Attach keyboard handler for Tab/Enter navigation
        if (this.#keydownHandler) {
            document.removeEventListener('keydown', this.#keydownHandler)
        }
        this.#keydownHandler = (e) => this.#handleKeydown(e)
        document.addEventListener('keydown', this.#keydownHandler)

        // Store cancel handler so it can be removed on dismiss
        current.cancelHandler = cancelHandler
    }

    /**
     * Handle keyboard navigation in confirm dialogs.
     * - Tab: cycle focus between buttons
     * - Enter: activate focused button
     * (Escape is handled via native dialog cancel event)
     */
    #handleKeydown(e) {
        if (!this.#confirmElem) return

        if (e.key === 'Enter') {
            e.preventDefault()
            // Traverse shadow DOM to find the actual focused element
            let focused = document.activeElement
            while (focused?.shadowRoot?.activeElement) {
                focused = focused.shadowRoot.activeElement
            }
            if (focused?.tagName === 'BUTTON') {
                focused.click()
            }
            return
        }

        if (e.key === 'Tab') {
            const buttons = this.#confirmElem.querySelectorAll('button')
            if (buttons.length !== 2) return

            // Traverse shadow DOM for actual focus
            let focused = document.activeElement
            while (focused?.shadowRoot?.activeElement) {
                focused = focused.shadowRoot.activeElement
            }

            e.preventDefault()
            // Simple two-button cycle: Tab goes negative→positive, Shift+Tab goes positive→negative
            if (e.shiftKey) {
                const target = focused === buttons[0] ? buttons[1] : buttons[0]
                target.focus()
            } else {
                const target = focused === buttons[1] ? buttons[0] : buttons[1]
                target.focus()
            }
        }
    }

    /**
     * Dismiss the current dialog and show the next one in queue.
     */
    dismissCurrent() {
        if (this.#dialogQueue.length === 0) return

        const current = this.#dialogQueue.shift()
        
        // Remove the cancel event listener
        if (current.cancelHandler) {
            this.#screenLockingSection.removeEventListener('cancel', current.cancelHandler)
        }
        
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
    document.body.appendChild(new ConfirmContainer())
}
