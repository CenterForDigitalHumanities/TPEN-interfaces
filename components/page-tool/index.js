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
        border: 1.5px solid rgb(0, 90, 140);
        background-color: rgb(0, 90, 140);
        color: white;
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
        background-color: white;
        border-color: rgb(0, 90, 140);
        color: rgb(0, 90, 140);
        outline: none;
      }
    </style>
    <button class="tools-btn" type="button" aria-label="Page Tools">Page Tools</button>
    `
  }
}

customElements.define('tpen-page-tool', PageTool)