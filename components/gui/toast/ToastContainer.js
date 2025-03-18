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
        eventDispatcher.on('tpen-toast', ({ detail }) => this.addToast(detail.message, detail.status))
    }

    addToast(message, status = 'info') {
        const { matches: motionOK } = window.matchMedia('(prefers-reduced-motion: no-preference)')
        const toast = document.createElement('tpen-toast')
        toast.textContent = message
        toast.classList.add(status)
        
        this.flipToast(toast)
        toast.show()
    }

    flipToast(toast) { // FIRST LAST INVERT PLAY https://aerotwist.com/blog/flip-your-animations/
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
                pointer-events: none;
            }
            tpen-toast {
                    display: block;
                    position: relative;
                    bottom: 20px;
                    right: 0px;
                    background-color: #333;
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    opacity: 0.0;
                    height: 0px;
                    transition: all 0.3s ease-in-out;
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
