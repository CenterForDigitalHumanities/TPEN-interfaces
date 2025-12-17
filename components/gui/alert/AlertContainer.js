import './Alert.js'
import { eventDispatcher } from '../../../api/events.js'

class AlertContainer extends HTMLElement {
    #screenLockingSection

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
            alertElem.dismiss()
        }
        okButton.addEventListener('click', handleOk)
        buttonContainer.appendChild(okButton)
        alertElem.appendChild(buttonContainer)
        this.#screenLockingSection.appendChild(alertElem)
        alertElem.show()
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
            .alert-area {
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
                height: fit-content;
                min-width: 25vw;
                max-width: 35vw;
                transition: all 0.3s ease-in-out;
                font-size: 14pt;
            }
                tpen-alert a {
                    color: var(--primary-color);
                    text-decoration: underline;
                }
            .alert-area tpen-alert {
                top: 0px;
                right: 0px;
            }
            @media (prefers-reduced-motion) {
                .alert-area tpen-alert { 
                    opacity: 1.0;
                    height: fit-content;
                    top: 5vh;
                }
            }
            .alert-area .button-container {
                position: relative;
                display: block;
                text-align: right;
                margin-top: 1vh;
            }
            .alert-area tpen-alert.show {
                opacity: 1.0;
                height: fit-content;
                top: 5vh;
            }
            .alert-area button {
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
            .alert-area button:hover {
                background-color: var(--primary-light);
                outline: var(--primary-color) 1px solid;
                outline-offset: -1.5px;
            }
        `
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const screenLockingSection = document.createElement('section')
        screenLockingSection.classList.add('alert-area')

        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(screenLockingSection)
        this.#screenLockingSection = screenLockingSection
    }
}

customElements.define('tpen-alert-container', AlertContainer)

document?.body.after(new AlertContainer())
