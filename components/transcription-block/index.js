export default class TranscriptionBlock extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.state = {
            currentLineIndex: 0, // Track the current line index
            transcriptions: [], // Store transcriptions for each line
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
            prevButton.addEventListener('click', () => this.moveToPreviousLine())
        }

        // Move to the next line
        if (nextButton) {
            nextButton.addEventListener('click', () => this.moveToNextLine())
        }

        // Save transcription when the input field loses focus
        if (inputField) {
            inputField.addEventListener('blur', (e) => this.saveTranscription(e.target.value))
        }
    }

    moveToPreviousLine() {
        if (this.state.currentLineIndex > 0) {
            this.state.currentLineIndex--
            this.render()
        }
    }

    moveToNextLine() {
        this.state.currentLineIndex++
        this.render()
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
                    border: 1px solid;
                    margin: 10px 0px;
                    padding: 10px;
                }
                .transcription-block input {
                    padding: 10px;
                    width: 90%;
                    border: none;
                    outline: none;
                }
                .flex-center {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .prev-button, .next-button {
                    padding: 5px 10px;
                    cursor: pointer;
                }
            </style>
            <div class="transcription-block">
                <center>${previousLineText}</center>
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