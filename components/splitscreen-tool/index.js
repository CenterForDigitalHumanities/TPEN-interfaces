export default class SplitscreenTool extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
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
                border: 1.5px solid #ccc;
                background-color: #f0f4ff;
                cursor: pointer;
                transition: border-color 0.3s ease;
                min-width: 180px;
            }

            select.dropdown-select:focus {
                outline: none;
                border-color: #3a86ff;
                box-shadow: 0 0 6px #3a86ff;
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
        </style>
        <select class="dropdown-select tools-btn" aria-label="Select split screen tool">
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