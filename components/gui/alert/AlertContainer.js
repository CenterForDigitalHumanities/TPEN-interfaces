import './Alert.js'
import { eventDispatcher } from '../../../api/events.js'

class AlertContainer extends HTMLElement {
    #lockingSection

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        eventDispatcher.on('tpen-alert', ({ detail }) => this.addAlert(detail?.message, detail?.buttonText))
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
        const { matches: motionOK } = window.matchMedia('(prefers-reduced-motion: no-preference)')
        const alertElem = document.createElement('tpen-alert')
        const okButton = document.createElement('button')
        const buttonContainer = document.createElement('div')
        buttonContainer.classList.add("button-container")
        okButton.textContent = buttonText
        alertElem.textContent = message
        const handleOk = (e) => {
            alertElem.lift()
        }
        okButton.addEventListener('click', handleOk)
        buttonContainer.appendChild(okButton)
        alertElem.appendChild(buttonContainer)
        this.#lockingSection.appendChild(alertElem)
        alertElem.drop()
    }

    render() {
        const style = document.createElement('style')
        style.textContent = `
            .alert-area {
                position: fixed;
                display: grid;
                z-index: 16;
                inset-block-start: 0;
                inset-inline: 0;
                justify-items: center;
                justify-content: center;
                height: 0vh;
                background-color: rgba(0,0,0,0.5);
                opacity: 0;
                transition: all 0.5s ease-in-out;   
            }
            .alert-area.show {
                opacity: 1;
                height: 100vh;
            }
            tpen-alert {
                z-index: 16;
                display: block;
                position: relative;
                background-color: #333;
                color: #fff;
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                opacity: 0.0;
                height: 0px;
                transition: all 0.3s ease-in-out;   
            }
            .alert-area tpen-alert {
                top: 0px;
                right: 20px;
            }
            @media (prefers-reduced-motion) {
                .alert-area tpen-alert { 
                    opacity: 1.0;
                    height: fit-content;
                    top: 5vh;
                }
            }
            .alert-area tpen-alert.show {
                opacity: 1.0;
                height: fit-content;
                top: 5vh;
            }
            .alert-area button {
                position: relative;
                display: inline-block;
            }
            .alert-area .button-container {
                position: relative;
                display: block;
                text-align: right;
            }
        `
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const lockingSection = document.createElement('section')
        lockingSection.classList.add('alert-area')

        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(lockingSection)
        this.#lockingSection = lockingSection
    }
}

customElements.define('tpen-alert-container', AlertContainer)

document?.body.after(new AlertContainer())
