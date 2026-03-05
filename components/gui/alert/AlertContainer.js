import './Alert.js'
import { eventDispatcher } from '../../../api/events.js'
import { CleanupRegistry } from '../../../utilities/CleanupRegistry.js'
import { closeModalHostWhenEmpty } from '../../../utilities/modalHost.js'
import { sharedModalStyles } from '../modal.css.js'

/**
 * AlertContainer - Global container for displaying alert dialogs.
 * Listens for 'tpen-alert' events and displays modal alert dialogs.
 * @element tpen-alert-container
 */
class AlertContainer extends HTMLElement {
    #screenLockingSection
    #alertQueue = []
    #keydownHandler
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        const alertHandler = ({ detail }) => this.addAlert(detail?.message, detail?.buttonText)
        this.cleanup.onEvent(eventDispatcher, 'tpen-alert', alertHandler)
    }

    disconnectedCallback() {
        this.cleanup.run()
    }

    /**
     * Add the alert dialogue with acknowledgement button.
     * Alerts are queued - only one is shown at a time.
     *
     * @params message {String} A message to show in the alert.
     * @params buttonText {String} The textual label for the acknowledgement button.
     */
    addAlert(message, buttonText) {
        if (!message || typeof message !== 'string') return
        if (!buttonText || typeof buttonText !== 'string') buttonText = 'OK'
        
        const alertElem = document.createElement('tpen-alert')
        const okButton = document.createElement('button')
        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add('button-container')
        okButton.textContent = buttonText
        alertElem.textContent = message
        
        const handleOk = () => this.dismissCurrent()
        okButton.addEventListener('click', handleOk)
        buttonContainer.appendChild(okButton)
        alertElem.appendChild(buttonContainer)

        const alertEntry = { elem: alertElem, button: okButton }
        this.#alertQueue.push(alertEntry)

        // If this is the first alert, show it immediately
        if (this.#alertQueue.length === 1) {
            this.#showCurrent()
        }
    }

    /**
     * Add a pre-built custom alert element to the global alert host.
     * @param {HTMLElement} alertElem - Custom alert element, typically tpen-alert.
     */
    addCustomAlert(alertElem) {
        if (!alertElem) return

        const alertEntry = { elem: alertElem, button: alertElem.querySelector('button') }
        this.#alertQueue.push(alertEntry)

        if (this.#alertQueue.length === 1) {
            this.#showCurrent()
        }
    }

    /**
     * Display the current (first) alert in the queue and set focus.
     */
    #showCurrent() {
        if (this.#alertQueue.length === 0) return

        const current = this.#alertQueue[0]
        this.#screenLockingSection.appendChild(current.elem)
        current.elem.show?.()

        // Set focus to button
        current.button?.focus?.()

        // Use native dialog cancel event for Escape key (cleaner than document keydown)
        const cancelHandler = (e) => {
            e.preventDefault()
            this.dismissCurrent()
        }
        this.#screenLockingSection.addEventListener('cancel', cancelHandler)

        // Attach keyboard handler for Enter key
        if (this.#keydownHandler) {
            document.removeEventListener('keydown', this.#keydownHandler)
        }
        this.#keydownHandler = (e) => this.#handleKeydown(e)
        document.addEventListener('keydown', this.#keydownHandler)

        // Store cancel handler so it can be removed on dismiss
        current.cancelHandler = cancelHandler
    }

    /**
     * Handle keyboard events for alerts.
     * - Enter: dismiss current alert
     * (Escape is handled via native dialog cancel event)
     */
    #handleKeydown(e) {
        const current = this.#alertQueue[0]
        if (!current) return

        if (e.key === 'Enter' && (e.target === current.elem || current.elem.contains(e.target))) {
            e.preventDefault()
            this.dismissCurrent()
        }
    }

    /**
     * Dismiss the current alert and show the next one in queue.
     */
    dismissCurrent() {
        if (this.#alertQueue.length === 0) return

        const current = this.#alertQueue.shift()
        
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

        // Show next alert in queue if available
        if (this.#alertQueue.length > 0) {
            setTimeout(() => this.#showCurrent(), 600) // Wait for dismiss animation
            return
        }

        closeModalHostWhenEmpty(this.#screenLockingSection, 'tpen-alert')
    }

    render() {
        const style = document.createElement('style')
        style.textContent = sharedModalStyles
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const screenLockingSection = document.createElement('dialog')
        screenLockingSection.classList.add('alert-area')

        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(screenLockingSection)
        this.#screenLockingSection = screenLockingSection
    }
}

// Guard against duplicate registration when module is loaded via different URL paths
if (!customElements.get('tpen-alert-container')) {
    customElements.define('tpen-alert-container', AlertContainer)
    document.body.appendChild(new AlertContainer())
}
