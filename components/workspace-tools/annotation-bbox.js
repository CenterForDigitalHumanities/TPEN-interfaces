import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

export default class AnnotationBbox extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.activeLine = null
    this.suppressed = false
  }

  connectedCallback() {
    eventDispatcher.on("tpen-active-line", (e) => {
      this.activeLine = TPEN.activeLine
      this.render()
    })
    eventDispatcher.on("tpen-hide-annotation-bbox", () => {
      this.suppressed = true
      this.render()
    })
    eventDispatcher.on("tpen-show-annotation-bbox", () => {
      this.suppressed = false
      this.render()
    })
    this.render()
  }

  render() {
    if (this.suppressed || !this.activeLine) {
      this.shadowRoot.innerHTML = ""
      return
    }
    // Assume activeLine has a bbox property: { x, y, width, height } in percentages
    const { bbox } = this.activeLine
    const margin = 2
    const left = bbox.x - margin
    const top = bbox.y - margin
    const width = bbox.width + 2 * margin
    const height = bbox.height + 2 * margin

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          pointer-events: none
          position: absolute
          top: 0
          left: 0
          width: 100%
          height: 100%
        }
        .bbox {
          position: absolute
          border: 2px solid red
          left: ${left}%
          top: ${top}%
          width: ${width}%
          height: ${height}%
          box-sizing: border-box
        }
      </style>
      <div class="bbox"></div>
    `
  }
}

customElements.define("tpen-annotation-bbox", AnnotationBbox)
