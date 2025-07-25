export default class FeedbackButton extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()
  }

  async showFeedback() {
    await import("../feedback/index.js")

    const modal = this.shadowRoot.querySelector("#feedback-modal")
    const backdrop = this.shadowRoot.querySelector("#feedback-backdrop")
    const content = this.shadowRoot.querySelector("#feedback-content")
    const icon = this.shadowRoot.querySelector(".feedback-icon-container")

    icon.classList.add("active", "shrunk")

    const handleTransitionEnd = () => {
      modal.classList.add("show")
      backdrop.classList.add("show")
      if (!content.querySelector("tpen-feedback")) {
        content.innerHTML = ""
        content.appendChild(document.createElement("tpen-feedback"))
      }
      icon.removeEventListener("transitionend", handleTransitionEnd)
    }
    icon.addEventListener("transitionend", handleTransitionEnd)
  }

  closeModal() {
    this.shadowRoot.querySelector("#feedback-modal").classList.remove("show")
    this.shadowRoot.querySelector("#feedback-backdrop").classList.remove("show")
    this.shadowRoot.querySelector(".feedback-icon-container").classList.remove("active", "shrunk")
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 40px;
          right: 40px;
          z-index: 10;
        }

        .feedback-icon-container {
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          background-color: var(--primary-color);
          border: 2px solid var(--primary-light);
          border-radius: 45px;
          padding: 10px 10px;
          box-shadow: 0 0 20px 4px rgba(255, 180, 60, 0.7);
          animation: glowPop 0.3s ease;
          opacity: 0.6;
          transition: 
            opacity 0.3s ease,
            transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            padding 0.4s ease,
            border-radius 0.4s ease;
        }

        .feedback-icon-container:hover,
        .feedback-icon-container.active {
          opacity: 1;
        }

        .feedback-icon-container img {
          width: 55px;
          height: 55px;
          cursor: pointer;
          transition: 
            transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            width 0.4s ease,
            height 0.4s ease;
          margin: 0 auto;
        }

        .feedback-icon-container.shrunk {
          padding: 4px;
          border-radius: 30px;
          transform: scale(0.85);
        }

        .feedback-icon-container.shrunk img {
          width: 40px;
          height: 40px;
          transform: scale(0.9);
        }

        button {
          padding: 10px 0px 10px 10px;
          color: #fff;
          background-color: var(--primary-color);
          font-size: 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          user-select: none;
        }

        .backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.1);
          z-index: 100;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .backdrop.show {
          opacity: 1;
          pointer-events: auto;
        }

        .modal {
          position: absolute;
          bottom: 60px;
          right: 0;
          width: 360px;
          max-height: 75vh;
          background-color: #f9f9f9;
          border-radius: 14px;
          box-shadow: 0 0 0 rgba(0, 0, 0, 0);
          overflow-y: auto;
          z-index: 101;
          box-sizing: border-box;
          opacity: 0;
          pointer-events: none;
          transform: scale(0.9);
          transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
        }

        .modal.show {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
          box-shadow: 0 0 20px 4px rgba(255, 180, 60, 0.7);
          animation: glowPop 0.3s ease;
        }

        @keyframes glowPop {
          0% {
            transform: scale(0.9);
            box-shadow: 0 0 0 rgba(255, 180, 60, 0);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 26px 6px rgba(255, 200, 80, 0.8);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 20px 4px rgba(255, 180, 60, 0.7);
          }
        }

        .close-btn {
          position: absolute;
          top: 8px;
          right: 10px;
          background: transparent;
          border: none;
          font-size: 30px;
          line-height: 1;
          cursor: pointer;
          color: #666;
          transition: color 0.25s ease;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          user-select: none;
        }

        .close-btn:hover {
          color: #222;
        }

        .logo {
          display: block;
          margin: 10px auto 0;
          width: 100px;
          height: auto;
        }
      </style>

      <div class="feedback-icon-container">
        <img id="feedback-button" src="../../assets/icons/feedback.png" alt="Feedback Icon">
      </div>

      <div class="backdrop" id="feedback-backdrop"></div>

      <div class="modal" id="feedback-modal">
        <img class="logo" src="../../assets/logo/logo.png" alt="TPEN Logo">
        <button class="close-btn" id="close-modal" title="Close">&times;</button>
        <div id="feedback-content"></div>
      </div>
    `

    this.shadowRoot.querySelector("#feedback-button").addEventListener("click", () => this.showFeedback())
    this.shadowRoot.querySelector("#close-modal").addEventListener("click", () => this.closeModal())
    this.shadowRoot.querySelector("#feedback-backdrop").addEventListener("click", () => this.closeModal())
  }
}

customElements.define("tpen-feedback-button", FeedbackButton)
