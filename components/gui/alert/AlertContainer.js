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
        const handleOk = (e) => {
            this.#dismissAlert(alertElem)
        }
        okButton.addEventListener('click', handleOk)
        buttonContainer.appendChild(okButton)
        alertElem.appendChild(buttonContainer)
        this.#screenLockingSection.appendChild(alertElem)
        alertElem.show()

        // Set focus to button
        okButton.focus()
        this.#attachKeyboardHandler(alertElem)
    }

    /**
     * Add a pre-built custom alert element to the global alert host.
     * @param {HTMLElement} alertElem - Custom alert element, typically tpen-alert.
     */
    addCustomAlert(alertElem) {
        if (!alertElem) return

        this.#screenLockingSection.appendChild(alertElem)
        alertElem.show?.()

        const firstButton = alertElem.querySelector('button')
        firstButton?.focus?.()

        this.#attachKeyboardHandler(alertElem)
    }

    /**
     * Attach keyboard handling for the active alert.
     * @param {HTMLElement} alertElem - Alert element to dismiss on key actions.
     */
    #attachKeyboardHandler(alertElem) {
        if (this.#keydownHandler) {
            document.removeEventListener('keydown', this.#keydownHandler)
        }

        this.#keydownHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault()
                this.#dismissAlert(alertElem)
            }
        }

        document.addEventListener('keydown', this.#keydownHandler)
    }

    /**
     * Dismiss an alert and remove keyboard handler.
     */
    #dismissAlert(alertElem) {
        alertElem.dismiss()
        if (this.#keydownHandler) {
            document.removeEventListener('keydown', this.#keydownHandler)
            this.#keydownHandler = null
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
    document?.body.after(new AlertContainer())
}
