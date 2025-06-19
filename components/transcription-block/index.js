import TPEN from "/api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import vault from "/js/vault.js"

export default class TranscriptionBlock extends HTMLElement {

    #page = null
    #transcriptions

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
        this.render()
        this.addEventListeners()
        TPEN.eventDispatcher.on('tpen-project-loaded', async () => {
            const pageID = TPEN.screen?.pageInQuery
            this.#page = await vault.get(pageID, 'annotationpage', true)
            this.#transcriptions = await this.processTranscriptions(this.#page.items)
            this.moveToTopLine()
        })
        TPEN.eventDispatcher.on('tpen-transcription-previous-line', _ev => {
            this.updateTranscriptionUI()
        })
        TPEN.eventDispatcher.on('tpen-transcription-next-line', _ev => {
            this.updateTranscriptionUI()
        })
    }

    addEventListeners() {
        const prevButton = this.shadowRoot.querySelector('.prev-button')
        const nextButton = this.shadowRoot.querySelector('.next-button')
        const inputField = this.shadowRoot.querySelector('.transcription-input')
        const saveButton = this.shadowRoot.querySelector('.save-all-lines')

        // Move to the previous line
        if (prevButton) {
            prevButton.addEventListener('click', this.moveToPreviousLine.bind(this))
        }

        // Move to the next line
        if (nextButton) {
            nextButton.addEventListener('click', this.moveToNextLine.bind(this))
        }

        // Input field
        if (inputField) {
            inputField.addEventListener('blur', (e) => this.saveTranscription(e.target.value))
            inputField.addEventListener('blur', () => this.checkDirtyLines())
            inputField.addEventListener('keydown', (e) => this.handleKeydown(e))
            inputField.addEventListener('input', e => {
                this.#transcriptions[TPEN.activeLineIndex] = inputField.value ?? ''
            })
        }

        // Save all lines button
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                const pageID = TPEN.screen?.pageInQuery
                const projectID = TPEN.activeProject?.id ?? TPEN.activeProject?._id
                if (!pageID || !projectID) {
                    console.warn('No page or project ID found, cannot save transcriptions.')
                    TPEN.eventDispatcher.dispatch('toast', {
                        message: 'No page or project ID found, cannot save transcriptions.',
                        status: 'error'
                    })
                    return
                }
                if (!this.$dirtyLines || this.$dirtyLines.size === 0) {
                    TPEN.eventDispatcher.dispatch('toast', {
                        message: 'No unsaved changes.',
                        status: 'info'
                    })
                    return
                }
                const saveLines = Array.from(this.$dirtyLines).map(async index => {
                    const line = this.#page.items[index]
                    const newText = this.#transcriptions[index]
                    const lineID = line.id?.split?.('/').pop()
                    if (!lineID) {
                        console.warn('No line ID found, cannot save transcription.')
                        TPEN.eventDispatcher.dispatch('toast', {
                            message: 'No line ID found, cannot save transcription.',
                            status: 'error'
                        })
                        return
                    }
                    return fetch(`/project/${projectID}/page/${pageID}/line/${lineID}/text`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newText })
                    })
                })
                Promise.all(saveLines)
                    .then(res => {
                        TPEN.eventDispatcher.dispatch('toast', {
                            message: `Saved ${res.length} lines.`,
                            status: 'success'
                        })
                        this.$dirtyLines.clear()
                        this.#page = vault.get(pageID, 'annotationpage', true)
                        const linesCount = this.shadowRoot.querySelector('lines-count')
                        if (linesCount) linesCount.textContent = ''
                    })
                    .catch(err => {
                        console.error('Error saving transcriptions:', err)
                        TPEN.eventDispatcher.dispatch('toast', {
                            message: 'Error saving transcriptions.',
                            status: 'error'
                        })
                    })
            })
        }
        // Track dirty lines
        this.$dirtyLines = new Set()

        // Listen for line navigation events
        TPEN.eventDispatcher.on('tpen-transcription-previous-line', () => {
            this.checkDirtyLines()
        })
        TPEN.eventDispatcher.on('tpen-transcription-next-line', () => {
            this.checkDirtyLines()
        })
    }

    // Helper to compare and queue dirty lines
    checkDirtyLines = async () => {
        if (!this.#page?.items || !this.#transcriptions) return
        // Get all old texts in one go
        const oldTexts = await this.processTranscriptions(this.#page.items)
        oldTexts.forEach((oldText, index) => {
            const newText = this.#transcriptions?.[index]
            if (newText === oldText) {
                this.$dirtyLines.delete(index)
                return
            }
            this.$dirtyLines.add(index)
        })
        const linesCount = this.shadowRoot.querySelector('lines-count')
        if (!linesCount) return
        linesCount.textContent = this.$dirtyLines.size > 0 ? `(${this.$dirtyLines.size} unsaved)` : ''
    }

    handleKeydown(e) {
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
    }

    updateTranscriptionUI() {
        const previousLineText = this.#transcriptions[TPEN.activeLineIndex - 1] || 'No previous line'
        const currentLineText = this.#transcriptions[TPEN.activeLineIndex] || ''
        const prevLineElem = this.shadowRoot?.querySelector('.transcription-line')
        if (prevLineElem) prevLineElem.textContent = previousLineText
        const inputElem = this.shadowRoot?.querySelector('.transcription-input')
        if (inputElem) {
            inputElem.value = currentLineText
            inputElem.focus?.()
            inputElem.setSelectionRange?.(inputElem.value.length, inputElem.value.length)
        }
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

        .transcription-input:focus {
            box-shadow: 0 0 0 2px rgb(0, 90, 140);
        }

        .prev-button,
        .next-button {
            padding: 8px 16px;
            font-size: 14px;
            background-color: rgb(0, 90, 140);
            border: 1px solid rgb(0, 90, 140);
            border-radius: 5px;
            color: white;
            cursor: pointer;
            transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .prev-button:hover,
        .next-button:hover {
            background-color: #d0e2ff;
            border-color: #aaa;
        }
      </style>
      <div class="transcription-block">
        <button class="save-all-lines">Save All Lines <lines-count></lines-count></button>
        <center class="transcription-line"> - </center>
        <div class="flex-center">
          <button class="prev-button">Prev</button>
          <input type="text" class="transcription-input" placeholder="Transcription input text" value="">
          <button class="next-button">Next</button>
        </div>
      </div>
    `
    }
}

customElements.define('tpen-transcription-block', TranscriptionBlock)
