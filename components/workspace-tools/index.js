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

          let newX = e.clientX - this.dragOffset.x
          let newY = e.clientY - this.dragOffset.y

          const shadowRootRect = this.shadowRoot.host.getBoundingClientRect()
          const magnifierSize = 300

          let relX = newX - shadowRootRect.left
          let relY = newY - shadowRootRect.top

          relX = Math.max(img.offsetLeft, Math.min(relX, img.offsetLeft + img.width - magnifierSize))
          relY = Math.max(img.offsetTop, Math.min(relY, img.offsetTop + img.height - magnifierSize))

          magnifier.style.left = `${relX}px`
          magnifier.style.top = `${relY}px`

          const bgX = -((relX - img.offsetLeft) * 2)
          const bgY = -((relY - img.offsetTop) * 2)
          magnifier.style.backgroundPosition = `${bgX}px ${bgY}px`
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
    }

    showMagnifier() {
      const magnifier = this.shadowRoot.querySelector('.magnifier')
      const img = this.shadowRoot.querySelector('.canvas-image')
      if (!magnifier || !img) return

      magnifier.style.display = 'block'
      magnifier.style.backgroundImage = `url(${img.src})`
      magnifier.style.backgroundSize = `${img.width * 2}px ${img.height * 2}px`

      // Placing magnifier at top left in the beginning
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
                    border: 1px solid red;
                    margin: 10px 0px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    align-items: center;
                    position: relative;
                }

                .top-bar {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                }

                .dropdown-select {
                    padding: 8px;
                    cursor: pointer;
                }

                .magnifier-btn {
                    cursor: pointer;
                    user-select: none;
                    background: none;
                    border: none;
                    padding: 0 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .magnifier {
                    display: none;
                    position: absolute;
                    border: 3px solid #000;
                    border-radius: 50%;
                    cursor: grab;
                    width: 300px;
                    height: 300px;
                    background-repeat: no-repeat;
                    background-size: 200% 200%;
                    pointer-events: all;
                    box-shadow: 0 0 8px rgba(0,0,0,0.5);
                    user-select: none;
                    z-index: 10;
                }

                .canvas-image {
                    max-width: 100%;
                    border: 1px solid #ccc;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                    position: relative;
                    user-select: none;
                }
            </style>
            <div class="workspace-tools">
              <div class="top-bar">
                <div>
                  <select class="dropdown-select">
                    <option value="" selected disabled>Splitscreen Tools</option>
                    <option value="transcription">Transcription Progress</option>
                    <option value="dictionary">Greek Dictionary</option>
                    <option value="preview">Next Page Preview</option>
                    <option value="cappelli">Cappelli</option>
                    <option value="enigma">Enigma</option>
                    <option value="latin-dictionary">Latin Dictionary</option>
                    <option value="latin-vulgate">Latin Vulgate</option>
                  </select>
                </div>
                <div>Page Tools</div>
                <div>Hotkeys</div>
                <div class="magnifier-btn" title="Toggle Magnifier" aria-label="Toggle Magnifier">
                  Inspect 🔍
                </div>
              </div>
              <img 
                class="canvas-image" 
                src="https://iiif.io/api/image/3.0/example/reference/15f769d62ca9a3a2deca390efed75d73-3_titlepage1/full/max/0/default.jpg" 
                alt="Reference Title Page"
              />
              <div class="magnifier"></div>
            </div>
        `
    }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)