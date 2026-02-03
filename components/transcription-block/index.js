import TPEN from "/api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import vault from "/js/vault.js"
import CheckPermissions from "/components/check-permissions/checkPermissions.js"
import { orderPageItemsByColumns } from "/utilities/columnOrdering.js"
import { onProjectReady } from "/utilities/projectReady.js"
import { CleanupRegistry } from "/utilities/CleanupRegistry.js"
import { insertTextAtCursor } from "/utilities/shortcutTextInput.js"

/**
 * TranscriptionBlock - Provides the main transcription input interface with navigation.
 * Handles line editing, autosave, and draft persistence.
 * Requires LINE TEXT or LINE CONTENT view access.
 * @element tpen-transcription-block
 */
export default class TranscriptionBlock extends HTMLElement {

    #page = null
    #transcriptions
    #baseline // tracks last saved text per line
    #saveTimers = new Map() // lineIndex -> timeout id
    #pendingSaves = new Map() // lineIndex -> Promise
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null
    #storageKey // localStorage key for drafts

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    async processTranscriptions(items) {
        if (!Array.isArray(items)) return []
        const results = []
        for (const item of items) {
            const annotation = await vault.get(item, 'annotation')
            let text = ''
            switch (true) {
                case typeof annotation?.body === 'string':
                    text = annotation.body
                    break
                case Array.isArray(annotation?.body): {
                    const textual = annotation.body.find(b => b.type === 'TextualBody' && typeof b.value === 'string')
                    text = textual?.value
                        ?? annotation.body.find(b => typeof b === 'string')
                        ?? ''
                    break
                }
                case annotation?.body?.type === 'TextualBody' && typeof annotation.body.value === 'string':
                    text = annotation.body.value
                    break
                case annotation?.resource?.['@type'] === 'cnt:ContentAsText':
                    text = annotation.resource?.['cnt:chars'] ?? annotation.resource?.chars ?? ''
                    break
                case typeof annotation?.body?.value === 'string':
                    text = annotation.body.value
                    break
                default:
                    text = ''
            }
            results.push(text)
        }
        return results
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)

