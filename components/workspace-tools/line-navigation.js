import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

export default class LineNavButton extends HTMLElement {
  // The direction should be provided as an attribute: "prev" or "next"
  direction = this.getAttribute("direction") || "next"
  buttonText = ""

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()
    this.setupListeners()
    // Update the button when the active line changes.
    eventDispatcher.on("tpen-active-line", () => {
      this.updateButtonText()
    })
  }

  setupListeners() {
    const btn = this.shadowRoot.querySelector("button")
    if (btn) {
      btn.addEventListener("click", () => {
        if (this.direction === "prev") {
          eventDispatcher.dispatch("tpen-line-previous")
        } else {
          eventDispatcher.dispatch("tpen-line-next")
        }
      })
    }
  }

  updateButtonText() {
    const activeLine = TPEN.activeLine
    // Set default text values
    let text = this.direction === "prev" ? "Previous Line" : "Next Line"
    if (activeLine) {
      // If the active line indicates a boundary, adjust the text.
      // The lines below is dependent on the implementation of some functions probably in TPEN to determine if activeLine isFirst or isLast of a page
      if (this.direction === "prev" && activeLine.isFirstLineOfPage) {
        text = "Previous Page"
      }
      if (this.direction === "next" && activeLine.isLastLineOfPage) {
        text = "Next Page"
      }
    }
    this.buttonText = text
    this.render()
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        button {
          flex: 1;
          padding: 0.5em;
          font-size: 1em;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        button:hover {
          background: #0056b3;
        }
      </style>
      <button>${this.buttonText || (this.direction === "prev" ? "Previous Line" : "Next Line")}</button>
    `
  }
}

customElements.define("tpen-line-nav-button", LineNavButton)
