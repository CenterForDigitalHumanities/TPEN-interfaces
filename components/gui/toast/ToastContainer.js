import './Toast.js'
import { eventDispatcher } from '../../../api/events.js'

class ToastContainer extends HTMLElement {
    #containerSection

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        eventDispatcher.on('tpen-toast', ({ detail }) => this.addToast(detail?.message, detail?.status, detail?.dismissible))
    }

    /**
     * Discern what kind of toast to build and put on screen.
     * A confirm toast is asyncronous.  It waits on a user choice.
     *
     * @params message {String} A message to show in the toast.
     * @params status {String} A status to use as a class.
     * @params dismissible {Boolean} Whether or not the user must click the toast to dismiss it.
     */
    addToast(message, status = 'info', dismissible = false) {
        // Guard against the lack of a valid message
        if (!message || typeof message !== 'string') return
        const { matches: motionOK } = window.matchMedia('(prefers-reduced-motion: no-preference)')
        const toast = document.createElement('tpen-toast')
        toast.textContent = message
        toast.classList.add(status)
        this.flipToast(toast)
        if (dismissible) {
            toast.classList.add('dismissible')
            toast.addEventListener("click", (e) => {
                toast.dismiss()
            })
        }
        toast.show()
    }

    /**
     * FIRST LAST INVERT PLAY
     * @see https://aerotwist.com/blog/flip-your-animations/
     */
    flipToast(toast) {
        const first = this.offsetHeight
        this.#containerSection.appendChild(toast)
        const last = this.offsetHeight
        const invert = last - first
        const animation = this.animate([
            { transform: `translateY(${invert}px)` },
            { transform: 'translateY(0)' }
        ], {
            duration: 150,
            easing: 'ease-out',
        })
        Array.from(this.#containerSection.children).forEach(t => animation.play())
        return animation.finished
    }

    render() {
        const style = document.createElement('style')
        style.textContent = `
            .toast-group {
                position: fixed;
                z-index: 1;
                inset-block-end: 0;
                inset-inline: 0;
                padding-block-end: 5vh;
                display: grid;
                justify-items: center;
                justify-content: center;
                gap: 1vh;
                user-select: none;
            }
            tpen-toast {
                display: block;
                position: relative;
                bottom: 20px;
                right: 0px;
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                opacity: 0.0;
                height: 0px;
                transition: all 0.3s ease-in-out;
                background-color: #333;
                color: #fff;
            }
            @media (prefers-reduced-motion) {
                tpen-toast {
                    opacity: 1.0;
                    height: 18px;
                    right: 20px;
                }
            }
            tpen-toast.show {
                opacity: 1.0;
                height: 18px;
                right: 20px;
            }
            tpen-toast.success {
                background-color: green;
                color: white;
            }
            tpen-toast.error {
                background-color: red;
                color: white;
            }
            tpen-toast.info {
                background-color: #333;
                color: #fff;
            }
            tpen-toast.dismissible {
                border: 4px solid black;
                padding: 10px 30px;
                box-shadow: 2px 2px 4px black;
            }
            tpen-toast.dismissible::after {
                content: "x";
                font-weight: bold;
                font-size: 10pt;
                position: absolute;
                top: 2px;
                right: 2px;
                height: 16px;
                width: 16px;
                line-height: 16px;
                text-align: center;
                border-radius: 50%;
                background-color: rgba(0, 0, 0, 0.25);
                border: 1px solid black;
                padding: 0px 0px 2px 1px;
                cursor: pointer;
            }
        `
        const section = document.createElement('section')
        section.classList.add('toast-group')
        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(section)
        this.#containerSection = section
    }
}

customElements.define('tpen-toast-container', ToastContainer)

document?.body.after(new ToastContainer())
