import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"

export default class DrawerTool extends HTMLElement {
    #drawerContent
    #drawerToggleBtn

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.isDrawerOpen = false
        this.drawerPosition = 'right'
    }

    get drawerContent() {
        if (!this.#drawerContent) {
            this.#drawerContent = this.shadowRoot.querySelector('.drawer-content')
        }
        return this.#drawerContent
    }

    get drawerToggleBtn() {
        if (!this.#drawerToggleBtn) {
            this.#drawerToggleBtn = this.shadowRoot.querySelector('.drawer-toggle-btn')
        }
        return this.#drawerToggleBtn
    }

    connectedCallback() {
        this._unsubProject = onProjectReady(this, this.authgate.bind(this))
    }

    authgate() {
        if (!CheckPermissions.checkViewAccess("TOOL", "ANY")) {
            this.remove()
            return
        }
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        if (this._escapeHandler) window.removeEventListener('keydown', this._escapeHandler)
    }

    addEventListeners() {
        this.drawerToggleBtn?.addEventListener('click', () => this.toggleDrawer())
        this.shadowRoot.querySelector('.drawer-close-btn')?.addEventListener('click', () => this.closeDrawer())
    }

    toggleDrawer() {
        this.isDrawerOpen ? this.closeDrawer() : this.openDrawer()
    }

    openDrawer() {
        const drawer = this.shadowRoot.querySelector('.drawer')
        if (!drawer) return
        drawer.classList.add('open')
        this.isDrawerOpen = true
        this.drawerToggleBtn.style.display = 'none'
    }

    closeDrawer() {
        const drawer = this.shadowRoot.querySelector('.drawer')
        if (!drawer) return
        drawer.classList.remove('open')
        this.isDrawerOpen = false
        this.drawerToggleBtn.style.display = 'flex'
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host { 
                position: relative; 
                z-index: 100; 
            }

            .drawer-toggle-btn {
                position: fixed;
                ${this.drawerPosition}: 20px;
                top: 85px;
                transform: translateY(-50%);
                padding: 12px 16px;
                border-radius: 25px;
                border: 2px solid rgb(0, 90, 140);
                background-color: rgb(0, 90, 140);
                color: white;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                user-select: none;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
            }

            .drawer-toggle-btn:hover {
                background-color: white;
                color: rgb(0, 90, 140);
                transform: translateY(-50%) scale(1.05);
            }

            .drawer {
                position: fixed;
                ${this.drawerPosition}: -350px;
                top: 0;
                width: 320px;
                height: 100vh;
                background-color: white;
                box-shadow: ${this.drawerPosition === 'right' ? '-4px' : '4px'} 0 12px rgba(0, 0, 0, 0.15);
                transition: ${this.drawerPosition} 0.3s ease;
                z-index: 1001;
                display: flex;
                flex-direction: column;
            }

            .drawer.open { 
                ${this.drawerPosition}: 0; 
            }

            .drawer-header {
                padding: 7px 10px;
                background-color: rgb(166, 65, 41);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }

            .drawer-header h3 {
                margin: 0;
                font-size: clamp(0.8rem, 1.2vw, 1rem);
                font-weight: 600;
            }

            .drawer-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .drawer-close-btn:hover { 
                background-color: rgba(255, 255, 255, 0.2); 
            }

            .drawer-content { 
                flex: 1; padding: 20px; overflow-y: auto; 
            }

            .tool-section { 
                margin-bottom: 20px; 
            }
        </style>
        <button class="drawer-toggle-btn" type="button" title="Open Tools" aria-label="Open Tools">🛠️ Tools</button>
        <div class="drawer">
            <div class="drawer-header">
                <h3>Workspace Tools</h3>
                <button class="drawer-close-btn" type="button" title="Close" aria-label="Close">×</button>
            </div>
            <div class="drawer-content">
                <div class="tool-section">
                </div>
            </div>
        </div>
        `
    }
}

customElements.define('tpen-drawer-tool', DrawerTool)
