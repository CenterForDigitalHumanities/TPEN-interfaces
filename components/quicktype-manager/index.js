import TPEN from '../../api/TPEN.js'
import { escapeHtml } from '/js/utils.js'
import { evaluateEntry } from '../quicktype/validation.js'
import '../quicktype-tool/quicktype-editor-dialog.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'
import { onProjectReady } from '../../utilities/projectReady.js'

export const PRESET_COLLECTIONS = {
    'Old English': ['Þ', 'þ', 'Ð', 'ð', 'Æ', 'æ', 'Ȝ', 'ȝ'],
    'Latin Abbreviations': ['⁊', '℞', '℟', 'Ꝝ', 'ꝝ', 'Ꝛ', 'ꝛ'],
    'Medieval Punctuation': ['⸪', '⸫', '⸬', '⸭', '⸮', '⸰', '⸱'],
    'Greek Common': ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'],
    'Hebrew Common': ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'],
    'Diacritics': ['á', 'à', 'â', 'ä', 'ã', 'é', 'è', 'ê', 'ë', 'í', 'ì', 'î', 'ï', 'ó', 'ò', 'ô', 'ö', 'õ', 'ú', 'ù', 'û', 'ü', 'ñ', 'ç'],
    'Math Symbols': ['±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '∑', '∏', '√', '∫'],
    'Currency': ['€', '£', '¥', '₹', '₽', '₩', '₪', '₦', '₱', '฿']
}

/**
 * QuickTypeManager - Interface for managing quicktype shortcuts in a project.
 * Requires project access.
 * @element tpen-quicktype-manager
 */
class QuickTypeManager extends HTMLElement {
    /** @type {CleanupRegistry} Registry for persistent cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers (cleared on re-render) */
    renderCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this._shortcuts = []
        this._savedShortcuts = []
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - loads shortcuts and renders after project is ready.
     */
    authgate() {
        this.loadShortcuts()
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.renderCleanup.run()
        this.cleanup.run()
    }

    loadShortcuts() {
        const project = TPEN.activeProject
        this._shortcuts = project?.interfaces?.quicktype || []
        this._savedShortcuts = [...this._shortcuts]
    }

    hasUnsavedChanges() {
        if (this._shortcuts.length !== this._savedShortcuts.length) return true
        return !this._shortcuts.every((shortcut, index) => shortcut === this._savedShortcuts[index])
    }

    async saveShortcuts() {
        const project = TPEN.activeProject
        if (!project) return

        try {
            await project.storeInterfacesCustomization({ quicktype: this._shortcuts })
            this._savedShortcuts = [...this._shortcuts]
            TPEN.eventDispatcher.dispatch('tpen-toast', { 
                status: 'info', 
                message: 'Shortcuts saved successfully' 
            })
            this.render()
            this.addEventListeners()
        } catch (error) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { 
                status: 'error', 
                message: 'Failed to save shortcuts' 
            })
            console.error('Error saving shortcuts:', error)
        }
    }

    render() {
        const project = TPEN.activeProject
        if (!project) {
            this.shadowRoot.innerHTML = '<div style="padding: 20px;">Loading project...</div>'
            return
        }

        this.shadowRoot.innerHTML = `
            <style>
            :host {
                display: block;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }

            h1 {
                color: var(--interface-primary);
                margin-bottom: 10px;
            }

            .subtitle {
                color: var(--text-secondary);
                margin-bottom: 30px;
            }

            .section {
                background: var(--white);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .section h2 {
                margin-top: 0;
                color: var(--text-primary);
                font-size: 1.3em;
            }

            .current-shortcuts {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: flex-start;
                min-height: 50px;
                margin-bottom: 15px;
            }

            .shortcut-chip {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: var(--interface-primary);
                border: 1px solid var(--interface-primary);
                color: var(--white);
                border-radius: 6px;
                font-size: 18px;
                font-weight: 500;
                transition: all 0.2s ease;
                user-select: none;
            }

            .shortcut-chip:hover {
                background: var(--white);
                color: var(--interface-primary);
                box-shadow: 0 2px 8px var(--interface-primary-shadow);
            }

            .shortcut-chip:hover .remove-shortcut {
                color: var(--interface-primary);
                background: var(--interface-primary-light);
                border-color: rgba(0, 90, 140, 0.4);
            }

            .remove-shortcut {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.4);
                color: var(--white);
                border-radius: 4px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.2s ease;
                line-height: 1;
            }

            .remove-shortcut:hover {
                background: rgba(0, 90, 140, 0.15);
            }

            .empty-state {
                color: var(--text-muted);
                font-style: italic;
                padding: 10px;
            }

            .button-group {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .btn {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
            }

            .btn-primary {
                background: var(--interface-primary);
                color: var(--white);
            }

            .btn-primary:hover {
                background: var(--interface-primary-hover);
            }

            .btn-secondary {
                background: var(--interface-secondary);
                color: var(--text-primary);
            }

            .btn-secondary:hover {
                background: var(--interface-secondary-hover);
            }

            .presets-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
            }

            .preset-card {
                border: 2px solid var(--interface-secondary);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .preset-card:hover {
                border-color: var(--interface-primary);
                box-shadow: 0 2px 8px var(--interface-primary-shadow);
            }

            .preset-name {
                font-weight: bold;
                margin-bottom: 8px;
                color: var(--text-primary);
            }

            .preset-preview {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                font-size: 1.2em;
            }

            .preset-shortcut {
                padding: 2px 6px;
                background: var(--interface-secondary);
                border-radius: 3px;
            }

            .custom-input-group {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }

            .custom-input {
                flex: 1;
                padding: 10px;
                border: 2px solid var(--interface-secondary);
                border-radius: 6px;
                font-size: 1em;
            }

            .custom-input:focus {
                outline: none;
                border-color: var(--interface-primary);
            }

            </style>

            <h1>Quicktype Shortcuts</h1>
            <p class="subtitle">Manage shortcuts for <em>${escapeHtml(project.getLabel())}</em></p>

            <div class="section">
            <h2>Current Shortcuts</h2>
            <div class="current-shortcuts">
                ${this._shortcuts.length > 0 
                ? this._shortcuts.map((shortcut, index) => `
                    <div class="shortcut-chip">
                    <span>${escapeHtml(shortcut)}</span>
                    <span class="remove-shortcut" data-index="${index}">×</span>
                    </div>
                `).join('')
                : '<div class="empty-state">No shortcuts configured yet. Add a shortcut or choose a preset collection below.</div>'
                }
            </div>
            <div class="button-group">
                <button class="btn btn-primary" id="edit-btn">Reorganize Shortcuts</button>
                <button class="btn btn-secondary" id="clear-btn">Clear All</button>
                ${this.hasUnsavedChanges() ? '<button class="btn btn-primary" id="save-btn">Save Changes</button>' : ''}
            </div>
            </div>

            <div class="section">
            <h2>Add Custom Shortcut</h2>
            <div class="custom-input-group">
                <input 
                type="text" 
                class="custom-input" 
                id="custom-shortcut" 
                placeholder="Enter a shortcut (character or text)"
                maxlength="50"
                />
                <button class="btn btn-primary" id="add-custom-btn">Add Shortcut</button>
            </div>
            </div>

            <div class="section">
            <h2>Preset Collections</h2>
            <p style="color: #666; margin-bottom: 15px;">Click to add an entire collection to your shortcuts</p>
            <div class="presets-grid">
                ${Object.entries(PRESET_COLLECTIONS).map(([name, shortcuts]) => `
                <div class="preset-card" data-preset="${escapeHtml(name)}" title="Add ${shortcuts.map(s => escapeHtml(s)).join(', ')}">
                    <div class="preset-name">${escapeHtml(name)}</div>
                    <div class="preset-preview">
                    ${shortcuts.slice(0, 8).map(shortcut => `<span class="preset-shortcut">${escapeHtml(shortcut)}</span>`).join('')}
                    ${shortcuts.length > 8 ? `<span class="preset-shortcut">+${shortcuts.length - 8}</span>` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
            </div>
        `
    }

    addEventListeners() {
        // Clear previous render-specific listeners before adding new ones
        this.renderCleanup.run()

        // Remove individual shortcuts
        this.shadowRoot.querySelectorAll('.remove-shortcut').forEach(btn => {
            this.renderCleanup.onElement(btn, 'click', (e) => {
                const index = parseInt(e.target.dataset.index)
                this._shortcuts.splice(index, 1)
                this.render()
                this.addEventListeners()
            })
        })

        // Clear all
        const clearBtn = this.shadowRoot.querySelector('#clear-btn')
        this.renderCleanup.onElement(clearBtn, 'click', () => {
            if (confirm('Are you sure you want to clear all shortcuts?')) {
                this._shortcuts = []
                this.render()
                this.addEventListeners()
            }
        })

        // Save
        const saveBtn = this.shadowRoot.querySelector('#save-btn')
        this.renderCleanup.onElement(saveBtn, 'click', () => {
            this.saveShortcuts()
        })

        // Edit with advanced editor
        const editBtn = this.shadowRoot.querySelector('#edit-btn')
        this.renderCleanup.onElement(editBtn, 'click', () => {
            const dialog = document.querySelector('tpen-quicktype-editor-dialog')
            if (dialog) {
                dialog.open(this._shortcuts)

                // Listen for save from dialog (one-time handler)
                const handler = (event) => {
                    this._shortcuts = event.detail.quicktype
                    this._savedShortcuts = [...this._shortcuts]
                    this.render()
                    this.addEventListeners()
                    TPEN.eventDispatcher.off('quicktype-editor-saved', handler)
                }
                TPEN.eventDispatcher.on('quicktype-editor-saved', handler)
            }
        })

        // Add custom shortcut
        const customInput = this.shadowRoot.querySelector('#custom-shortcut')
        const addCustomBtn = this.shadowRoot.querySelector('#add-custom-btn')

        const addCustomChar = () => {
            const value = customInput.value.trim()
            if (!value) return

            const evaluation = evaluateEntry(value)

            if (!evaluation.valid) {
                TPEN.eventDispatcher.dispatch('tpen-toast', {
                    status: 'error',
                    message: evaluation.reason
                })
                return
            }

            // Treat input as a single shortcut (single char or short phrase)
            if (this._shortcuts.includes(value)) {
                TPEN.eventDispatcher.dispatch('tpen-toast', {
                    status: 'error',
                    message: 'This entry already exists.'
                })
                return
            }

            this._shortcuts.push(value)
            customInput.value = ''
            this.render()
            this.addEventListeners()

            // Refocus the input after re-rendering
            const newInput = this.shadowRoot.querySelector('#custom-shortcut')
            if (newInput) {
                newInput.focus()
            }
        }

        this.renderCleanup.onElement(addCustomBtn, 'click', addCustomChar)
        this.renderCleanup.onElement(customInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                addCustomChar()
            }
        })

        // Add preset collections
        this.shadowRoot.querySelectorAll('.preset-card').forEach(card => {
            this.renderCleanup.onElement(card, 'click', () => {
                const presetName = card.dataset.preset
                const shortcuts = PRESET_COLLECTIONS[presetName]

                // Add characters that aren't already in the list
                let addedCount = 0
                let invalidCount = 0
                shortcuts.forEach(shortcut => {
                    if (!this._shortcuts.includes(shortcut)) {
                        const evaluation = evaluateEntry(shortcut)
                        if (evaluation.valid) {
                            this._shortcuts.push(shortcut)
                            addedCount++
                        } else {
                            invalidCount++
                        }
                    }
                })

                if (invalidCount > 0) {
                    TPEN.eventDispatcher.dispatch('tpen-toast', {
                        status: 'warning',
                        message: `Added ${addedCount} shortcuts from ${presetName} (${invalidCount} may need attention)`
                    })
                } else {
                    TPEN.eventDispatcher.dispatch('tpen-toast', {
                        status: 'info',
                        message: `Added ${addedCount} shortcuts from ${presetName}`
                    })
                }

                this.render()
                this.addEventListeners()
            })
        })

        // Create dialog element if it doesn't exist
        if (!document.querySelector('tpen-quicktype-editor-dialog')) {
            const dialog = document.createElement('tpen-quicktype-editor-dialog')
            document.body.appendChild(dialog)
        }
    }
}

customElements.define('tpen-quicktype-manager', QuickTypeManager)
