import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import CheckPermissions from "../check-permissions/checkPermissions.js"
import "../../components/special-character-tool/index.js"
import "../../components/splitscreen-tool/index.js"
import "../../components/page-tool/index.js"
import { MagnifierTool, showMagnifier } from "../magnifier-tool/index.js"

export default class WorkspaceTools extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.magnifierTool = null
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
          // TPEN.activeProject.config?.specialCharacters?.enabled
          true ? `<tpen-special-character-tool-button></tpen-special-character-tool-button>` : ""
        }
        <button class="magnifier-btn tools-btn" type="button" title="Toggle Magnifier" aria-label="Toggle Magnifier">Inspect 🔍</button>
      </div>
      ${
        // TPEN.activeProject.config?.specialCharacters?.enabled
        true ? `<tpen-special-character-tool style="width: 100%"></tpen-special-character-tool>` : ""
      }
    </div>
    `

    this.magnifierBtn = this.shadowRoot.querySelector(".magnifier-btn")
    this.magnifierBtn.addEventListener("click", () => {
        const transcriptionInterface = document.querySelector("tpen-transcription-interface")?.shadowRoot

        if (!this.magnifierTool) {
            this.magnifierTool = new MagnifierTool()
            document.body.appendChild(this.magnifierTool)
        }

        const img = transcriptionInterface?.querySelector("tpen-image-fragment")?.shadowRoot?.querySelector("img")
        if (img) this.magnifierTool.imageElem = img

        showMagnifier(this.magnifierTool)

        transcriptionInterface?.querySelector("tpen-image-fragment").style.setProperty("z-index", "10")

        const escFunction = (event) => {
            if (event.key === "Escape") {
                this.magnifierTool.hideMagnifier()
                transcriptionInterface?.querySelector("tpen-image-fragment").style.removeProperty("z-index")
                window.removeEventListener("keydown", escFunction)
            }
        }

        window.removeEventListener("keydown", escFunction)
        window.addEventListener("keydown", escFunction)
    })
  }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)
