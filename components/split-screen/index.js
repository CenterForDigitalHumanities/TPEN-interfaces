import CheckPermissions from "../check-permissions/checkPermissions.js"
import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
export default class TpenSplitScreen extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        // default left pane width is 60% (right pane 40%)
        this.leftWidthPercentage = 60
        this.dragging = false
    }

    connectedCallback() {
      eventDispatcher.on("tpen-project-loaded", () => {
        if(!CheckPermissions.checkViewAccess("TOOLS", "ANY")) {
          // No reason to get this far, but let's not risk it.
          this.remove()
          return
        }
        this.render()
        this.addEventListeners()
      })
    }

    addEventListeners() {
        const resizer = this.shadowRoot.querySelector('.resizer')
        resizer.addEventListener('mousedown', this.onMouseDown.bind(this))
        window.addEventListener('mousemove', this.onMouseMove.bind(this))
        window.addEventListener('mouseup', this.onMouseUp.bind(this))
    }

    onMouseDown(e) {
        this.dragging = true
    }

    onMouseMove(e) {
        if (!this.dragging) return
        const containerRect = this.shadowRoot.querySelector('.container').getBoundingClientRect()
        // Calculate new left width as a percentage of the container width
        let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
        // Clamp the width between 20% and 80%
        newLeftWidth = Math.max(20, Math.min(80, newLeftWidth))
        this.leftWidthPercentage = newLeftWidth
        this.updateWidths()
    }

    onMouseUp(e) {
        this.dragging = false
    }

    updateWidths() {
        const leftPane = this.shadowRoot.querySelector('.left-pane')
        const rightPane = this.shadowRoot.querySelector('.right-pane')
        leftPane.style.width = this.leftWidthPercentage + '%'
        rightPane.style.width = (100 - this.leftWidthPercentage) + '%'
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
          .container {
            display: flex;
            width: 100%;
            height: 90vh;
            overflow: hidden;
          }
          .left-pane {
            width: ${this.leftWidthPercentage}%;
            height: 100%;
            overflow: auto;
          }
          .right-pane {
            width: ${100 - this.leftWidthPercentage}%;
            height: 100%;
            overflow: auto;
            border-left: 1px solid #ccc;
            padding: 10px;
            z-index: 0;
          }
          .resizer {
            width: 5px;
            cursor: col-resize;
            background-color: #ddd;
          }
        </style>
        <div class="container">
          <div class="left-pane">
            <slot name="left"></slot>
          </div>
          <div class="resizer"></div>
          <div class="right-pane">
            <slot name="right"></slot>
          </div>
        </div>
      `
    }
}

customElements.define('tpen-split-screen', TpenSplitScreen)
