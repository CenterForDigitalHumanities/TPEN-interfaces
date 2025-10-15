import TPEN from "../../api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import "./quicktype-editor-dialog.js"

class QuickTypeTool extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        this._unsubProject = onProjectReady(this, () => {
            this.render()
            this.addEventListeners()
            this.initializeDialog()
        })
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch { }
        try { this._unsubEditorSaved?.() } catch { }
    }

    initializeDialog() {
        // Create dialog if it doesn't exist
        if (!document.querySelector('tpen-quicktype-editor-dialog')) {
            const dialog = document.createElement('tpen-quicktype-editor-dialog')
            document.body.appendChild(dialog)
        }

        // Listen for save events to refresh the panel
        this._unsubEditorSaved = eventDispatcher.on("quicktype-editor-saved", (event) => {
            // Refresh the tool panel with updated shortcuts
            TPEN.activeProject.interfaces.quicktype = event.detail.quicktype
            this.render()
            this.addEventListeners()
        })
    }

    addEventListeners() {
        const charPanel = this.shadowRoot.querySelector('.char-panel')
        const editCharBtn = this.shadowRoot.querySelector('.edit-char-btn')

        editCharBtn.addEventListener('click', () => {
            const dialog = document.querySelector('tpen-quicktype-editor-dialog')
            if (dialog) {
                const quicktype = TPEN.activeProject.interfaces?.quicktype ?? []
                dialog.open(quicktype)
            }
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

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .char-panel {
                width: 100%;
                display: none;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 10px;
                padding: 12px 16px;
                background: white;
                border: 1px solid rgb(0, 90, 140);
                border-radius: 12px;
                box-sizing: border-box;
                position: relative;
                opacity: 0;
                max-height: 0;
                overflow: hidden;
                transform: translateY(-10px);
                transition: opacity 0.3s ease, max-height 0.3s ease, transform 0.3s ease, padding 0.3s ease;
            }

            .char-panel.show {
                display: flex;
                opacity: 1;
                max-height: 500px;
                transform: translateY(0);
            }

            .char-button {
                padding: 8px 12px;
                font-size: 18px;
                background: rgb(0, 90, 140);
                border: 1px solid rgb(0, 90, 140);
                color: white;
                border-radius: 6px;
                cursor: pointer;
                user-select: none;
                transition: background 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
                opacity: 0;
                transform: scale(0.95);
            }

            .char-panel.show .char-button {
                opacity: 1;
                transform: scale(1);
            }

            /* Staggered animation for buttons */
            .char-panel.show .char-button:nth-child(1) { animation: fadeInScale 0.2s ease 0.05s forwards; }
            .char-panel.show .char-button:nth-child(2) { animation: fadeInScale 0.2s ease 0.1s forwards; }
            .char-panel.show .char-button:nth-child(3) { animation: fadeInScale 0.2s ease 0.15s forwards; }
            .char-panel.show .char-button:nth-child(4) { animation: fadeInScale 0.2s ease 0.2s forwards; }
            .char-panel.show .char-button:nth-child(5) { animation: fadeInScale 0.2s ease 0.25s forwards; }
            .char-panel.show .char-button:nth-child(6) { animation: fadeInScale 0.2s ease 0.3s forwards; }
            .char-panel.show .char-button:nth-child(7) { animation: fadeInScale 0.2s ease 0.35s forwards; }
            .char-panel.show .char-button:nth-child(8) { animation: fadeInScale 0.2s ease 0.4s forwards; }
            .char-panel.show .char-button:nth-child(9) { animation: fadeInScale 0.2s ease 0.45s forwards; }
            .char-panel.show .char-button:nth-child(n+10) { animation: fadeInScale 0.2s ease 0.5s forwards; }

            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .char-button:hover {
                background: white;
                color: rgb(0, 90, 140);
            }

            .panel-controls {
                position: relative;
                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: flex-end;
            }

            .panel-btn {
                padding: 6px 25px;
                font-size: 12px;
                background-color: white;
                border: 1px solid rgb(0, 90, 140);
                color: rgb(0, 90, 140);
                border-radius: 20px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            .panel-btn:hover {
                background-color: rgb(0, 90, 140);
                color: white;
            }
        </style>
        <div class="char-panel" role="region" aria-label="QuickType Panel" tabindex="0">
            <div class="panel-controls">
            ${CheckPermissions.checkEditAccess("PROJECT", "CONTENT") ?
                TPEN.activeProject.interfaces?.quicktype?.reduce((acc, hk) => {
                    return acc + `<button class="char-button" type="button">${hk}</button>`
                }, '') ?? `select "edit" to add buttons` : ''
            }
            </div>
            <div class="panel-controls">
            ${CheckPermissions.checkEditAccess("PROJECT", "OPTIONS") ? `
                <button class="panel-btn edit-char-btn" type="button" aria-label="Edit QuickType shortcuts">Edit</button>
            ` : ""}
            </div>
        </div>
        `
    }
}

customElements.define('tpen-quicktype-tool', QuickTypeTool)

class QuickTypeToolButton extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        this._unsubProject = onProjectReady(this, this.authgate)
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
        try { this._unsubProject?.() } catch { }
    }

    addEventListeners() {
        const quicktypeBtn = this.shadowRoot.querySelector('.quicktype-btn')

        quicktypeBtn.addEventListener('click', () => {
            const charPanel = document.querySelector('tpen-transcription-interface').shadowRoot.querySelector('tpen-workspace-tools').shadowRoot.querySelector('tpen-quicktype-tool').shadowRoot.querySelector('.char-panel')
            
            if (charPanel.classList.contains('show')) {
                // Close animation
                charPanel.classList.remove('show')
                // Set display to none after animation completes
                setTimeout(() => {
                    if (!charPanel.classList.contains('show')) {
                        charPanel.style.display = 'none'
                    }
                }, 300)
            } else {
                // Open animation
                charPanel.style.display = 'flex'
                // Trigger reflow to ensure display: flex is applied before adding show class
                charPanel.offsetHeight
                charPanel.classList.add('show')
            }
        })
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .tools-btn {
                padding: 8px 16px;
                border-radius: 25px;
                border: 1.5px solid rgb(0, 90, 140);
                background-color: rgb(0, 90, 140);
                font-weight: 600;
                font-size: 14px;
                color: white;
                cursor: pointer;
                user-select: none;
                transition: background-color 0.3s ease, border-color 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }

            .tools-btn:hover, .tools-btn:focus {
                background-color: white;
                border-color: rgb(0, 90, 140);
                color: rgb(0, 90, 140);
                outline: none;
            }
            
            .quicktype-btn {
                background-color: rgb(0, 90, 140);
                border-color: rgb(0, 90, 140);
            }

            .quicktype-btn:hover, .quicktype-btn:focus {
                background-color: white;
                border-color: rgb(0, 90, 140);
                color: rgb(0, 90, 140);
            }
        </style>
        <button class="tools-btn quicktype-btn" type="button" aria-label="Toggle QuickType Panel">
            QuickType ⌨️
        </button>
        `
    }
}

customElements.define('tpen-quicktype-tool-button', QuickTypeToolButton)

export { QuickTypeTool, QuickTypeToolButton }
