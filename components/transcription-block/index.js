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
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid #ccc;
                    border-radius: 12px;
                    padding: 16px;
                    margin: 20px 0 0;
                    margin-inline: auto;
                    box-sizing: border-box;
                    width: 100%;
                    border-bottom: none;
                    border-bottom-right-radius: 0;
                    border-bottom-left-radius: 0;
                }

                .transcription-block center {
                    font-weight: 500;
                    color: #444;
                    margin-bottom: 12px;
                    font-size: 15px;
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
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }

                .transcription-input:focus {
                    border-color: #3a86ff;
                    box-shadow: 0 0 0 2px rgba(58, 134, 255, 0.2);
                }

                .prev-button,
                .next-button {
                    padding: 8px 16px;
                    font-size: 14px;
                    background-color: #f0f4ff;
                    border: 1px solid #ccc;
                    border-radius: 5px;
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