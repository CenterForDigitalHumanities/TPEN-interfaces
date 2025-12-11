import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import TranscriptionInterface from "../../interfaces/transcription/index.js"
import vault from '../../js/vault.js'
const eventDispatcher = TPEN.eventDispatcher
import "../check-permissions/permission-match.js"

export default class ColumnSelector extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.columns = []
    }

    connectedCallback() {
        const pageId = new URLSearchParams(new URL(window.location.href).search).get("pageID")
        if (TPEN.activeProject && TPEN.activeProject.layers) {
            const page = TPEN.activeProject.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === pageId)
            this.columns = page?.columns || []
            if (this.columns.length < 1) {
               return this.remove()
            }
            this.render()
        }

        eventDispatcher.on("tpen-project-loaded", () => {
            if (!CheckPermissions.checkViewAccess("LAYER", "ANY")) {
                this.remove()
                return
            }
            this.columns = TPEN.activeProject.layers.find(layer => layer.pages?.some(page => page['id'].split('/').pop() === pageId))?.columns || []
            this.render()
        })
    }

    getLabel(data) {
        if (typeof data.label === "string") {
            return data.label
        }

        if (typeof data.label === "object") {
            return Object.entries(data.label).map(([lang, values]) => `${lang != "none" ? lang + ":" : ""} ${values.join(", ")}`).join(" | ")
        }

        return `Unlabeled column: ${data["id"]}`
    }

    async render() {
        const optionsHtml = this.columns.map((column) => {
            const label = this.getLabel(column)
            return `<option value="${column["id"]}">${label}</option>`
        })
        .join("")

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    container-type: inline-size;
                }

                select {
                    font-size: clamp(0.8rem, 1vw, 1rem);
                    padding: 5px;
                    border: 1px dashed var(--border-color, #ccc);
                    border-radius: 5px;
                    background: var(--select-bg, #fff);
                    outline:none;
                    /* Allow text to wrap */
                    white-space: normal;
                    word-wrap: break-word;
                    max-width:100px;
                }

                @container (max-width: 300px) {
                    select {
                        font-size: 0.8rem;
                    }
                }
            </style>
            <select>
                ${optionsHtml}
            </select>
        `

        const selectEl = this.shadowRoot.querySelector("select")
        selectEl.addEventListener("change", async (e) => {
            const selectedURI = e.target.value
            const selectedColumn = this.columns.find((column) => column.id === selectedURI)
            const { setCanvasAndSelector } = TranscriptionInterface
            if (selectedColumn) {
                const firstAnnotationId = selectedColumn.lines?.[0]
                const page = await vault.get(new URLSearchParams(new URL(window.location.href).search).get("pageID"), 'annotationpage', true)
                const annotationIndex = page.items.findIndex(item => item.id === firstAnnotationId)
                if (annotationIndex !== -1) {
                    const { region } = setCanvasAndSelector(page.items[annotationIndex], page)
                    // Safely get tpen-transcription-interface
                    const tpenTranscriptionInterface = document.querySelector('tpen-transcription-interface');
                    const topImage = tpenTranscriptionInterface?.shadowRoot?.querySelector('#topImage');
                    const thisLine = page.items?.[annotationIndex]
                    const previousLine = page.items?.[annotationIndex - 1]
                    const responseLine = await fetch(thisLine.id).then(res => res.json())
                    const responsePrevLine = previousLine ? await fetch(previousLine.id).then(res => res.json()) : null

                    // Safely get tpen-transcription-block and its shadowRoot
                    const transcriptionBlock = tpenTranscriptionInterface?.shadowRoot?.querySelector('tpen-transcription-block');
                    const transcriptionBlockShadow = transcriptionBlock?.shadowRoot;
                    const transcriptionInput = transcriptionBlockShadow?.querySelector('.transcription-input');
                    const transcriptionLine = transcriptionBlockShadow?.querySelector('.transcription-line');
                    if (transcriptionInput) {
                        transcriptionInput.value = responseLine?.body?.value || '';
                    }
                    if (transcriptionLine) {
                        transcriptionLine.textContent = responsePrevLine?.body?.value || '';
                    }

                    if (!thisLine) return
                    TPEN.activeLine = thisLine
                    TPEN.activeLineIndex = annotationIndex

                    // Safely get tpen-project-header and its shadowRoot
                    const projectHeader = tpenTranscriptionInterface?.shadowRoot?.querySelector('tpen-project-header');
                    const projectHeaderShadow = projectHeader?.shadowRoot;
                    const lineIndicator = projectHeaderShadow?.querySelector('.line-indicator');
                    if (lineIndicator) {
                        lineIndicator.textContent = `Line ${annotationIndex + 1}`;
                    }

                    // Safely get iframe
                    const iframe = tpenTranscriptionInterface?.shadowRoot?.querySelector('iframe');
                    iframe?.contentWindow?.postMessage({ 
                        type: "SELECT_ANNOTATION", 
                        lineId: thisLine.id.split('/').pop()
                    }, "*")

                    if (!region) return
                    const [x, y, width, height] = region.split(',').map(Number)
                    if (topImage) {
                        topImage.moveTo(x, y, width, height)
                    }
                    const bottomImage = tpenTranscriptionInterface?.shadowRoot?.querySelector('#bottomImage');
                    if (bottomImage && topImage) {
                        bottomImage.moveUnder(x, y, width, height, topImage)
                    }
                }
            }
        })
    }
}

customElements.define("tpen-column-selector", ColumnSelector)
