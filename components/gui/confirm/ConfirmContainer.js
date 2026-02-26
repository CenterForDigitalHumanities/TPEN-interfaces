import './Confirm.js'
import { eventDispatcher } from '../../../api/events.js'
import { CleanupRegistry } from '../../../utilities/CleanupRegistry.js'

/**
 * ConfirmContainer - Global container for displaying confirmation dialogs.
 * Listens for 'tpen-confirm' events and displays modal confirm dialogs.
 * @element tpen-confirm-container
 */
class ConfirmContainer extends HTMLElement {
    #screenLockingSection
    #confirmElem
    #activeConfirmId = null
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        const confirmHandler = ({ detail }) => this.addConfirm(detail?.message, detail?.positiveButtonText, detail?.negativeButtonText, detail?.confirmId)
        const positiveHandler = ({ detail }) => {
            if (this.#activeConfirmId && detail?.confirmId !== this.#activeConfirmId) return
            this.#confirmElem?.dismiss()
            this.#confirmElem = null
            this.#activeConfirmId = null
        }
        const negativeHandler = ({ detail }) => {
            if (this.#activeConfirmId && detail?.confirmId !== this.#activeConfirmId) return
            this.#confirmElem?.dismiss()
            this.#confirmElem = null
            this.#activeConfirmId = null
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
     * Only one dialog may be shown at a time; a new request while a dialog is
     * already visible is ignored.
     *
     * @params message {String} A message to show in the confirm dialogue.
     * @params positiveButtonText {String} The text label for the positive confirm button.
     * @params negativeButtonText {String} The text label for the negative confirm button.
     * @params confirmId {String} Correlation token echoed in response events.
     */
    addConfirm(message, positiveButtonText, negativeButtonText, confirmId) {
        if (!message || typeof message !== 'string') return
        // Prevent multiple dialogs from stacking when actions are triggered rapidly
        if (this.#screenLockingSection.querySelector('tpen-confirm')) return
        if (!positiveButtonText || typeof positiveButtonText !== 'string') positiveButtonText = 'Yes'
        if (!negativeButtonText || typeof negativeButtonText !== 'string') negativeButtonText = 'No'
        this.#activeConfirmId = confirmId ?? null
        const buttonContainer = document.createElement("div")
        buttonContainer.classList.add("button-container")
        const confirmElem = document.createElement('tpen-confirm')
        const confirmButton = document.createElement('button')
        confirmButton.style.marginRight = "10px"
        const denyButton = document.createElement('button')
        confirmElem.textContent = message
        confirmButton.textContent = positiveButtonText
        denyButton.textContent = negativeButtonText
        const handlePositive = () => {
            eventDispatcher.dispatch("tpen-confirm-positive", { confirmId })
        }
        const handleNegative = () => {
            eventDispatcher.dispatch("tpen-confirm-negative", { confirmId })
        }
        confirmButton.addEventListener('click', handlePositive)
        denyButton.addEventListener('click', handleNegative)
        buttonContainer.appendChild(confirmButton)
        buttonContainer.appendChild(denyButton)
        confirmElem.appendChild(buttonContainer)
        this.#screenLockingSection.appendChild(confirmElem)
        this.#confirmElem = confirmElem
        confirmElem.show()
        // Delay matches the show() animation (1ms setTimeout + CSS transition start) so the
        // button is visible before receiving focus, avoiding jarring scroll jumps.
        setTimeout(() => confirmButton.focus(), 50)
    }

    render() {
        const style = document.createElement('style')
        // We copied the :root rules from /components/gui/site/index.css.  Importing it was too much.
        style.textContent = `
            :host {
              --primary-color: hsl(186, 84%, 40%);
              --primary-light: hsl(186, 84%, 60%);
              --light-color  : hsl(186, 84%, 90%);
              --dark         : #2d2d2d;
              --white        : hsl(0, 0%, 100%);
              --gray         : hsl(0, 0%, 60%);
              --light-gray   : hsl(0, 0%, 90%);
            }
            .confirm-area {
                position: fixed;
                display: grid;
                z-index: 16;
                inset-block-start: 0;
                inset-inline: 0;
                justify-items: center;
                justify-content: center;
                height: 0vh;
                background-color: rgba(0,0,0,0.7);
                opacity: 0;
                transition: all 0.5s ease-in-out;   
            }
            .confirm-area.show {
                opacity: 1;
                height: 100vh;
            }
            tpen-confirm {
                z-index: 16;
                display: block;
                position: relative;
                background-color: #333;
                color: #fff;
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                opacity: 0.0;
                height: fit-content;
                min-width: 25vw;
                max-width: 35vw;
                transition: all 0.3s ease-in-out;
                font-size: 14pt;
            }
            .confirm-area tpen-confirm {
                top: 0px;
                right: 0px;
            }
            @media (prefers-reduced-motion) {
                .confirm-area tpen-confirm { 
                    opacity: 1.0;
                    height: fit-content;
                    top: 5vh;
                }
            }
            .confirm-area tpen-confirm.show {
                opacity: 1.0;
                height: fit-content;
                top: 5vh;
            }
            .confirm-area .button-container {
                position: relative;
                display: block;
                text-align: right;
                margin-top: 1vh;
            }
            .confirm-area button {
                position: relative;
                display: inline-block;
                cursor: pointer;
                border: none;
                padding: 10px 20px;
                background-color: var(--primary-color);
                outline: var(--primary-light) 1px solid;
                outline-offset: -3.5px;
                color: var(--white);
                border-radius: 5px;
                transition: all 0.3s;
                font-size: 12pt;
            }
            .confirm-area button:hover {
                background-color: var(--primary-light);
                outline: var(--primary-color) 1px solid;
                outline-offset: -1.5px;
            }
            .confirm-area button:focus-visible {
                outline: 3px solid var(--primary-light);
                outline-offset: 2px;
                background-color: var(--primary-light);
            }
        `
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const screenLockingSection = document.createElement('section')
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
