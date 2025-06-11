import TPEN from '../../api/TPEN.js'
import '../line-image/index.js'
import '../../js/vault.js'
import vault from '../../js/vault.js'
export default class TranscriptionBlock extends HTMLElement {
    #page
    #lines

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
            this.render()
            const topImage = this.shadowRoot.querySelector('#topImage')
            const bottomImage = this.shadowRoot.querySelector('#bottomImage')
            topImage.manifest = bottomImage.manifest = TPEN.activeProject?.manifest[0]
            const page = this.#page ?? await vault.get(pageID, 'annotationpage')
            let thisLine = page.items?.[0]
            let targetString, canvasID, region
            if (thisLine) {
                thisLine = await vault.get(thisLine, 'annotation')
                targetString = thisLine?.target?.id ?? thisLine.target?.['@id'] ?? thisLine.target
                ;[ canvasID, region] = targetString.split('#xywh=')
                topImage.line = thisLine.id
            } else {
                targetString = page?.target?.id ?? page?.target?.['@id'] ?? page?.target
                ;[ canvasID, region] = targetString.split('#xywh=')
            }
            const canvas = await vault.get(canvasID, 'canvas')
            region ??= `0,0,${canvas.width ?? 'full'},${(canvas.height && canvas.height/10) ?? 120}`

            topImage.canvas = bottomImage.canvas = canvasID
            if(region) topImage.setAttribute('region', region)
            // Calculate the remaining region below the topImage line for bottomImage
            const [x, y, w, h] = region.split(',').map(Number)
            const canvasHeight = canvas?.height ?? 0
            const remainingY = (y + h) ?? 0
            const remainingHeight = canvasHeight - remainingY
            bottomImage.setAttribute('region', `${x},${remainingY},${w},${remainingHeight}`)
        })
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
                    background: rgb(254, 248, 228);
                    border: 1px solid rgb(254, 248, 228);
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
            <tpen-line-image id="topImage"></tpen-line-image>
            <div class="transcription-block">
                <center class="transcription-line">${previousLineText}</center>
                <div class="flex-center">
                    <button class="prev-button">Prev</button>
                    <input type="text" class="transcription-input" placeholder="Transcription input text" value="${transcriptions[currentLineIndex] || ''}">
                    <button class="next-button">Next</button>
                </div>
            </div>
            <tpen-line-image id="bottomImage"></tpen-line-image>
        `
    }
}

customElements.define('tpen-transcription-block', TranscriptionBlock)
