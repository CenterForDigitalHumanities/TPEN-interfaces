export default class WorkspaceTools extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.isMagnifierVisible = false
        this.dragOffset = { x: 0, y: 0 }
        this.isDragging = false
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

        const magnifierBtn = this.shadowRoot.querySelector('.magnifier-btn')
        const magnifier = this.shadowRoot.querySelector('.magnifier')
        const img = this.shadowRoot.querySelector('.canvas-image')

        magnifierBtn.addEventListener('click', () => {
          if (this.isMagnifierVisible) {
            this.hideMagnifier()
          } else {
            this.showMagnifier()
          }
        })

        magnifier.addEventListener('mousedown', (e) => {
          e.preventDefault()
          this.isDragging = true

          const rect = magnifier.getBoundingClientRect()
          this.dragOffset.x = e.clientX - rect.left
          this.dragOffset.y = e.clientY - rect.top

          magnifier.style.cursor = 'grabbing'
        })

        window.addEventListener('mousemove', (e) => {
          if (!this.isDragging) return
          e.preventDefault()

          const shadowRootRect = this.shadowRoot.host.getBoundingClientRect()
          const imgRect = img.getBoundingClientRect()
          const magnifierSize = 200
          const zoomMultiplier = 2
          const halfSize = magnifierSize / 2

          const maxOffsetX = imgRect.width - halfSize
          const maxOffsetY = imgRect.height - halfSize

          let newX = e.clientX - this.dragOffset.x
          let newY = e.clientY - this.dragOffset.y

          let centerXInImage = Math.min(Math.max(newX + halfSize - imgRect.left, halfSize / 2), maxOffsetX + halfSize / 2)
          let centerYInImage = Math.min(Math.max(newY + halfSize - imgRect.top, halfSize / 2), maxOffsetY + halfSize / 2)

          newX = centerXInImage + imgRect.left - halfSize
          newY = centerYInImage + imgRect.top - halfSize

          magnifier.style.left = `${newX - shadowRootRect.left}px`
          magnifier.style.top = `${newY - shadowRootRect.top}px`

          magnifier.style.backgroundPositionX = `${-((centerXInImage / imgRect.width) * img.width * zoomMultiplier - halfSize)}px`
          magnifier.style.backgroundPositionY = `${-((centerYInImage / imgRect.height) * img.height * zoomMultiplier - halfSize)}px`
        })

        window.addEventListener('mouseup', () => {
          if (this.isDragging) {
            this.isDragging = false
            magnifier.style.cursor = 'grab'
          }
        })

        window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.isMagnifierVisible) {
            this.hideMagnifier()
          }
        })

        const specialCharBtn = this.shadowRoot.querySelector('.special-char-btn')
        const charPanel = this.shadowRoot.querySelector('.char-panel')
        const closeCharBtn = this.shadowRoot.querySelector('.close-char-btn')
        const editCharBtn = this.shadowRoot.querySelector('.edit-char-btn')

        closeCharBtn.addEventListener('click', () => {
          charPanel.style.display = 'none'
        })

        editCharBtn.addEventListener('click', () => {
          window.location.href = '/components/hot-keys/manage-hotkeys.html'
        })

        specialCharBtn.addEventListener('click', () => {
          charPanel.style.display = 'flex'
        })

        this.shadowRoot.querySelectorAll('.char-button').forEach(btn => {
          btn.addEventListener('click', () => {
          const char = btn.textContent
          let textAreaContent = document.querySelector('tpen-transcription-interface').shadowRoot.querySelector('tpen-transcription-block').shadowRoot.querySelector('.transcription-input')

          if (textAreaContent && textAreaContent instanceof HTMLInputElement) {
            const start = textAreaContent.selectionStart
            const end = textAreaContent.selectionEnd
            const value = textAreaContent.value

            textAreaContent.value = value.slice(0, start) + char + value.slice(end)
            textAreaContent.selectionStart = textAreaContent.selectionEnd = start + char.length
            textAreaContent.focus()
          }
        })
      })
    }

    showMagnifier() {
      const magnifier = this.shadowRoot.querySelector('.magnifier')
      const img = this.shadowRoot.querySelector('.canvas-image')
      if (!magnifier || !img) return

      const magnifierSize = 200
      magnifier.style.width = `${magnifierSize}px`
      magnifier.style.height = `${magnifierSize}px`

      magnifier.style.display = 'block'
      magnifier.style.backgroundImage = `url(${img.src})`
      magnifier.style.backgroundSize = `${img.width * 2}px ${img.height * 2}px`

      magnifier.style.left = `${img.offsetLeft}px`
      magnifier.style.top = `${img.offsetTop}px`
      magnifier.style.backgroundPosition = `0px 0px`

      this.isMagnifierVisible = true
    }

    hideMagnifier() {
      const magnifier = this.shadowRoot.querySelector('.magnifier')
      if (!magnifier) return
      magnifier.style.display = 'none'
      this.isMagnifierVisible = false
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

        .special-char-btn {
          background-color: #f0f4ff;
          border-color: #ccc;
        }
        .special-char-btn:hover, .special-char-btn:focus {
          background-color: #d0e2ff;
          border-color: #3a86ff;
        }

        .magnifier-btn {
          user-select: none;
        }

        .magnifier {
          display: none;
          position: absolute;
          border: 3px solid #333;
          border-radius: 50%;
          cursor: grab;
          width: 320px;
          height: 320px;
          background-repeat: no-repeat;
          background-size: calc(100% * 3) calc(100% * 3);
          pointer-events: all;
          box-shadow: 0 0 12px rgba(0,0,0,0.3);
          user-select: none;
          z-index: 20;
          top: 60px;
          right: 20px;
        }

        .canvas-image {
          max-width: 100%;
          border-radius: 12px;
          border: 1.5px solid #ccc;
          box-shadow: 0 6px 12px rgba(0,0,0,0.1);
          user-select: none;
          display: block;
        }

        .char-panel {
          width: 100%;
          display: none;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 16px;
          background: #f9f9f9;
          border: 1px solid #ccc;
          border-radius: 12px;
          margin-top: 16px;
          box-sizing: border-box;
          position: relative;
        }

        .char-button {
          padding: 8px 12px;
          font-size: 18px;
          background: #eee;
          border: 1px solid #ccc;
          border-radius: 6px;
          cursor: pointer;
          user-select: none;
          transition: background 0.2s ease;
        }

        .char-button:hover {
          background: #ddd;
        }

        .panel-controls {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 8px;
        }

        .panel-btn {
          padding: 4px 10px;
          font-size: 12px;
          background-color: #f0f4ff;
          border: 1px solid #ccc;
          border-radius: 20px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .panel-btn:hover {
          background-color: #d0e2ff;
        }
      </style>

      <div class="workspace-tools no-top-radius">
        <div class="top-bar">
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

          <button class="tools-btn" type="button" aria-label="Page Tools">Page Tools</button>

          <button class="tools-btn special-char-btn" type="button" aria-label="Toggle Special Characters Panel">
            Special Characters 💻
          </button>

          <button class="magnifier-btn tools-btn" type="button" title="Toggle Magnifier" aria-label="Toggle Magnifier">
            Inspect 🔍
          </button>
        </div>

       <div class="char-panel" role="region" aria-label="Special Characters Panel" tabindex="0">
          <div class="panel-controls">
            <button class="panel-btn edit-char-btn" type="button" aria-label="Edit special characters">Edit</button>
            <button class="panel-btn close-char-btn" type="button" aria-label="Close special characters panel">Close</button>
          </div>

          <button class="char-button" type="button" aria-label="Greek letter alpha">α</button>
          <button class="char-button" type="button" aria-label="Greek letter beta">β</button>
          <button class="char-button" type="button" aria-label="Greek letter gamma">γ</button>
        </div>

        <div class="magnifier"></div>
      </div>

      <div class="workspace-tools" aria-label="Image Workspace" style="padding: 0">
        <img
          class="canvas-image"
          src="https://iiif.io/api/image/3.0/example/reference/15f769d62ca9a3a2deca390efed75d73-3_titlepage1/full/max/0/default.jpg"
          alt="Reference Title Page"
          draggable="false"
        />
      </div>
    `
  }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)