        // UI update handlers for line navigation
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-transcription-previous-line', () => this.updateTranscriptionUI())
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-transcription-next-line', () => this.updateTranscriptionUI())
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-active-line-updated', () => this.updateTranscriptionUI())
    }

    authgate() {
        if (!CheckPermissions.checkViewAccess("ANY", "CONTENT")) {
            this.remove()
            return
        }
        this.render()
        this.addEventListeners()
        this.initializeAsync()
    }

    /**
     * Performs async initialization after authgate passes.
     */
    async initializeAsync() {
        const pageID = TPEN.screen?.pageInQuery
        this.#page = await vault.get(pageID, 'annotationpage', true)
        const projectPage = TPEN.activeProject.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === pageID.split('/').pop())
        if (!this.#page || !projectPage) return

        const { orderedItems } = orderPageItemsByColumns(projectPage, this.#page)
        this.#page.items = orderedItems
        this.#transcriptions = await this.processTranscriptions(this.#page.items)
        this.#baseline = [...this.#transcriptions]
        this.#storageKey = this.buildStorageKey()
        this.loadDraftsFromStorage()
        this.moveToTopLine()
    }

    addEventListeners() {
        // Clear previous render-specific listeners
        this.renderCleanup.run()

        const prevButton = this.shadowRoot.querySelector('.prev-button')
        const prevPageButton = this.shadowRoot.querySelector('.prev-page-button')
        const nextButton = this.shadowRoot.querySelector('.next-button')
        const nextPageButton = this.shadowRoot.querySelector('.next-page-button')
        const inputField = this.shadowRoot.querySelector('.transcription-input')

        // Shadow DOM element listeners
        if (prevButton) {
            this.renderCleanup.onElement(prevButton, 'click', this.moveToPreviousLine.bind(this))
        }
        if (prevPageButton) {
            this.renderCleanup.onElement(prevPageButton, 'click', () => this.navigateToPage('prev'))
        }
        if (nextButton) {
            this.renderCleanup.onElement(nextButton, 'click', this.moveToNextLine.bind(this))
        }
        if (nextPageButton) {
            this.renderCleanup.onElement(nextPageButton, 'click', () => this.navigateToPage('next'))
        }
        if (inputField) {
            this.renderCleanup.onElement(inputField, 'blur', () => this.checkDirtyLines())
            this.renderCleanup.onElement(inputField, 'keydown', (e) => this.handleKeydown(e))
            this.renderCleanup.onElement(inputField, 'input', () => {
                this.#transcriptions[TPEN.activeLineIndex] = inputField.value ?? ''
                this.markLineDirty(TPEN.activeLineIndex)
                this.persistDraft(TPEN.activeLineIndex)
                this.scheduleLineSave(TPEN.activeLineIndex)
            })
        }

        // Track dirty lines
        this.$dirtyLines = new Set()

        // Window/global event listeners (need explicit cleanup)
        this.renderCleanup.onWindow('beforeunload', this.beforeUnloadHandler.bind(this))

        // Dirty check handlers for line navigation
        this.renderCleanup.onEvent(eventDispatcher, 'tpen-transcription-previous-line', () => this.checkDirtyLines())
        this.renderCleanup.onEvent(eventDispatcher, 'tpen-transcription-next-line', () => this.checkDirtyLines())

        // External control events
        this.renderCleanup.onEvent(eventDispatcher, 'tpen-transcription-flush-all', this.flushAllSaves.bind(this))
        this.renderCleanup.onEvent(eventDispatcher, 'tpen-transcription-save-line', (index) => {
            if (typeof index === 'number') this.scheduleLineSave(index)
        })

        // Window message handler for external tool communication
        this.renderCleanup.onWindow('message', (event) => {
            if (event.data?.type === "RETURN_LINE_ID") {
                const lineIndex = this.#page.items.findIndex(item => item.id === event.data.lineId)
                if (lineIndex !== -1) {
                    this.moveToLine(lineIndex, 'next')
                    this.updateTranscriptionUI()
                }
            }

            if (event.data?.type === "UPDATE_LINE_TEXT") {
                if (typeof event.data.lineIndex === 'number') {
                    this.shadowRoot.querySelector('.transcription-input').value = event.data.text
                    this.#transcriptions[event.data.lineIndex] = event.data.text
                    this.markLineDirty(event.data.lineIndex)
                    this.persistDraft(event.data.lineIndex)
                    this.scheduleLineSave(event.data.lineIndex)
                }
            }
        })
    }

    // Helper to compare and queue dirty lines
    checkDirtyLines = async () => {
        if (!this.#transcriptions || !this.#baseline) return
        this.#transcriptions.forEach((txt, i) => {
            if (txt === this.#baseline[i]) this.$dirtyLines.delete(i)
            else this.$dirtyLines.add(i)
        })
        const linesCount = this.shadowRoot.querySelector('lines-count')
        if (!linesCount) return
        linesCount.textContent = this.$dirtyLines.size > 0 ? `(${this.$dirtyLines.size} unsaved)` : ''
    }

    markLineDirty(index) {
        if (typeof index !== 'number') return
        if (this.#transcriptions?.[index] !== this.#baseline?.[index]) {
            const beforeSize = this.$dirtyLines.size
            this.$dirtyLines.add(index)
            if (!beforeSize || !this.$dirtyLines.has(index)) {
                // no-op (kept for clarity)
            }
            eventDispatcher.dispatch('tpen-transcription-line-dirty', { index })
        } else {
            const had = this.$dirtyLines.delete(index)
            if (had) eventDispatcher.dispatch('tpen-transcription-line-clean', { index })
        }
        const linesCount = this.shadowRoot?.querySelector('lines-count')
        if (linesCount) linesCount.textContent = this.$dirtyLines.size > 0 ? `(debug: ${this.$dirtyLines.size} unsaved)` : ''
    }

    scheduleLineSave(index) {
        if (!CheckPermissions.checkEditAccess('LINE', 'TEXT') && !CheckPermissions.checkEditAccess('LINE', 'CONTENT')) return
        // debounce per line
        const existing = this.#saveTimers.get(index)
        if (existing) clearTimeout(existing)
        const timer = setTimeout(() => {
            this.saveLineRemote(index)
        }, 2000)
        this.#saveTimers.set(index, timer)
        eventDispatcher.dispatch('tpen-transcription-line-save-scheduled', { index })
    }

    async saveLineRemote(index) {
        if (index == null) return
        if (!this.$dirtyLines?.has(index)) return
        const pageID = TPEN.screen?.pageInQuery
        const projectID = TPEN.activeProject?.id ?? TPEN.activeProject?._id
        const line = this.#page?.items?.[index]
        const newText = this.#transcriptions?.[index] ?? ''
        const lineID = line?.id?.split?.('/').pop()
        if (!pageID || !projectID || !lineID) return
        // avoid duplicate in-flight for same line
        if (this.#pendingSaves.has(index)) return
        const p = fetch(`${TPEN.servicesURL}/project/${projectID}/page/${pageID}/line/${lineID}/text`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            },
            body: typeof newText === 'string' ? newText : (newText?.toString?.() ?? '')
        }).then(async res => {
            if (!res.ok) throw new Error('Failed to save line ' + index)
            // Attempt to extract a new line id if provided
            let newReturnedId
            try {
                const data = await res.json()
                newReturnedId = data?.id
            } catch (e) {
                console.warn('Could not parse save response for new line id', e)
            }
            if (newReturnedId) this.updateLineId(index, newReturnedId)
            // Update baseline and dirty tracking
            this.#baseline[index] = newText
            this.$dirtyLines.delete(index)
            this.removeDraft(index)
            this.checkDirtyLines()
            eventDispatcher.dispatch('tpen-transcription-line-save-success', { index, text: newText })
        }).catch(err => {
            console.error(err)
            // leave dirty so user can retry
            eventDispatcher.dispatch('tpen-transcription-line-save-fail', { index, error: err?.message || 'error' })
        }).finally(() => {
            this.#pendingSaves.delete(index)
            if (!this.hasPendingSaves()) eventDispatcher.dispatch('tpen-transcription-all-saves-complete')
        })
        eventDispatcher.dispatch('tpen-transcription-line-save-start', { index })
        this.#pendingSaves.set(index, p)
        return p
    }

    async flushAllSaves() {
        // trigger immediate saves for all dirty lines
        eventDispatcher.dispatch('tpen-transcription-flush-start')
        const dirty = Array.from(this.$dirtyLines ?? [])
        dirty.forEach(i => {
            const existingTimer = this.#saveTimers.get(i)
            if (existingTimer) clearTimeout(existingTimer)
            this.saveLineRemote(i)
        })
        await Promise.allSettled(Array.from(this.#pendingSaves.values()))
        if (!this.hasPendingSaves()) eventDispatcher.dispatch('tpen-transcription-flush-complete')
    }

    hasPendingSaves() {
        return (this.$dirtyLines?.size ?? 0) > 0 || this.#pendingSaves.size > 0
    }

    beforeUnloadHandler(e) {
        if (this.hasPendingSaves()) {
            e.preventDefault()
            e.returnValue = 'Some transcription lines are still saving. Are you sure you want to leave?'
            eventDispatcher.dispatch('tpen-transcription-pending-saves-warning', { remaining: this.$dirtyLines.size, inFlight: this.#pendingSaves.size })
            return e.returnValue
        }
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch { /* Expected if already unsubscribed */ }
        // Clear any pending save timers
        for (const timerId of this.#saveTimers.values()) {
            clearTimeout(timerId)
        }
        this.#saveTimers.clear()
        this.renderCleanup.run()
        this.cleanup.run()
        eventDispatcher.dispatch('tpen-transcription-block-disconnected')
    }

    buildStorageKey() {
        const projectID = TPEN.activeProject?.id ?? TPEN.activeProject?._id ?? 'unknownProject'
        const pageID = TPEN.screen?.pageInQuery ?? 'unknownPage'
        return `tpen-drafts:${projectID}:${pageID}`
    }

    async loadDraftsFromStorage() {
        // Wait until project and page are loaded
        if (!this.#storageKey || !TPEN.activeProject || !this.#page?.items) return
        let stored = localStorage.getItem(this.#storageKey) ?? '{}'
        try { stored = JSON.parse(stored) } catch (err) {
            console.error(`Failed to parse drafts from localStorage key "${this.#storageKey}":`, err)
            stored = {}
        }
        if (typeof stored !== 'object' || Object.keys(stored).length === 0) return
        let applied = 0
        let changed = false
        Object.entries(stored).forEach(([idx, draft]) => {
            const i = parseInt(idx, 10)
            if (Number.isNaN(i)) return
            // Only apply drafts to lines that exist in the DB
            if (typeof draft?.text === 'string' && this.#page.items[i]) {
                this.#transcriptions[i] = draft.text
                applied++
            } else {
                // Remove orphaned draft
                delete stored[idx]
                changed = true
            }
        })
        if (changed) {
            try { localStorage.setItem(this.#storageKey, JSON.stringify(stored)) } catch (err) { console.warn('Could not update localStorage with cleaned drafts', err) }
        }
        if (applied > 0) {
            this.checkDirtyLines()
            TPEN.eventDispatcher.dispatch('tpen-toast', {
                message: `Recovered ${applied} draft line${applied === 1 ? '' : 's'} from local storage.`,
                status: 'info'
            })
            eventDispatcher.dispatch('tpen-transcription-drafts-recovered', { count: applied })
        }
    }

    persistDraft(index) {
        if (!this.#storageKey) return
        const key = this.#storageKey
        let stored = localStorage.getItem(this.#storageKey) ?? '{}'
        try { stored = JSON.parse(stored) } catch { stored = {} }
        stored[index] = { text: this.#transcriptions[index], ts: Date.now() }
        try { localStorage.setItem(key, JSON.stringify(stored)) } catch (err) { console.warn('Could not persist draft', err) }
    }

    removeDraft(index) {
        if (!this.#storageKey) return
        let stored = localStorage.getItem(this.#storageKey) ?? '{}'
        try { stored = JSON.parse(stored) } catch { stored = {} }
        if (stored && stored[index]) {
            delete stored[index]
            try { localStorage.setItem(this.#storageKey, JSON.stringify(stored)) } catch { /* ignore */ }
        }
        // If no drafts remain, remove key to avoid growth
        if (stored && Object.keys(stored).length === 0) {
            try { localStorage.removeItem(this.#storageKey) } catch { /* ignore */ }
        }
    }

    updateLineId(index, newId) {
        const lineObj = this.#page?.items?.[index]
        if (!lineObj || !newId) return
        const oldId = lineObj.id
        if (typeof oldId === 'string' && oldId.includes('/') && !newId.includes('/')) {
            const prefix = oldId.slice(0, oldId.lastIndexOf('/') + 1)
            lineObj.id = prefix + newId
        } else {
            lineObj.id = newId
        }
        eventDispatcher.dispatch('tpen-transcription-line-id-updated', { index, oldId, newId: lineObj.id })
    }

    handleKeydown(e) {
        // QuickType shortcuts: Ctrl+0-9 and Ctrl+Shift+0-9
        if (this.handleQuickTypeShortcut(e)) return

        // TAB: next line
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault()
            this.moveToNextLine()
            return
        }
        // SHIFT+TAB: previous line
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault()
            this.moveToPreviousLine()
            return
        }
        // ENTER: move remaining text down to next line
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault()
            this.moveTextDown()
            return
        }
        // SHIFT+ENTER: previous line
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault()
            this.moveToPreviousLine()
            return
        }
        // CTRL+Home: show top line
        if (e.key === 'Home' && e.ctrlKey) {
            e.preventDefault()
            this.moveToTopLine()
            return
        }
        // CTRL+End: show last line
        if (e.key === 'End' && e.ctrlKey) {
            e.preventDefault()
            this.moveToLastLine()
            return
        }
    }

    /**
     * Handles QuickType keyboard shortcuts for inserting predefined text.
     * @param {KeyboardEvent} e - The keyboard event
     * @returns {boolean} True if a shortcut was handled, false otherwise
     */
    handleQuickTypeShortcut(e) {
        if (!e.ctrlKey || e.altKey) return false

        const quicktype = TPEN.activeProject?.interfaces?.quicktype
        if (!Array.isArray(quicktype) || quicktype.length === 0) return false

        let index = -1

        if (!e.shiftKey && /^[0-9]$/.test(e.key)) {
            // Ctrl+1-9 → indices 0-8, Ctrl+0 → index 9
            index = e.key === '0' ? 9 : parseInt(e.key, 10) - 1
        } else if (e.shiftKey && /^Digit[0-9]$/.test(e.code)) {
            // Ctrl+Shift+1-9 → indices 10-18, Ctrl+Shift+0 → index 19
            // Use e.code since e.key returns shifted characters (!, @, #, etc.)
            const digit = parseInt(e.code.charAt(5), 10)
            index = digit === 0 ? 19 : digit + 9
        }

        if (index >= 0 && index < quicktype.length) {
            e.preventDefault()
            const inputField = this.shadowRoot.querySelector('.transcription-input')
            if (inputField && quicktype[index]) {
                insertTextAtCursor(inputField, quicktype[index])
            }
            return true
        }
        return false
    }

    moveTextDown() {
        // Move remaining text after cursor to next line
        const inputField = this.shadowRoot.querySelector('.transcription-input')
        if (!inputField) return
        const nextIndex = TPEN.activeLineIndex + 1
        if (nextIndex >= this.#transcriptions.length) {
            console.warn('Push to next page not implemented yet')
            return
        }
        const value = inputField.value
        const cursorPos = inputField.selectionStart
        const before = value.slice(0, cursorPos)
        const after = value.slice(cursorPos)
        this.#transcriptions[TPEN.activeLineIndex] = before
        this.#transcriptions[nextIndex] = after + (this.#transcriptions[nextIndex] ?? '')
        this.moveToNextLine()
    }

    moveToLine(index, direction = 'next') {
        TPEN.activeLineIndex = Math.max(0, Math.min(index, this.#transcriptions.length - 1))
        eventDispatcher.dispatch(
            direction === 'previous' ? 'tpen-transcription-previous-line' : 'tpen-transcription-next-line'
        )
    }

    moveToTopLine() {
        this.moveToLine(0, 'previous')
    }

    moveToLastLine() {
        this.moveToLine(this.#transcriptions.length - 1, 'next')
    }

    moveToPreviousLine() {
        this.moveToLine(TPEN.activeLineIndex - 1, 'previous')
    }

    moveToNextLine() {
        this.moveToLine(TPEN.activeLineIndex + 1, 'next')
    }

    saveTranscription(text) {
        this.#transcriptions[TPEN.activeLineIndex] = text
        this.markLineDirty(TPEN.activeLineIndex)
        this.persistDraft(TPEN.activeLineIndex)
        this.scheduleLineSave(TPEN.activeLineIndex)
    }

    updateTranscriptionUI() {
        const previousLineText = this.#transcriptions[TPEN.activeLineIndex - 1] || 'No previous line'
        const currentLineText = this.#transcriptions[TPEN.activeLineIndex] || ''
        const prevLineElem = this.shadowRoot?.querySelector('.transcription-line')
        if (prevLineElem) prevLineElem.textContent = previousLineText
        const inputElem = this.shadowRoot?.querySelector('.transcription-input')
        if (inputElem) {
            inputElem.value = currentLineText
            inputElem.setSelectionRange?.(inputElem.value.length, inputElem.value.length)
        }
        // Swap Prev/Prev Page button if on first line
        let prevAction = TPEN.activeLineIndex === 0 ? ['add', 'remove'] : ['remove', 'add']
        let prevBtn = this.shadowRoot?.querySelector('.prev-button')
        let prevPageBtn = this.shadowRoot?.querySelector('.prev-page-button')
        prevBtn.classList[prevAction[0]]('hidden')
        prevPageBtn.classList[prevAction[1]]('hidden')
        // Swap Next/Next Page button if on last line
        let nextAction = TPEN.activeLineIndex === this.#transcriptions.length - 1 ? ['add', 'remove'] : ['remove', 'add']
        let nextBtn = this.shadowRoot?.querySelector('.next-button')
        let nextPageBtn = this.shadowRoot?.querySelector('.next-page-button')
        nextBtn.classList[nextAction[0]]('hidden')
        nextPageBtn.classList[nextAction[1]]('hidden')
    }

    navigateToPage(direction) {
        // Find the current page index in the active layer
        const project = TPEN.activeProject
        const pageID = TPEN.screen?.pageInQuery
        if (!project?.layers?.length || !pageID) return
        const allPages = project.layers.flatMap(layer => layer.pages)
        const idx = allPages.findIndex(p => p.id?.split?.("/").pop() === pageID)
        if (idx === -1) return
        let newIdx = direction === 'next' ? idx + 1 : idx - 1
        if (newIdx < 0 || newIdx >= allPages.length) return
        const newPage = allPages[newIdx]
        if (!newPage?.id) return
        // Update the URL and trigger a reload
        const url = new URL(window.location.href)
        url.searchParams.set('pageID', newPage.id.split('/').pop())
        window.location.href = url.toString()
    }

    render() {
        this.shadowRoot.innerHTML = `
      <style>
        .transcription-block {
            background: rgb(254, 248, 228);
            border: 1px solid rgb(254, 248, 228);
            border-radius: 12px;
            padding: 16px;
            margin-inline: auto;
            box-sizing: border-box;
            width: 100%;
            border-bottom: none;
            border-bottom-right-radius: 0;
            border-bottom-left-radius: 0;
        }

        .transcription-block center {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 12px;
            color: rgb(0, 90, 140);
        }

        .flex-center {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .hidden {
            display: none;
        }

        .transcription-input {
            padding: 10px 14px;
            font-size: 14px;
            width: 80%;
            border: 1px solid black;
            border-radius: 6px;
            outline: none;
            color: black;
            transition: border-color 0.2s ease;
        }

        .transcription-input[disabled] {
            border-color: transparent;
            color: #777;
        }

        .transcription-input:focus {
            box-shadow: 0 0 0 2px rgb(0, 90, 140);
        }

        .prev-button,
        .next-button,
        .next-page-button,
        .prev-page-button {
            padding: 8px 16px;
            font-size: 14px;
            background-color: rgb(0, 90, 140);
            border: 1px solid rgb(0, 90, 140);
            border-radius: 5px;
            color: white;
            cursor: pointer;
            transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .next-page-button,
        .prev-page-button {
            background-color: rgb(166, 65, 41);
            border: 1px solid rgb(206, 105, 81);
        }

        .prev-button:hover,
        .next-button:hover,
        .next-page-button:hover,
        .prev-page-button:hover {
            background-color: #d0e2ff;
            border-color: #aaa;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
        }

        .next-page-button:hover,
        .prev-page-button:hover {
            background-color: rgba(218, 151, 135, 1);
        }
      </style>
      <div class="transcription-block">
        <lines-count class='debug'></lines-count>
        <center class="transcription-line"> - </center>
        <div class="flex-center">
            <button class="prev-page-button hidden">Previous Page</button>
          <button class="prev-button">Prev</button>
          <input type="text" class="transcription-input" placeholder="Transcription input text" value="" ${CheckPermissions.checkEditAccess('LINE', 'TEXT') || CheckPermissions.checkEditAccess('LINE', 'CONTENT') ? '' : 'disabled'}>
          <button class="next-button">Next</button>
          <button class="next-page-button hidden">Next Page</button>
        </div>
      </div>
    `
    }
}

customElements.define('tpen-transcription-block', TranscriptionBlock)
