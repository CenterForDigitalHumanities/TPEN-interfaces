import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

export default class ProjectHeader extends HTMLElement {
    static get observedAttributes() {
        return ["tpen-project", "tpen-user-id"]
    }
    // activeProject is undefined while loading
    activeProject = undefined
    loadFailed = false

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        eventDispatcher.on("tpen-user-loaded", (ev) => (this.currentUser = ev.detail))
        eventDispatcher.on("tpen-project-loaded", (ev) => {
            this.activeProject = ev.detail
            this.loadFailed = false
            this.render()
        })
        eventDispatcher.on("tpen-project-load-failed", (ev) => {
            this.activeProject = null
            this.loadFailed = true
            this.render()
        })
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            switch (name) {
                case "tpen-project":
                    this.handleProjectChange(newValue)
                    break
                case "tpen-user-id":
                    this.handleUserChange(newValue)
                    break
            }
        }
    }

    handleProjectChange(projectId) {
        console.log(`Project changed to: ${projectId}`)
    }

    handleUserChange(userId) {
        console.log(`User changed to: ${userId}`)
        console.log(TPEN.currentUser)
    }

    async connectedCallback() {
        TPEN.attachAuthentication(this)
        this.render()
    }

    render() {
        let titleContent = ""
        if (this.activeProject === undefined && !this.loadFailed) {
            // Loading in progress: show a blinking placeholder shape
            titleContent = `<div class="title-placeholder"></div>`
        } else if (this.loadFailed || !this.activeProject || !this.activeProject.label) {
            // Loading complete but no project available (error or empty)
            titleContent = `--`
        } else {
            titleContent = this.activeProject.label
        }

        this.shadowRoot.innerHTML = `
      <style>
        * {
          padding: 0;
          margin: 0;
        }
        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 10px;
          background: rgb(166, 65, 41);
          margin-bottom: 5px;
        }
        .labels {
          width: 40%;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nav-icon {
          width: 20px;
          cursor: pointer;
        }
        .nav-icon img {
          width: 100%;
        }
        .line-indicator {
          border: 1px dashed;
          color: white;
        }
        .line-indicator {
          padding: 5px;
          border-radius: 5px;
        }
        .control-buttons {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        /* Responsive header styling for project title using clamp() */
        .project-title {
          font-size: clamp(0.8rem, 1.2vw, 1rem);
          font-weight: bold;
          font-family: var(--header-font-family, sans-serif);
          color: white;
        }
        /* Blinking animation for loading state */
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.2; }
          100% { opacity: 1; }
        }
        /* Placeholder shape for loading state */
        .title-placeholder {
          width: 7.2rem;
          height: 1.5em;
          background-color: #ccc;
          border-radius: 4px;
          animation: blink 1s infinite;
        }
        .canvas-label select {
          padding: 5px;
          border-radius: 5px;
          border: none;
          background-color: white;
          color: rgb(166, 65, 41);
          cursor: pointer;
        }
      </style>
      <nav>
        <section class="labels">
          <div class="project-title">${titleContent}</div>
          <div class="canvas-label">
            <select>
              <option value="">Canvas label</option>
            </select>
          </div>
        </section>
        <tpen-layer-selector></tpen-layer-selector>
        <div class="line-indicator">Line indicator</div>
        <div class="control-buttons">
          <div class="nav-icon">
            <img draggable="false" src="../../assets/icons/home.png" alt="">
          </div>
          <div class="nav-icon">
            <img draggable="false" src="../../assets/icons/contact.png" alt="">
          </div>
          <div class="nav-icon">
            <img draggable="false" src="../../assets/icons/profile.png" alt="">
          </div>
        </div>
      </nav>
    `

    const projectCanvases = this.activeProject.layers.flatMap(layer => layer.pages.map(page => page.id.split('/').pop()))
    const projectCanvasLabels = this.activeProject.layers.flatMap(layer => layer.pages.map(page => page.label))
    const canvasLabels = this.shadowRoot.querySelector('.canvas-label select')
    projectCanvasLabels.map((canvasLabel, index) => {
      const option = document.createElement('option')
      option.value = projectCanvases[index]
      option.textContent = canvasLabel
      canvasLabels.appendChild(option)
    })
    canvasLabels.addEventListener('change', (event) => {
      window.location = `transcribe?projectID=${this.activeProject._id}&pageID=${event.target.value}`
    })
  }
}

customElements.define("tpen-project-header", ProjectHeader)
