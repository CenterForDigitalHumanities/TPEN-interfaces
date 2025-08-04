import './Toast.js'
import { eventDispatcher } from '../../../api/events.js'

class ToastContainer extends HTMLElement {
    #containerSection
    #lockingSection

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.render()
    }

    connectedCallback() {
        eventDispatcher.on('tpen-toast', ({ detail }) => this.addToast(detail?.message, detail?.status, detail?.type))
    }

    /**
     * Discern what kind of toast to build and put on screen.
     *
     * @params message {String} A message to show in the toast.
     * @params status {String} A status to use as a class.
     * @params type {String} The type of toast for varied functionality.
     */
    addToast(message, status = 'info', type = 'notice') {
        // Guard against the lack of a valid message
        if (!message || typeof message !== 'string') return
        const { matches: motionOK } = window.matchMedia('(prefers-reduced-motion: no-preference)')
        const toast = document.createElement('tpen-toast')
        switch (type) {
            case 'confirm':
                // A mock of the javascript confirm() that returns a boolean based on what the user clicks.
                return new Promise((resolve) => {
                    const yesButton = document.createElement('button')
                    yesButton.textContent = "yes"
                    const noButton = document.createElement('button')
                    noButton.textContent = "no"
                    toast.textContent = message
                    const handleYes = (eventDispatcher) => {
                        eventDispatcher.dispatchEvent(new CustomEvent('tpen-toast-confirmed-yes', {}))
                        toast.lift()
                        return resolve(true)
                    }
                    const handleNo = (e) => {
                        eventDispatcher.dispatchEvent(new CustomEvent('tpen-toast-confirmed-no', {}))
                        toast.lift()
                        return resolve(false)
                    }
                    yesButton.addEventListener('click', handleYes)
                    noButton.addEventListener('click', handleNo)
                    toast.appendChild(yesButton)
                    toast.appendChild(noButton)
                    this.#lockingSection.appendChild(toast)
                    toast.drop()
                })
            break
            case 'alert':
                // A mock of the javascript alert() which locks up the screen until the user clicks out of it.
                const okButton = document.createElement('button')
                okButton.textContent = "OK"
                toast.textContent = message
                const handleOk = (e) => {
                    toast.lift()
                }
                okButton.addEventListener('click', handleOk)
                toast.appendChild(okButton)
                this.#lockingSection.appendChild(toast)
                toast.drop()
            break
            case 'dismissible':
                // A regular looking toast that stays until dismissed with a click
                toast.textContent = message
                toast.classList.add(status)
                toast.classList.add('dismissible')
                this.flipToast(toast)
                toast.addEventListener("click", (e) => {
                    toast.dismiss()
                })
                toast.call()
            break
            case 'notice':
            default:
                 // The standard toast that appears then disappears automatically
                toast.textContent = message
                toast.classList.add(status)
                this.flipToast(toast)
                toast.show()
        }
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
            .toast-screen-lock {
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
            .toast-screen-lock.show {
                opacity: 1;
                height: 100vh;
            }
            tpen-toast {
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
            .toast-group tpen-toast {
                bottom: 20px;
                right: 0px;
            }
            .toast-screen-lock tpen-toast {
                top: 0px;
                right: 20px;
            }
            @media (prefers-reduced-motion) {
                .toast-group tpen-toast {
                    opacity: 1.0;
                    height: 18px;
                    right: 20px;
                }
                .toast-screen-lock tpen-toast { 
                    opacity: 1.0;
                    height: 18px;
                    top: 5vh;
                }
            }
            .toast-group tpen-toast.show {
                opacity: 1.0;
                height: 18px;
                right: 20px;
            }
            .toast-screen-lock tpen-toast.show {
                opacity: 1.0;
                height: 18px;
                top: 5vh;
            }
        `
        // This section will take over the screen and lock down screen interaction.  It lives at the top of the viewport.
        const lockingSection = document.createElement('section')
        lockingSection.classList.add('toast-screen-lock')

        // This is for notification and dismissible toasts.  It does not lock down the screen.  It lives at the bottom of the viewport. 
        const section = document.createElement('section')
        section.classList.add('toast-group')

        this.shadowRoot.innerHTML = ''
        this.shadowRoot.appendChild(style)
        this.shadowRoot.appendChild(section)
        this.shadowRoot.appendChild(lockingSection)
        this.#containerSection = section
        this.#lockingSection = lockingSection
    }
}

customElements.define('tpen-toast-container', ToastContainer)

document?.body.after(new ToastContainer())
