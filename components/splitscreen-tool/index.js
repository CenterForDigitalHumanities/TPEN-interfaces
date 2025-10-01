import CheckPermissions from "../check-permissions/checkPermissions.js"
import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import { onProjectReady } from "../../utilities/projectReady.js"

export default class SplitscreenTool extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
      this._unsubProject = onProjectReady(this, this.authgate)
    }

    authgate() {
      // Only render if the user has view access to the project
      if (!CheckPermissions.checkViewAccess('TOOL', 'ANY')) {
        this.remove()
        return
      }
      this.render()
      this.addEventListeners()
    }

    disconnectedCallback() {
      try { this._unsubProject?.() } catch {}
    }

    addEventListeners() {
      const dropdown = this.shadowRoot.querySelector('.dropdown-select')
      if (dropdown) {
        dropdown.addEventListener('click', (e) => {
          e.target.dataset.prev = e.target.value
        })

        dropdown.addEventListener('change', (e) => {
            const value = e.target.value
            this.dispatchEvent(new CustomEvent('splitscreen-toggle', {
                bubbles: true,
                composed: true,
                detail: { selectedTool: value },
            }))
            if (e.target.dataset.prev) eventDispatcher.dispatch(`tpen-${e.target.dataset.prev}-hide`)
            eventDispatcher.dispatch(`tpen-${value}-show`)
        })
      }
    }

    render() {
      const tools = TPEN.activeProject?.tools.filter(t=>{
        return t.custom?.enabled && (t.location === "sidebar" || t.location === "pane")
      }) || []

      if(tools.length === 0) { this.remove() }
      
      const toolOptions = tools.map(tool => 
        `<option value="${tool.toolName}">${tool.label}</option>`
      ).join('')

      this.shadowRoot.innerHTML = `
        <style>
            select.dropdown-select {
                padding: 8px 14px;
                font-size: 14px;
                border-radius: 8px;
                border: 1.5px solid rgb(0, 90, 140);
                background-color: #f0f4ff;
                cursor: pointer;
                transition: border-color 0.3s ease;
                min-width: 180px;
            }

            select.dropdown-select:focus {
                outline: none;
                border-color: rgb(0, 90, 140);
                box-shadow: 0 0 6px rgb(0, 90, 140);
            }
        </style>
        <select class="dropdown-select" aria-label="Select split screen tool">
            <option value="" selected disabled>Splitscreen Tools</option>
            ${toolOptions}
        </select>
        `
    }
}

customElements.define('tpen-splitscreen-tool', SplitscreenTool)
