import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
export default class ProjectHeader extends HTMLElement {
    static get observedAttributes() {
        return ["tpen-project", "tpen-user-id"]
    }
    loadFailed = false

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        const style = document.createElement('style')
        style.textContent = `
            * { padding: 0; margin: 0; }
            nav { display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; background: rgb(166, 65, 41); margin-bottom: 5px; }
            .labels { width: 40%; display: flex; align-items: center; gap: 10px; }
            .nav-icon { width: 20px; cursor: pointer; }
            .nav-icon img { width: 100%; }
            .line-indicator { border: 1px dashed; color: white; padding: 5px; border-radius: 5px; }
            .control-buttons { display: flex; align-items: center; gap: 20px; }
            .project-title { font-size: clamp(0.8rem, 1.2vw, 1rem); font-weight: bold; font-family: var(--header-font-family, sans-serif); color: white; }
            @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.2; } 100% { opacity: 1; } }
            .title-placeholder { width: 7.2rem; height: 1.5em; background-color: #ccc; border-radius: 4px; animation: blink 1s infinite; }
            .canvas-label select { padding: 5px; border-radius: 5px; border: none; background-color: white; color: rgb(166, 65, 41); cursor: pointer; }
        `
        this.shadowRoot.appendChild(style)
        eventDispatcher.on("tpen-user-loaded", (ev) => (this.currentUser = ev.detail))
        eventDispatcher.on("tpen-project-loaded", () => {
            this.loadFailed = false
            this.render()
        })
        eventDispatcher.on("tpen-project-load-failed", () => {
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

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.render()
    }

    render() {
        let projectTitle = TPEN.activeProject?.label ?? ''
        if (!TPEN.activeProject) {
            projectTitle = '<div class="title-placeholder"></div>'
            // Show placeholder if project is loading
        }
        if (this.loadFailed) {
            projectTitle = '--'
        }

        const html = `
          <nav>
            <section class="labels">
              <div class="project-title">${projectTitle}</div>
              <div class="canvas-label">
                <select>
                  <option value="" disabled selected>-- Select Canvas --</option>
                </select>
              </div>
            </section>
            <tpen-layer-selector></tpen-layer-selector>
            <div class="line-indicator">Line indicator</div>
            <div class="control-buttons">
              <div class="nav-icon"><img draggable="false" src="../../assets/icons/home.png" alt=""></div>
              <div class="nav-icon"><img draggable="false" src="../../assets/icons/contact.png" alt=""></div>
              <div class="nav-icon"><img draggable="false" src="../../assets/icons/profile.png" alt=""></div>
            </div>
          </nav>
        `
        Array.from(this.shadowRoot.childNodes).forEach(node => {
            if (node.nodeName !== 'STYLE') this.shadowRoot.removeChild(node)
        })
        this.shadowRoot.insertAdjacentHTML('beforeend', html)

        // Only proceed with canvas logic if project is loaded and valid
        if (!TPEN.activeProject?.layers || TPEN.activeProject === undefined || this.loadFailed || !TPEN.activeProject?.label) return
        const projectCanvases = TPEN.activeProject.layers.flatMap(layer => layer.pages.map(page => page.id.split('/').pop()))
        const projectCanvasLabels = TPEN.activeProject.layers.flatMap(layer => layer.pages.map(page => page.label))
        const canvasLabels = this.shadowRoot.querySelector('.canvas-label select')
        if (!canvasLabels) return
        if (!TPEN.screen.pageInQuery) {
            location.href += `&pageID=${TPEN.activeProject.getFirstPageID().split('/').pop()}`
            return
        }
        const CanvasSelectOptions = projectCanvasLabels.map((canvasLabel, index) => {
            const option = document.createElement('option')
            const canvasId = projectCanvases[index]
            option.value = canvasId
            option.textContent = canvasLabel
            if (canvasId === TPEN.screen.pageInQuery) option.selected = true
            return option
        })
        canvasLabels.replaceChildren(...CanvasSelectOptions)
        canvasLabels.addEventListener('change', event => {
            const url = new URL(location.href)
            url.searchParams.set('pageID', event.target.value ?? '')
            location.href = url.toString()
        })
    }
}

customElements.define("tpen-project-header", ProjectHeader)
