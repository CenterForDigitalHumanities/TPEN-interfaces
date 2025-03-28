export default class TpenSplitScreen extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    // Default left pane width is 60%
    this.leftWidthPercentage = 60
    this.dragging = false
  }

  connectedCallback() {
    this.render()
    this.addEventListeners()
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
    const container = this.shadowRoot.querySelector('.container')
    const containerRect = container.getBoundingClientRect()
    // Calculate new left width as a percentage of the container width
    let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    // Clamp between 20% and 80%
    newLeftWidth = Math.max(20, Math.min(80, newLeftWidth))
    this.leftWidthPercentage = newLeftWidth
    this.updateWidths()
  }

  onMouseUp(e) {
    this.dragging = false
  }

  updateWidths() {
    // Update CSS variables on the container to adjust pane widths without re-rendering.
    const container = this.shadowRoot.querySelector('.container')
    container.style.setProperty('--left-width', this.leftWidthPercentage + '%')
    container.style.setProperty('--right-width', (100 - this.leftWidthPercentage) + '%')
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .container {
          display: flex;
          width: 100%;
          height: 90vh;
          overflow: hidden;
          /* CSS variables control the widths */
          --left-width: ${this.leftWidthPercentage}%;
          --right-width: ${100 - this.leftWidthPercentage}%;
        }
        .left-pane {
          width: var(--left-width);
          height: 100%;
          overflow: auto;
        }
        .right-pane {
          width: var(--right-width);
          height: 100%;
          overflow: auto;
          border-left: 1px solid #ccc;
          padding: 10px;
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
