import TPEN from "../../api/TPEN.js"
export default class AnnotationBbox extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.line = null
    this.suppressed = false
  }

  connectedCallback() {
    TPEN.eventDispatcher.on("tpen-active-line", (e) => {
      this.line = TPEN.activeLine
      this.render()
    })
    TPEN.eventDispatcher.on("tpen-hide-annotation-bbox", () => {
      this.suppressed = true
      this.render()
    })
    TPEN.eventDispatcher.on("tpen-show-annotation-bbox", () => {
      this.suppressed = false
      this.render()
    })
  }

  render() {
    if (this.suppressed || !this.line) {
      this.shadowRoot.innerHTML = ""
      return
    }
    // Assume activeLine has a bbox property: { x, y, width, height } in percentages
    const { bbox } = this.line
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
