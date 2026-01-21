import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import CheckPermissions from "../check-permissions/checkPermissions.js"
import "../../components/quicktype-tool/index.js"
import "../../components/splitscreen-tool/index.js"
import "../../components/page-tool/index.js"
import { MagnifierTool, showMagnifier } from "../magnifier-tool/index.js"

export default class WorkspaceTools extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.magnifierTool = null
    this._magnifierClickHandler = null
  }

  connectedCallback() {
    // If project is already loaded, run authgate immediately
    if (TPEN.activeProject?._createdAt) {
      this.authgate()
    }
    eventDispatcher.on("tpen-project-loaded", this.authgate.bind(this))
  }

  authgate() {
    if (!CheckPermissions.checkViewAccess("TOOLS", "ANY")) {
      this.remove()
      return
    }
    this.render()
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      .workspace-tools {
        padding: 15px 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        background: rgb(254, 248, 228);
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

      .magnifier-btn {
        user-select: none;
      }
    </style>
    <div class="workspace-tools no-top-radius">
      <div class="top-bar">
        <tpen-splitscreen-tool></tpen-splitscreen-tool>
        <tpen-page-tool></tpen-page-tool>
        ${
          // TPEN.activeProject.config?.quicktype?.enabled
          true ? `<tpen-quicktype-tool-button></tpen-quicktype-tool-button>` : ""
        }
        <button class="magnifier-btn tools-btn" type="button" title="Toggle Magnifier" aria-label="Toggle Magnifier">Inspect 🔍</button>
      </div>
      ${
        // TPEN.activeProject.config?.quicktype?.enabled
        true ? `<tpen-quicktype-tool style="width: 100%"></tpen-quicktype-tool>` : ""
      }
      </div>
    `

  this.magnifierBtn = this.shadowRoot.querySelector(".magnifier-btn")
  
  // Remove old event listener if it exists to prevent duplicates
  if (this._magnifierClickHandler && this.magnifierBtn) {
    this.magnifierBtn.removeEventListener("click", this._magnifierClickHandler)
  }
  
  // Store the handler so we can remove it later if render() is called again
  this._magnifierClickHandler = () => {
    const iface = document.querySelector('[data-interface-type="transcription"]')
    const transcriptionInterface = iface?.shadowRoot

    if (!this.magnifierTool) {
      this.magnifierTool = new MagnifierTool()
      document.body.appendChild(this.magnifierTool)
    }

    // Prefer standard fragment image; fall back to simple-transcription top image
    const fragmentEl = transcriptionInterface?.querySelector("tpen-image-fragment")
    const fragmentImg = fragmentEl?.shadowRoot?.querySelector("img")
    const simpleTopImg = transcriptionInterface?.querySelector("#imgTop img")
    const img = fragmentImg || simpleTopImg
    if (img) this.magnifierTool.imageElem = img

    // Toggle behavior: hide if visible, otherwise show
    if (this.magnifierTool.isMagnifierVisible) {
      this.magnifierTool.hideMagnifier()
      fragmentEl?.style.removeProperty("z-index")
      if (this._magnifierEscHandler) {
        window.removeEventListener("keydown", this._magnifierEscHandler)
        this._magnifierEscHandler = null
      }
      this.magnifierBtn.blur()
      return
    }

    showMagnifier(this.magnifierTool)

    // Only adjust z-index for standard fragment interface
    fragmentEl?.style.setProperty("z-index", "10")

    this._magnifierEscHandler = (e) => {
      if (e.key === "Escape") {
        this.magnifierTool.hideMagnifier()
        fragmentEl?.style.removeProperty("z-index")
        this.magnifierBtn.blur()
        window.removeEventListener("keydown", this._magnifierEscHandler)
        this._magnifierEscHandler = null
      }
    }
    window.addEventListener("keydown", this._magnifierEscHandler)
  }
  
  if (this.magnifierBtn) {
    this.magnifierBtn.addEventListener("click", this._magnifierClickHandler)
  }
  }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)
