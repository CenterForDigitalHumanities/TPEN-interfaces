import { eventDispatcher } from "../../api/events.js"

export default class TranscriptionBlock extends HTMLElement {

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
        // Place cursor at end of next line
        setTimeout(() => {
            const nextInput = this.shadowRoot?.querySelector('.transcription-input')
            const length = nextInput?.value?.length ?? 0
            nextInput?.setSelectionRange?.(length, length)
        }, 0)
    }

    moveToTopLine() {
        this.state.currentLineIndex = 0
        eventDispatcher.dispatch('tpen-transcription-previous-line', {
            currentLineIndex: this.state.currentLineIndex,
            transcriptions: this.state.transcriptions
        })
    }

    moveToLastLine() {
        this.state.currentLineIndex = this.state.transcriptions.length - 1
        eventDispatcher.dispatch('tpen-transcription-next-line', {
            currentLineIndex: this.state.currentLineIndex,
            transcriptions: this.state.transcriptions
        })
    }

    moveToPreviousLine() {
        this.state.currentLineIndex--
        eventDispatcher.dispatch('tpen-transcription-previous-line', {
            currentLineIndex: this.state.currentLineIndex,
            transcriptions: this.state.transcriptions
        })
    }

    moveToNextLine() {
        this.state.currentLineIndex++
        eventDispatcher.dispatch('tpen-transcription-next-line', {
            currentLineIndex: this.state.currentLineIndex,
            transcriptions: this.state.transcriptions
        })
    }

    saveTranscription(text) {
        console.log(text)
        // Save the transcription for the current line
        this.state.transcriptions[this.state.currentLineIndex] = text
    }

    render() {
        const { currentLineIndex, transcriptions } = this.state
        const previousLineText = transcriptions[currentLineIndex - 1] || 'No previous line'

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
                    <input type="text" class="transcription-input" placeholder="Transcription input text" value="${transcriptions[currentLineIndex] || ''}">
                    <button class="next-button">Next</button>
                </div>
            </div>
        `
    }
}

customElements.define('tpen-transcription-block', TranscriptionBlock)
