import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import TranscriptionInterface from "../../interfaces/transcription/index.js"
import TranscriptionBlock from "../../components/transcription-block/index.js"
import vault from '../../js/vault.js'
const eventDispatcher = TPEN.eventDispatcher
import "../check-permissions/permission-match.js"

export default class ColumnSelector extends HTMLElement {
    #page = null
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.columns = []
        this.remainingUnorderedLines = []
        this.allLinesInColumns = []
        this.allLinesInPages = []
    }

    async connectedCallback() {
        if (TPEN.activeProject?.layers) await this.findColumnsData()
        eventDispatcher.on("tpen-project-loaded", async () => {
            if (!CheckPermissions.checkViewAccess("LAYER", "ANY")) 
                return this.remove()
            await this.findColumnsData()
        })
    }

    async findColumnsData() {
        const pageId = new URLSearchParams(location.search).get("pageID")
        const page = TPEN.activeProject?.layers?.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === pageId)
        this.columns = page?.columns || []

        if (this.columns.length < 1) 
            return this.remove()

        this.columns = this.columns.map((col, i) => {
            const isAuto = col.label.startsWith("Column ") &&
                /^[a-f\d]{24}$/i.test(col.label.slice(7))
            return { ...col, label: isAuto ? `Unnamed ${i + 1}` : col.label }
        })

        this.#page = await vault.get(pageId, 'annotationpage', true)
        const allLines = this.columns.flatMap(c => c.lines || [])
        const pageItems = page?.items?.map(i => i.id) || []
        this.remainingUnorderedLines = pageItems.filter(id => !allLines.includes(id))
        if (this.remainingUnorderedLines.length > 0) {
            this.columns.push({
                id: "unordered-lines",
                label: "Unordered Lines",
                lines: this.remainingUnorderedLines
            })
        }
        this.allLinesInColumns = [...allLines, ...this.remainingUnorderedLines]
        const orderedItems = []
        this.allLinesInColumns.forEach(lineId => {
            const line = this.#page.items.find(item => item.id === lineId)
            if (line) orderedItems.push(line)
        })
        this.#page.items = orderedItems
        this.render()
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
        let optionsHtml = this.columns.map((column) => {
            const label = this.getLabel(column)
            return `<option value="${column["id"]}">${label}</option>`
        }).join("")
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
                    white-space: normal;
                    word-wrap: break-word;
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
        this.selectColumn({ target: selectEl })
        selectEl.addEventListener("change", (e) => this.selectColumn(e))
    }

    getTpenNodes() {
        const tpen = document.querySelector("tpen-transcription-interface")
        const root = tpen?.shadowRoot

        return {
            tpen,
            topImage: root?.querySelector("#topImage"),
            bottomImage: root?.querySelector("#bottomImage"),
            iframe: root?.querySelector("iframe"),
            input: root?.querySelector("tpen-transcription-block")?.shadowRoot?.querySelector(".transcription-input"),
            prevLine: root?.querySelector("tpen-transcription-block")?.shadowRoot?.querySelector(".transcription-line"),
            lineIndicator: root?.querySelector("tpen-project-header")?.shadowRoot?.querySelector(".line-indicator"),
            nextPageButton: root?.querySelector("tpen-transcription-block")?.shadowRoot?.querySelector(".next-page-button"),
            prevPageButton: root?.querySelector("tpen-transcription-block")?.shadowRoot?.querySelector(".prev-page-button"),
            nextButton: root?.querySelector("tpen-transcription-block")?.shadowRoot?.querySelector(".next-button"),
            prevButton: root?.querySelector("tpen-transcription-block")?.shadowRoot?.querySelector(".prev-button"),
        }
    }

    async applyLineSelection(thisLine) {
        const nodes = this.getTpenNodes()
        TPEN.activeLine = thisLine
        TPEN.activeLineIndex = this.#page.items.findIndex(i => i.id === thisLine.id)

        const transcription = new TranscriptionInterface()
        const { region } = transcription.setCanvasAndSelector(thisLine, this.#page)

        if (region) {
            const [x, y, w, h] = region.split(',').map(Number)
            nodes.topImage?.moveTo(x, y, w, h)
            nodes.bottomImage?.moveUnder(x, y, w, h, nodes.topImage)
        }

        thisLine = await vault.get(thisLine, 'annotation', true)
        const previousLine = await vault.get(this.#page.items[TPEN.activeLineIndex - 1], 'annotation', true)

        nodes.input.value = thisLine?.body?.value || ''
        nodes.prevLine.textContent = previousLine?.body?.value || 'No previous line'
        nodes.lineIndicator.textContent = `Line ${TPEN.activeLineIndex + 1}`

        if (this.#page.items.length <= 1) {
            nodes.nextButton?.classList.add("hidden")
            nodes.nextPageButton?.classList.remove("hidden")
            nodes.prevPageButton?.classList.remove("hidden")
            nodes.prevButton?.classList.add("hidden")
        }
        if (TPEN.activeLineIndex === 0) {
            nodes.nextButton?.classList.remove("hidden")
            nodes.nextPageButton?.classList.add("hidden")
            nodes.prevPageButton?.classList.remove("hidden")
            nodes.prevButton?.classList.add("hidden")
        }
        if (TPEN.activeLineIndex === this.#page.items.length) {
            nodes.nextButton?.classList.add("hidden")
            nodes.nextPageButton?.classList.remove("hidden")
            nodes.prevPageButton?.classList.add("hidden")
            nodes.prevButton?.classList.remove("hidden")
        }
        if (TPEN.activeLineIndex > 0 && TPEN.activeLineIndex < this.#page.items.length) {
            nodes.nextButton?.classList.remove("hidden")
            nodes.nextPageButton?.classList.add("hidden")
            nodes.prevPageButton?.classList.add("hidden")
            nodes.prevButton?.classList.remove("hidden")
        }
        
        nodes.iframe?.contentWindow?.postMessage({
            type: "SELECT_ANNOTATION",
            lineId: thisLine.id.split("/").pop()
        }, "*")
    }

    async selectColumn(e) {
        const selected = e.target.value

        if (selected === "unordered-lines") {
            const firstId = this.remainingUnorderedLines[0]
            const idx = this.#page.items.findIndex(i => i.id === firstId)
            const thisLine = this.#page.items[idx]
            await this.applyLineSelection(thisLine)
            return
        }

        const selectedColumn = this.columns.find(col => col.id === selected)
        if (!selectedColumn) return

        const firstId = selectedColumn.lines?.[0]
        const index = this.#page.items.findIndex(i => i.id === firstId)
        if (index === -1) return

        const thisLine = this.#page.items[index]
        await this.applyLineSelection(thisLine)
    }
}

customElements.define("tpen-column-selector", ColumnSelector)