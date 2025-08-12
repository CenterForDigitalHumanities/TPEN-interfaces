import CheckPermissions from "../check-permissions/checkPermissions.js"
import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher

export default class SplitscreenTool extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
      if (TPEN.activeProject?._createdAt) {
        this.authgate()
      }
      eventDispatcher.on('tpen-project-loaded', this.authgate.bind(this))
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

    addEventListeners() {
      const dropdown = this.shadowRoot.querySelector('.dropdown-select')
      if (dropdown) {
        dropdown.addEventListener('click', () => {
          dropdown.dataset.prev = dropdown.value
        })

        dropdown.addEventListener('change', (e) => {
            const value = e.target.value
            this.dispatchEvent(new CustomEvent('splitscreen-toggle', {
                bubbles: true,
                composed: true,
                detail: { selectedTool: value },
            }))
            e.target.value = ''
        })
      }
    }

    render() {
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
            <option value="transcription">Transcription Progress</option>
            <option value="dictionary">Greek Dictionary</option>
            <option value="preview">Next Page Preview</option>
            <option value="cappelli">Cappelli</option>
            <option value="enigma">Enigma</option>
            <option value="latin-dictionary">Latin Dictionary</option>
            <option value="latin-vulgate">Latin Vulgate</option>
        </select>
        `
    }
}

customElements.define('tpen-splitscreen-tool', SplitscreenTool)
