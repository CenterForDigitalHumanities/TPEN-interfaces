import TPEN from "../../api/TPEN.js"
import { escapeHtml } from "/js/utils.js"
const eventDispatcher = TPEN.eventDispatcher
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import "./quicktype-editor-dialog.js"

class QuickTypeTool extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this._invalidToastShown = false
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
                const quicktype = TPEN.activeProject?.interfaces?.quicktype ?? []
                dialog.open(quicktype)
            }
        })

        this.shadowRoot.querySelectorAll('.char-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const char = btn.textContent
                const iface = document.querySelector('tpen-transcription-interface') || document.querySelector('tpen-simple-transcription')
                const block = iface?.shadowRoot?.querySelector('tpen-transcription-block')?.shadowRoot
                let textAreaContent = block?.querySelector('.transcription-input')

                if (textAreaContent && textAreaContent instanceof HTMLInputElement) {
                    const start = textAreaContent.selectionStart
                    const end = textAreaContent.selectionEnd
                    const value = textAreaContent.value

                    textAreaContent.value = value.slice(0, start) + char + value.slice(end)

                    textAreaContent.selectionStart = textAreaContent.selectionEnd = start + char.length
                    textAreaContent.focus()
                    textAreaContent.dispatchEvent(new Event('input', { bubbles: true }))
                }
            })
        })
    }

    render() {
        const quicktypeEntries = TPEN.activeProject?.interfaces?.quicktype ?? []
        const entriesWithStatus = quicktypeEntries.map(entry => ({
            value: `${entry ?? ''}`,
            evaluation: this.evaluateEntry(entry)
        }))
        const quicktypeButtons = entriesWithStatus.map(({ value, evaluation }) => {
            const classes = `char-button${evaluation.valid ? '' : ' invalid'}`
            const titleAttr = evaluation.valid ? '' : ` title="${escapeHtml(evaluation.reason)}"`
            const ariaInvalid = evaluation.valid ? '' : ' aria-invalid="true"'
            const ariaLabel = evaluation.valid ? '' : ` aria-label="${escapeHtml(`${value} (needs attention: ${evaluation.reason})`)}"`
            return `<button class="${classes}" type="button"${titleAttr}${ariaInvalid}${ariaLabel}>${escapeHtml(value)}</button>`
        }).join('')
        const quicktypeMarkup = quicktypeButtons || `select "edit" to add buttons`
        const hasInvalidEntries = entriesWithStatus.some(({ evaluation }) => !evaluation.valid)

        if (hasInvalidEntries) {
            if (!this._invalidToastShown) {
                eventDispatcher.dispatch("tpen-toast", {
                    message: "Some QuickType shortcuts need attention. Hover over red buttons for details.",
                    status: "warning"
                })
                this._invalidToastShown = true
            }
        } else {
            this._invalidToastShown = false
        }

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
                overflow-y: auto;
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

            .char-button.invalid {
                border-color: #d93025;
                background: rgba(217, 48, 37, 0.12);
                color: #d93025;
            }

            .char-button.invalid:hover {
                background: rgba(217, 48, 37, 0.18);
                color: #d93025;
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
                quicktypeMarkup : ''
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

    // escapeHtml provided via shared util

    evaluateEntry(value) {
        const candidate = `${value ?? ''}`
        const trimmed = candidate.trim()

        if (trimmed.length === 0) {
            return { valid: false, reason: "Shortcut cannot be empty." }
        }

        const controlChars = /[\u0000-\u001F\u007F]/
        if (controlChars.test(candidate)) {
            return { valid: false, reason: "Contains unsupported control characters." }
        }

        const suspiciousSequences = [
            { pattern: /<\s*script/i, reason: "Script tags are not allowed." },
            { pattern: /(?:^|["'\s])javascript:/i, reason: "Avoid javascript: URLs inside shortcuts." },
            { pattern: /^(?:\s*)data:/i, reason: "Data URLs are not supported." },
            { pattern: /(?:^|[\s<"'])on[a-z]+\s*=/i, reason: "Event handler attributes are not allowed." }
        ]

        const violatedSequence = suspiciousSequences.find(entry => entry.pattern.test(candidate))
        if (violatedSequence) {
            return { valid: false, reason: violatedSequence.reason }
        }

        if (trimmed.startsWith('<')) {
            if (!trimmed.endsWith('>')) {
                return { valid: false, reason: "HTML shortcuts must end with a closing '>'." }
            }

            const selfClosingPattern = /^<([a-z][\w-]*)(\s[^<>]*)?\s*\/\s*>$/i
            const pairedPattern = /^<([a-z][\w-]*)(\s[^<>]*)?>([\s\S]*)<\/\1\s*>$/i
            const selfClosingMatch = trimmed.match(selfClosingPattern)
            const pairedMatch = trimmed.match(pairedPattern)

            if (!selfClosingMatch && !pairedMatch) {
                return { valid: false, reason: "HTML must include a full opening and closing tag or be self-closing." }
            }

            const tagName = (selfClosingMatch ? selfClosingMatch[1] : pairedMatch[1]).toLowerCase()
            const forbiddenTags = new Set(["html", "head", "body"])
            if (forbiddenTags.has(tagName)) {
                return { valid: false, reason: `<${tagName}> tags are not allowed in shortcuts.` }
            }
        }

        return { valid: true }
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
            const iface = document.querySelector('tpen-transcription-interface') || document.querySelector('tpen-simple-transcription')
            const charPanel = iface?.shadowRoot
                ?.querySelector('tpen-workspace-tools')?.shadowRoot
                ?.querySelector('tpen-quicktype-tool')?.shadowRoot
                ?.querySelector('.char-panel')

            if (!charPanel) return

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
