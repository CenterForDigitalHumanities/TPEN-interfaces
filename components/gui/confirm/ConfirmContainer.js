import './Confirm.js'
import { eventDispatcher } from '../../../api/events.js'

class ConfirmContainer extends HTMLElement {
    #lockingSection
    #confirmElem

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        eventDispatcher.on('tpen-confirm', ({ detail }) => this.addConfirm(detail?.message, detail?.positiveButtonText, detail.negativeButtonText))
        eventDispatcher.on('tpen-confirm-positive', () => this.#confirmElem.lift())
        eventDispatcher.on('tpen-confirm-negative', () => this.#confirmElem.lift())
    }

    /**
     * Add the confirm dialogue with positive and negative confirmation buttons.
     *
     * @params message {String} A message to show in the confirm dialogue.
     * @params positiveButtonText {String} The text label for the positive confirm button.
     * @params negativeButtonText {String} The text label for the negative confirm button.
     */
    addConfirm(message, positiveButtonText, negativeButtonText) {
        if (!message || typeof message !== 'string') return
        if (!positiveButtonText || typeof positiveButtonText !== 'string') positiveButtonText = 'Yes'
        if (!negativeButtonText || typeof negativeButtonText !== 'string') negativeButtonText = 'No'
        const { matches: motionOK } = window.matchMedia('(prefers-reduced-motion: no-preference)')
        const buttonContainer = document.createElement("div")
        buttonContainer.classList.add("button-container")
        const confirmElem = document.createElement('tpen-confirm')
        const confirmButton = document.createElement('button')
        confirmButton.style.marginRight = "10px"
        const denyButton = document.createElement('button')
        confirmElem.textContent = message
        confirmButton.textContent = positiveButtonText
        denyButton.textContent = negativeButtonText
        const handlePositive = (e) => {
            eventDispatcher.dispatch("tpen-confirm-positive")
        }
        const handleNegative = (e) => {
            eventDispatcher.dispatch("tpen-confirm-negative")
        }
        confirmButton.addEventListener('click', handlePositive)
        denyButton.addEventListener('click', handleNegative)
        buttonContainer.appendChild(confirmButton)
        buttonContainer.appendChild(denyButton)
        confirmElem.appendChild(buttonContainer)
        this.#lockingSection.appendChild(confirmElem)
        this.#confirmElem = confirmElem
        confirmElem.drop()
    }

    render() {
        const style = document.createElement('style')
        // FIXME we copied the :root rules from /components/gui/site/index.css.  Importing it was too much.
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
        `
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const lockingSection = document.createElement('section')
        lockingSection.classList.add('confirm-area')

        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(lockingSection)
        this.#lockingSection = lockingSection
    }
}

customElements.define('tpen-confirm-container', ConfirmContainer)

document?.body.after(new ConfirmContainer())
