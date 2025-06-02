export default class PageTool extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      .tools-btn {
        padding: 8px 16px;
        border-radius: 25px;
        border: 1.5px solid #ccc;
        background-color: #f0f4ff;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.3s ease, border-color 0.3s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }
      
      .tools-btn:hover, .tools-btn:focus {
        background-color: #d0e2ff;
        border-color: #3a86ff;
        outline: none;
      }
    </style>
    <button class="tools-btn" type="button" aria-label="Page Tools">Page Tools</button>
    `
  }
}

customElements.define('tpen-page-tool', PageTool)