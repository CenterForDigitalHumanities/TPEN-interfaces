import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import "../layer-selector/index.js"
import "../column-selector/index.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'
import { onProjectReady } from '../../utilities/projectReady.js'

/**
 * ProjectHeader - Navigation header for transcription interface with canvas selection.
 * Requires PROJECT ANY view access.
 * @element tpen-project-header
 */
export default class ProjectHeader extends HTMLElement {
    loadFailed = false

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        const style = document.createElement('style')
        style.textContent = `
            * { padding: 0; margin: 0; }
            nav { display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; background: rgb(166, 65, 41); margin-bottom: 0; }
            .labels { width: 40%; display: flex; align-items: center; gap: 10px; }
            .nav-icon { width: 20px; cursor: pointer; }
            .nav-icon img { width: 100%; }
            .line-indicator { border: 1px dashed; color: white; padding: 5px; border-radius: 5px; }
            .control-buttons { display: flex; align-items: center; gap: 20px; }
            .project-title { font-size: clamp(0.8rem, 1.2vw, 1rem); font-weight: bold; font-family: var(--header-font-family, sans-serif); color: white; }
            @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.2; } 100% { opacity: 1; } }
            .title-placeholder { width: 7.2rem; height: 1.5em; background-color: #ccc; border-radius: 4px; animation: blink 1s infinite; }
            .canvas-label select { padding: 5px; border-radius: 5px; border: none; background-color: white; color: rgb(166, 65, 41); cursor: pointer; }
            .manage-project { display:none }
        `
        this.shadowRoot.appendChild(style)
        this.content = document.createElement('div')
        this.content.id = 'content'
        this.shadowRoot.appendChild(this.content)
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)

        const setLineIndicator = index => {
            const indicator = this.shadowRoot.querySelector('.line-indicator')
            if (!indicator) return
            indicator.textContent = `Line ${index ?? ''}`
        }

        this.cleanup.onEvent(eventDispatcher, "tpen-user-loaded", (ev) => (this.currentUser = ev.detail))
        this.cleanup.onEvent(eventDispatcher, "tpen-transcription-previous-line", () => {
            setLineIndicator(TPEN.activeLineIndex + 1)
        })
        this.cleanup.onEvent(eventDispatcher, "tpen-transcription-next-line", () => {
            setLineIndicator(TPEN.activeLineIndex + 1)
        })
        this.cleanup.onEvent(eventDispatcher, "tpen-project-load-failed", () => {
            this.loadFailed = true
            this.render()
        })
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.cleanup.run()
    }

    authgate() {
        if(!CheckPermissions.checkViewAccess("PROJECT", "ANY")) {
            this.remove()
            return
        }
        this.loadFailed = false
        const projectTitleElem = this.shadowRoot.querySelector('.project-title')
        if (projectTitleElem) {
          projectTitleElem.textContent = TPEN.activeProject?.label ?? ''
        } 
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
            <tpen-column-selector></tpen-column-selector>
            <div class="line-indicator">Line indicator</div>
            <div class="control-buttons">
              <a title="Home" class="nav-icon" href="/index"><img draggable="false" src="../../assets/icons/home.png" alt="Home"></a>
              <a title="Manage Project" class="nav-icon manage-project"><img draggable="false" src="../../assets/icons/contact.png" alt="Manage Project"></a>
              <a title="My Profile" class="nav-icon" href="/profile"><img draggable="false" src="../../assets/icons/profile.png" alt="Profile"></a>
            </div>
          </nav>
        `
        this.content.innerHTML = html

        // Only proceed with canvas logic if project is loaded and valid
        if (!TPEN.activeProject?.layers || TPEN.activeProject === undefined || this.loadFailed || !TPEN.activeProject?.label) return
        const projectCanvases = TPEN.activeProject.layers.flatMap(layer => layer.pages.map(page => page.id.split('/').pop()))
        const projectCanvasLabels = TPEN.activeProject.layers.flatMap(layer => layer.pages.map(page => page.label))
        const canvasLabels = this.shadowRoot.querySelector('.canvas-label select')
        if (!canvasLabels) return
        if (!TPEN.screen.pageInQuery) {
          const url = new URL(location.href)
          url.searchParams.set('pageID',TPEN.activeProject.getFirstPageID().split('/').pop())
          location.href = url.toString()
          return
        }
        if (CheckPermissions.checkEditAccess("PROJECT")) {
            const projectManagementBtn = this.shadowRoot.querySelector('.manage-project')
            projectManagementBtn.style.display = "inline-block"
            projectManagementBtn.href = `/project/manage?projectID=${TPEN.activeProject._id}`
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
        this.cleanup.onElement(canvasLabels, 'change', event => {
            const url = new URL(location.href)
            url.searchParams.set('pageID', event.target.value ?? '')
            location.href = url.toString()
        })
    }
}

customElements.define("tpen-project-header", ProjectHeader)
