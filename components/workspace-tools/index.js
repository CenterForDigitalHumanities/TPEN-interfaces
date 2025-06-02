import "../../components/magnifier-tool/index.js"
import "../../components/special-character-tool/index.js"
import "../../components/splitscreen-tool/index.js"
import "../../components/page-tool/index.js"

export default class WorkspaceTools extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  static get observedAttributes() {
    return ['imageurl']
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'imageurl' && this.isConnected) {
      this.render()
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      .workspace-tools {
        border: 1px solid #ccc;
        margin: 0 0 20px 0;
        padding: 15px 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.1);
        position: relative;
        width: 100%;
        box-sizing: border-box;
        border-top: none;
      }
      
      .no-top-radius {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
      }

      .top-bar {
        display: flex;
        gap: 15px;
        justify-content: center;
        align-items: center;
        width: 100%;
        flex-wrap: wrap;
      }

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

      .canvas-image {
        max-width: 100%;
        border-radius: 12px;
        border: 1.5px solid #ccc;
        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
        user-select: none;
        display: block;
      }
    </style>
    <div class="workspace-tools no-top-radius">
      <div class="top-bar">
        <tpen-splitscreen-tool></tpen-splitscreen-tool>
        <tpen-page-tool></tpen-page-tool>
        <tpen-special-character-tool-button></tpen-special-character-tool-button>
        <tpen-magnifier-tool></tpen-magnifier-tool>
      </div>
      <tpen-special-character-tool></tpen-special-character-tool>
    </div>

    <div class="workspace-tools" aria-label="Image Workspace" style="padding: 0">
      <img
        class="canvas-image"
        src="${this.getAttribute('imageURL')}"
        alt="Image Workspace"
        draggable="false"
        onerror="this.src='../../assets/images/404_PageNotFound.jpeg'; this.alt='Page Not Found';"
      />
    </div>
    `
  }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)