import { eventDispatcher } from "../../api/events.js"

export default class LineNavigation extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()
    this.addListeners()
  }

  addListeners() {
    const prevButton = this.shadowRoot.querySelector(".prev-button")
    const nextButton = this.shadowRoot.querySelector(".next-button")
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        eventDispatcher.dispatch("tpen-line-previous")
      })
    }
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        eventDispatcher.dispatch("tpen-line-next")
      })
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .line-navigation {
          display: flex
          justify-content: space-between
          gap: 1em
        }
        button {
          flex: 1
          padding: 0.5em
          font-size: 1em
          background: #007bff
          color: #fff
          border: none
          border-radius: 4px
          cursor: pointer
        }
        button:disabled {
          background: #aaa
          cursor: not-allowed
        }
      </style>
      <div class="line-navigation">
        <button class="prev-button">Previous Line</button>
        <button class="next-button">Next Line</button>
      </div>
    `
  }
}

customElements.define("tpen-line-navigation", LineNavigation)
