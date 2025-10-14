import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import CheckPermissions from "../check-permissions/checkPermissions.js"
import "../../components/magnifier-tool/index.js"
import "../../components/quicktype-tool/index.js"
import "../../components/splitscreen-tool/index.js"
import "../../components/page-tool/index.js"

export default class WorkspaceTools extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
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
        border: 1px solid rgb(254, 248, 228);
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
    </style>
    <div class="workspace-tools no-top-radius">
      <div class="top-bar">
        <tpen-splitscreen-tool></tpen-splitscreen-tool>
        <tpen-page-tool></tpen-page-tool>
        ${
          // TPEN.activeProject.config?.quicktype?.enabled
          true ? `<tpen-quicktype-tool-button></tpen-quicktype-tool-button>` : ""
        }
        ${
          TPEN.activeProject.tools.find(t => t.toolName === "inspect")?.custom?.enabled ? `<tpen-magnifier-tool></tpen-magnifier-tool>` : ""
        }
      </div>
      ${
        // TPEN.activeProject.config?.quicktype?.enabled
        true ? `<tpen-quicktype-tool style="width: 100%"></tpen-quicktype-tool>` : ""
      }
    </div>
    `
  }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)
