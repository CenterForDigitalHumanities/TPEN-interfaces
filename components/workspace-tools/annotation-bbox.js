import TPEN from "../../api/TPEN.js"

export default class AnnotationBbox extends HTMLElement {
  line
  isSuppressed = false
  margin = 2

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    TPEN.eventDispatcher.on("tpen-active-line", () => {
      this.line = TPEN.activeLine
      this.updateBBox()
    })
    TPEN.eventDispatcher.on("tpen-hide-annotation-bbox", () => {
      this.isSuppressed = true
      this.updateBBox()
    })
    TPEN.eventDispatcher.on("tpen-show-annotation-bbox", () => {
      this.isSuppressed = false
      this.updateBBox()
    })
    // Initial render to create the container
    this.render()
  }

  render() {
    // Always render the container; visibility will be controlled via a CSS class.
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .bbox {
          position: absolute;
          border: 2px solid red;
          box-sizing: border-box;
          transition: all 0.3s ease;
          visibility: visible;
          opacity: 1;
        }
        .hidden {
          visibility: hidden;
          opacity: 0;
        }
      </style>
      <div class="bbox"></div>
    `
  }

  updateBBox() {
    const bboxEl = this.shadowRoot.querySelector(".bbox")
    if (!bboxEl) return

    // If suppressed or there's no active line, hide the bbox via CSS class.
    if (this.isSuppressed || !this.line) {
      this.hideBBox()
      return
    }

    // Assume activeLine has a bbox property: { x, y, width, height } in percentages.
    const { bbox } = this.line
    const left = bbox.x - this.margin
    const top = bbox.y - this.margin
    const width = bbox.width + 2 * this.margin
    const height = bbox.height + 2 * this.margin

    this.moveBBoxTo({ left, top, width, height })

    // Ensure bbox is visible.
    bboxEl.classList.remove("hidden")
  }

  moveBBoxTo({ left, top, width, height }) {
    const bboxEl = this.shadowRoot.querySelector(".bbox")
    if (bboxEl) {
      bboxEl.style.left = left + "%"
      bboxEl.style.top = top + "%"
      bboxEl.style.width = width + "%"
      bboxEl.style.height = height + "%"
    }
  }

  hideBBox() {
    const bboxEl = this.shadowRoot.querySelector(".bbox")
    if (bboxEl) {
      bboxEl.classList.add("hidden")
    }
  }
}

customElements.define("tpen-annotation-bbox", AnnotationBbox)
