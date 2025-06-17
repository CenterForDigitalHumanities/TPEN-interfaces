import TPEN from "/api/TPEN.js"
const eventDispatcher = TPEN.eventDispatcher
import vault from "/js/vault.js"

export default class TranscriptionBlock extends HTMLElement {

    #page = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.state = {
            currentLineIndex: 0,
            transcriptions: [],
        }
    }

    connectedCallback() {
        this.render()
        this.addEventListeners()
        TPEN.eventDispatcher.on('tpen-project-loaded', async () => {
            const pageID = TPEN.screen?.pageInQuery
            const page = this.#page = await vault.get(pageID, 'annotationpage', true)
            if (page) {
                this.state.transcriptions = page.transcriptions ?? []
                this.state.currentLineIndex = 0
                this.updateTranscriptionUI()
            }
        })
        TPEN.eventDispatcher.on('tpen-transcription-previous-line', ev => {
            this.state.currentLineIndex = ev.detail?.currentLineIndex ?? 0
            this.updateTranscriptionUI()
        })
        TPEN.eventDispatcher.on('tpen-transcription-next-line', ev => {
            this.state.currentLineIndex = ev.detail?.currentLineIndex ?? 0
            this.updateTranscriptionUI()
        })
    }

    addEventListeners() {
        const prevButton = this.shadowRoot.querySelector('.prev-button')
        const nextButton = this.shadowRoot.querySelector('.next-button')
        const inputField = this.shadowRoot.querySelector('.transcription-input')

        // Move to the previous line
        if (prevButton) {
            prevButton.addEventListener('click', this.moveToPreviousLine.bind(this))
        }

        // Move to the next line
        if (nextButton) {
            nextButton.addEventListener('click', this.moveToNextLine.bind(this))
        }

        // Save transcription when the input field loses focus
        if (inputField) {
            inputField.addEventListener('blur', (e) => this.saveTranscription(e.target.value))
            inputField.addEventListener('keydown', (e) => this.handleKeydown(e))
            inputField.addEventListener('input', e => {
                this.state.transcriptions[this.state.currentLineIndex] = e.target.value ?? ''
            })
        }
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
        const value = inputField.value
        const cursorPos = inputField.selectionStart
        const before = value.slice(0, cursorPos)
        const after = value.slice(cursorPos)
        this.state.transcriptions[this.state.currentLineIndex] = before
        const nextIndex = this.state.currentLineIndex + 1
        this.state.transcriptions[nextIndex] = after + (this.state.transcriptions[nextIndex] ?? '')
        this.moveToNextLine()
    }

    moveToLine(index, direction = 'next') {
        this.state.currentLineIndex = index
        eventDispatcher.dispatch(
          direction === 'previous' ? 'tpen-transcription-previous-line' : 'tpen-transcription-next-line',
          {
            currentLineIndex: this.state.currentLineIndex,
            transcriptions: this.state.transcriptions
          }
        )
      }

    moveToTopLine() {
        this.moveToLine(0, 'previous')
    }

    moveToLastLine() {
        this.moveToLine(this.state.transcriptions.length - 1, 'next')
    }

    moveToPreviousLine() {
        this.moveToLine(this.state.currentLineIndex - 1, 'previous')
    }

    moveToNextLine() {
        this.moveToLine(this.state.currentLineIndex + 1, 'next')
    }

    saveTranscription(text) {
        console.log(text)
        // Save the transcription for the current line
        this.state.transcriptions[this.state.currentLineIndex] = text
    }

    updateTranscriptionUI() {
        const { currentLineIndex, transcriptions } = this.state
        const previousLineText = transcriptions[currentLineIndex - 1] || 'No previous line'
        const currentLineText = transcriptions[currentLineIndex] || ''
        // Update previous line display
        const prevLineElem = this.shadowRoot?.querySelector('.transcription-line')
        if (prevLineElem) prevLineElem.textContent = previousLineText
        // Update input value
        const inputElem = this.shadowRoot?.querySelector('.transcription-input')
        if (inputElem) {
            inputElem.value = currentLineText
            inputElem.setSelectionRange?.(inputElem.value.length, inputElem.value.length)
            inputElem.focus?.()
        }
    }

    render() {
        const { currentLineIndex, transcriptions } = this.state
        const previousLineText = transcriptions[currentLineIndex - 1] || 'No previous line'
        const currentLineText = transcriptions[currentLineIndex] || ''
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
        <center class="transcription-line">${previousLineText}</center>
        <div class="flex-center">
          <button class="prev-button">Prev</button>
          <input type="text" class="transcription-input" placeholder="Transcription input text" value="${currentLineText}">
          <button class="next-button">Next</button>
        </div>
      </div>
    `
    }
}

customElements.define('tpen-transcription-block', TranscriptionBlock)
