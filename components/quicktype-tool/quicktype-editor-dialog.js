import TPEN from "../../api/TPEN.js"
import { evaluateEntry, escapeHTML } from '../quicktype/validation.js'
const eventDispatcher = TPEN.eventDispatcher

class QuickTypeEditorDialog extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this._quicktype = []
        this._originalQuicktype = []
        this._draggedIndex = null
        this._previousLength = 0
    }

    connectedCallback() {
        this.render()
    }

    open(quicktypeArray) {
        const incomingQuicktype = Array.isArray(quicktypeArray) ? quicktypeArray.map(item => `${item ?? ''}`) : []

        this._quicktype = [...incomingQuicktype]
        this._originalQuicktype = [...incomingQuicktype]
        this._previousLength = this._quicktype.length
        this.render()
        this.notifyInvalidShortcuts("load")
        const overlay = this.shadowRoot.querySelector('.dialog-overlay')
        const container = this.shadowRoot.querySelector('.dialog-container')
        
        overlay.style.display = 'flex'
        // Trigger reflow
        overlay.offsetHeight
        overlay.classList.add('show')
        container.classList.add('show')
        
        this.setupEventListeners()
    }

    close() {
        const overlay = this.shadowRoot.querySelector('.dialog-overlay')
        const container = this.shadowRoot.querySelector('.dialog-container')
        
        overlay.classList.remove('show')
        container.classList.remove('show')
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            overlay.style.display = 'none'
        }, 300)
    }

    setupEventListeners() {
        const closeBtn = this.shadowRoot.querySelector('.close-btn')
        const cancelBtn = this.shadowRoot.querySelector('.cancel-btn')
        const saveBtn = this.shadowRoot.querySelector('.save-btn')
        const addBtn = this.shadowRoot.querySelector('.add-btn')
        const input = this.shadowRoot.querySelector('.quicktype-input')
        const overlay = this.shadowRoot.querySelector('.dialog-overlay')
        const dialogContainer = this.shadowRoot.querySelector('.dialog-container')

        // Prevent clicks inside dialog from closing it
        dialogContainer?.addEventListener('click', (e) => {
            e.stopPropagation()
        })

        closeBtn?.addEventListener('click', (e) => this.handleCancel(e))
        cancelBtn?.addEventListener('click', (e) => this.handleCancel(e))
        saveBtn?.addEventListener('click', (e) => this.handleSave(e))
        addBtn?.addEventListener('click', (e) => this.handleAdd(e))

        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAdd(e)
            }
        })

        // Close on overlay click
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.handleCancel(e)
            }
        })

        // Setup delete buttons and drag handlers
        this.setupItemListeners()
    }

    setupItemListeners() {
        // Setup delete buttons
        this.shadowRoot.querySelectorAll('.delete-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => this.handleDelete(e, index))
        })

        // Setup drag and drop
        this.shadowRoot.querySelectorAll('.quicktype-item').forEach((item, index) => {
            item.draggable = true
            item.setAttribute('data-index', index)
            
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, index))
            item.addEventListener('dragend', (e) => this.handleDragEnd(e))
            item.addEventListener('dragover', (e) => this.handleDragOver(e))
            item.addEventListener('drop', (e) => this.handleDrop(e, index))
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e))
        })
    }

    handleAdd(e) {
        e?.stopPropagation()
        e?.preventDefault()
        const input = this.shadowRoot.querySelector('.quicktype-input')
        const value = input.value.trim()

        if (!value) {
            eventDispatcher.dispatch("tpen-toast", {
                message: "Please enter a character or string.",
                status: "error"
            })
            return
        }

        const evaluation = evaluateEntry(value)

        if (!evaluation.valid) {
            eventDispatcher.dispatch("tpen-toast", {
                message: `Shortcut added but needs attention: ${evaluation.reason}`,
                status: "warning"
            })
        }

        if (this._quicktype.includes(value)) {
            eventDispatcher.dispatch("tpen-toast", {
                message: "This entry already exists.",
                status: "error"
            })
            return
        }

        this._quicktype.push(value)
        input.value = ''
        this.updateList()
    }

    handleDelete(e, index) {
        e?.stopPropagation()
        e?.preventDefault()
        this._quicktype.splice(index, 1)
        this.updateList()
    }

    handleDragStart(e, index) {
        this._draggedIndex = index
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', e.target.innerHTML)
        e.target.style.opacity = '0.4'
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1'
        // Remove all drag-over classes
        this.shadowRoot.querySelectorAll('.quicktype-item').forEach(item => {
            item.classList.remove('drag-over')
        })
    }

    handleDragOver(e) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        
        const item = e.currentTarget
        if (item && !item.classList.contains('drag-over')) {
            item.classList.add('drag-over')
        }
        
        return false
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over')
    }

    handleDrop(e, dropIndex) {
        e.stopPropagation()
        e.preventDefault()
        
        if (this._draggedIndex === null || this._draggedIndex === dropIndex) {
            return false
        }

        // Reorder the array
        const draggedItem = this._quicktype[this._draggedIndex]
        const newArray = [...this._quicktype]
        newArray.splice(this._draggedIndex, 1)
        newArray.splice(dropIndex, 0, draggedItem)
        
        this._quicktype = newArray
        this._draggedIndex = null
        this.updateList()
        
        return false
    }

    handleCancel(e) {
        e?.stopPropagation()
        e?.preventDefault()
        this._quicktype = [...this._originalQuicktype]
        this.close()
        eventDispatcher.dispatch("quicktype-editor-cancelled")
    }

    async handleSave(e) {
        e?.stopPropagation()
        e?.preventDefault()
        const project = TPEN.activeProject
        if (!project?.storeInterfacesCustomization) {
            eventDispatcher.dispatch("tpen-toast", {
                message: "Project must be loaded before saving QuickType shortcuts",
                status: "error"
            })
            return
        }

        const validShortcuts = this._quicktype.filter(item => evaluateEntry(item).valid)
        const skippedCount = this._quicktype.length - validShortcuts.length

        if (skippedCount > 0) {
            eventDispatcher.dispatch("tpen-toast", {
                message: `${skippedCount} shortcut${skippedCount === 1 ? '' : 's'} skipped while saving. Review highlighted items to resolve.`,
                status: "warning"
            })
        }

        try {
            const interfaces = await project.storeInterfacesCustomization({ quicktype: [...validShortcuts] })
            eventDispatcher.dispatch("tpen-toast", {
                message: "QuickType shortcuts saved successfully!",
                status: "success"
            })
            eventDispatcher.dispatch("quicktype-editor-saved", { quicktype: validShortcuts })
            this.close()
        } catch (error) {
            eventDispatcher.dispatch("tpen-toast", {
                message: error?.message ?? "Failed to save QuickType shortcuts",
                status: "error"
            })
        }
    }

    generateShortcut(index) {
        if (index < 10) {
            return `Ctrl+${index + 1}`
        } else if (index < 19) {
            return `Ctrl+Shift+${index - 9}`
        } else {
            return `#${index + 1}`
        }
    }

    updateList() {
        const itemCount = this.shadowRoot.querySelector('.item-count')
        const listContainer = this.shadowRoot.querySelector('.quicktype-list')

        const wasEmpty = !itemCount
        const isEmpty = this._quicktype.length === 0
        const overlay = this.shadowRoot.querySelector('.dialog-overlay')
        const container = this.shadowRoot.querySelector('.dialog-container')
        const wasOverlayVisible = overlay?.classList.contains('show') ?? false
        const wasContainerVisible = container?.classList.contains('show') ?? false

        const isNewItemAdded = this._quicktype.length > this._previousLength
        this._previousLength = this._quicktype.length

        const handledTransition = this.handleEmptyStateChange({
            wasEmpty,
            isEmpty,
            wasOverlayVisible,
            wasContainerVisible
        })

        if (handledTransition) {
            return
        }

        this.updateItemCount(itemCount)

        if (isEmpty) {
            this.renderEmptyState(listContainer)
            return
        }

        this.renderQuicktypeItems(listContainer, isNewItemAdded)
        this.setupItemListeners()
    }

    handleEmptyStateChange({ wasEmpty, isEmpty, wasOverlayVisible, wasContainerVisible }) {
        if (wasEmpty === isEmpty) {
            return false
        }

        this.render()

        const overlay = this.shadowRoot.querySelector('.dialog-overlay')
        const container = this.shadowRoot.querySelector('.dialog-container')

        if (wasOverlayVisible && overlay) {
            overlay.style.display = 'flex'
            overlay.offsetHeight
            overlay.classList.add('show')
        }

        if (wasContainerVisible) {
            container?.classList.add('show')
        }

        this.setupEventListeners()
        return true
    }

    updateItemCount(itemCount) {
        if (!itemCount || this._quicktype.length === 0) {
            return
        }

        itemCount.textContent = `${this._quicktype.length} shortcut${this._quicktype.length !== 1 ? 's' : ''} • Drag to reorder`
    }

    renderEmptyState(listContainer) {
        if (!listContainer) {
            return
        }

        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⌨️</div>
                <p>No QuickType shortcuts yet.<br>Add your first one above!</p>
            </div>
        `
    }

    renderQuicktypeItems(listContainer, isNewItemAdded) {
        if (!listContainer) {
            return
        }

        listContainer.innerHTML = this._quicktype.map((item, index) => this.getQuicktypeItemMarkup(item, index, index === this._quicktype.length - 1 && isNewItemAdded)).join('')
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            .dialog-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(0px);
                transition: background 0.3s ease, backdrop-filter 0.3s ease;
            }

            .dialog-overlay.show {
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(2px);
            }

            /* Ensure toasts appear above the modal */
            :host {
                z-index: 9999;
            }

            .dialog-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                position: relative;
                opacity: 0;
                transform: translateY(-30px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            .dialog-container.show {
                opacity: 1;
                transform: translateY(0);
            }

            .dialog-header {
                padding: 20px 24px;
                border-bottom: 2px solid #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .dialog-header h2 {
                margin: 0;
                color: rgb(0, 90, 140);
                font-size: 20px;
                font-weight: 600;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .close-btn:hover {
                background: #f0f0f0;
                color: #333;
            }

            .dialog-body {
                padding: 20px 24px;
                overflow-y: auto;
                flex: 1;
            }

            .input-section {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
            }

            .quicktype-input {
                flex: 1;
                padding: 10px 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.2s;
            }

            .quicktype-input:focus {
                outline: none;
                border-color: rgb(0, 90, 140);
            }

            .add-btn {
                padding: 10px 20px;
                background: rgb(0, 90, 140);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .add-btn:hover {
                background: rgb(0, 70, 110);
            }

            .item-count {
                font-size: 13px;
                color: #666;
                margin-bottom: 12px;
            }

            .quicktype-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: flex-start;
            }

            .quicktype-item {
                display: inline-flex;
                align-items: stretch;
                gap: 8px;
                padding: 8px 12px;
                background: rgb(0, 90, 140);
                border: 1px solid rgb(0, 90, 140);
                color: white;
                border-radius: 6px;
                transition: all 0.2s ease;
                position: relative;
                font-size: 18px;
                font-weight: 500;
                cursor: move;
                user-select: none;
                flex-direction: column;
                min-width: 160px;
                box-sizing: border-box;
            }

            .quicktype-item.newly-added {
                animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            @keyframes popIn {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                50% {
                    transform: scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .quicktype-item:hover {
                background: white;
                color: rgb(0, 90, 140);
                box-shadow: 0 2px 8px rgba(0, 90, 140, 0.3);
            }

            .quicktype-item.invalid {
                border-color: #d93025;
                background: rgba(217, 48, 37, 0.12);
                color: #d93025;
            }

            .quicktype-item.invalid:hover {
                background: rgba(217, 48, 37, 0.18);
                color: #d93025;
                box-shadow: 0 2px 10px rgba(217, 48, 37, 0.25);
            }

            .quicktype-item.drag-over {
                border-left: 3px solid #ffc107;
                padding-left: 10px;
                background: rgba(255, 193, 7, 0.1);
            }

            .quicktype-item:hover .delete-btn {
                color: rgb(0, 90, 140);
                background: rgba(0, 90, 140, 0.1);
            }

            .quicktype-item.invalid .delete-btn {
                border-color: rgba(217, 48, 37, 0.4);
                background: rgba(217, 48, 37, 0.15);
                color: #d93025;
            }

            .quicktype-item.invalid:hover .delete-btn {
                color: #d93025;
                background: rgba(217, 48, 37, 0.2);
                border-color: rgba(217, 48, 37, 0.6);
            }

            .item-content {
                display: flex;
                align-items: center;
                gap: 6px;
                pointer-events: none;
            }

            .item-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: 100%;
            }

            .item-symbol {
                font-size: 18px;
                font-weight: 500;
                text-align: center;
            }

            .item-shortcut {
                font-size: 10px;
                opacity: 0.8;
                font-family: monospace;
                text-align: center;
                white-space: nowrap;
            }

            .delete-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.4);
                color: white;
                border-radius: 4px;
                width: 24px;
                height: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.2s;
                padding: 0;
            }

            .delete-btn:hover {
                background: rgba(255, 255, 255, 0.9);
                color: #dc3545;
                border-color: rgba(255, 255, 255, 0.9);
            }

            .validation-warning {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 6px;
                font-size: 12px;
                color: inherit;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 4px;
                padding: 4px 6px;
                width: 100%;
                box-sizing: border-box;
            }

            .validation-icon {
                font-size: 14px;
            }

            .validation-text {
                flex: 1;
                line-height: 1.3;
            }

            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #666;
            }

            .empty-state-icon {
                font-size: 48px;
                margin-bottom: 12px;
                opacity: 0.3;
            }

            .dialog-footer {
                padding: 16px 24px;
                border-top: 2px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .cancel-btn, .save-btn {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .cancel-btn {
                background: #f0f0f0;
                color: #333;
            }

            .cancel-btn:hover {
                background: #e0e0e0;
            }

            .save-btn {
                background: rgb(0, 90, 140);
                color: white;
            }

            .save-btn:hover {
                background: rgb(0, 70, 110);
            }
        </style>

        <div class="dialog-overlay">
            <div class="dialog-container">
                <div class="dialog-header">
                    <h2>Edit QuickType Shortcuts</h2>
                    <button type="button" class="close-btn" aria-label="Close dialog">×</button>
                </div>

                <div class="dialog-body">
                    <div class="input-section">
                        <input 
                            type="text" 
                            id="quicktype-shortcut"
                            class="quicktype-input" 
                            placeholder="Type or paste a character or string..." 
                            maxlength="20"
                        />
                        <button type="button" role="button" class="add-btn">Add</button>
                    </div>

                    ${this._quicktype.length > 0 ? `
                        <div class="item-count">${this._quicktype.length} shortcut${this._quicktype.length !== 1 ? 's' : ''} • Drag to reorder</div>
                    ` : ''}

                    <div class="quicktype-list">
                        ${this._quicktype.length === 0 ? `
                            <div class="empty-state">
                                <div class="empty-state-icon">⌨️</div>
                                <p>No QuickType shortcuts yet.<br>Add your first one above!</p>
                            </div>
                        ` : this._quicktype.map((item, index) => this.getQuicktypeItemMarkup(item, index, false)).join('')}
                    </div>
                </div>

                <div class="dialog-footer">
                    <button type="button" role="button" class="cancel-btn">Cancel</button>
                    <button type="button" role="button" class="save-btn">Save Changes</button>
                </div>
            </div>
        </div>
        `
    }

    getQuicktypeItemMarkup(item, index, isNewlyAdded) {
        const evaluation = evaluateEntry(item)
        const safeItem = escapeHTML(item)
        const shortcut = this.generateShortcut(index)
        const invalidClass = evaluation.valid ? '' : ' invalid'
        const ariaInvalid = evaluation.valid ? '' : ' aria-invalid="true"'
        const warningMarkup = evaluation.valid ? '' : `
                <div class="validation-warning" role="note">
                    <span class="validation-icon" aria-hidden="true">⚠️</span>
                    <span class="validation-text">${escapeHtml(evaluation.reason)}</span>
                </div>
        `

        return `
            <div class="quicktype-item${invalidClass}${isNewlyAdded ? ' newly-added' : ''}"${ariaInvalid}>
                <div class="item-row">
                    <div class="item-content">
                        <span class="item-symbol">${safeItem}</span>
                        <span class="item-shortcut">${shortcut}</span>
                    </div>
                    <button type="button" class="delete-btn" aria-label="Delete">×</button>
                </div>
                ${warningMarkup}
            </div>
        `
    }

    notifyInvalidShortcuts(context) {
        const invalidEntries = this._quicktype.map(item => evaluateEntry(item)).filter(result => !result.valid)

        if (invalidEntries.length === 0) {
            return
        }

        const contextPrefix = context === "load" ? "Existing shortcuts need attention." : "Shortcuts need attention."
        eventDispatcher.dispatch("tpen-toast", {
            message: `${contextPrefix} Hover over highlighted items for details.`,
            status: "warning"
        })
    }
}

customElements.define('tpen-quicktype-editor-dialog', QuickTypeEditorDialog)

export default QuickTypeEditorDialog
