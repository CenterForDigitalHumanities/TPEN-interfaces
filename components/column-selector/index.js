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
        this.remainingUnorderedColumn = []
        this.allLinesInColumns = []
        this.allLinesInPages = []
    }

    connectedCallback() {
        if (TPEN.activeProject?.layers) this.findColumnsData()
        eventDispatcher.on("tpen-project-loaded", () => {
            if (!CheckPermissions.checkViewAccess("LAYER", "ANY")) 
                return this.remove()
            this.findColumnsData()
        })
    }

    findColumnsData() {
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

        const allLines = this.columns.flatMap(c => c.lines || [])
        const pageItems = page?.items?.map(i => i.id) || []
        this.remainingUnorderedColumn = pageItems.filter(id => !allLines.includes(id))
        if (this.remainingUnorderedColumn.length > 0) {
            this.columns.push({
                id: "unordered-lines",
                label: "Unordered Lines",
                lines: this.remainingUnorderedColumn
            })
        }
        this.allLinesInColumns = [...allLines, ...this.remainingUnorderedColumn]
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

    async loadPage() {
        const pageID = new URLSearchParams(location.search).get("pageID")
        return vault.get(pageID, "annotationpage", true)
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
        }
    }

    async applyLineSelection(thisLine, previousLine, annotationIndex, region) {
        const nodes = this.getTpenNodes()
        const responseLine = await fetch(thisLine.id).then(r => r.json())
        const responsePrevLine = previousLine ? await fetch(previousLine.id).then(r => r.json()) : null

        if (nodes.input) nodes.input.value = responseLine?.body?.value || ""
        if (nodes.prevLine) nodes.prevLine.textContent = responsePrevLine?.body?.value || ""
        TPEN.activeLine = thisLine
        TPEN.activeLineIndex = annotationIndex

        if (nodes.lineIndicator)
            nodes.lineIndicator.textContent = `Line ${annotationIndex + 1}`

        if (region) {
            const [x, y, w, h] = region.split(',').map(Number)
            nodes.topImage?.moveTo(x, y, w, h)
            nodes.bottomImage?.moveUnder(x, y, w, h, nodes.topImage)
        }

        nodes.iframe?.contentWindow?.postMessage({
            type: "SELECT_ANNOTATION",
            lineId: thisLine.id.split("/").pop()
        }, "*")
    }

    async selectColumn(e) {
        const selected = e.target.value
        const page = await this.loadPage()

        if (selected === "unordered-lines") {
            const firstId = this.remainingUnorderedColumn[0]
            const idx = page.items.findIndex(i => i.id === firstId)
            const thisLine = page.items[idx]
            const previousLine = page.items[idx - 1]
            const { region } = new TranscriptionInterface().setCanvasAndSelector(thisLine, page)
            await this.applyLineSelection(thisLine, previousLine, idx, region)
            return
        }

        const selectedColumn = this.columns.find(col => col.id === selected)
        if (!selectedColumn) return

        const firstId = selectedColumn.lines?.[0]
        const index = page.items.findIndex(i => i.id === firstId)
        if (index === -1) return

        const thisLine = page.items[index]
        const previousLine = page.items[index - 1]

        const { setCanvasAndSelector } = new TranscriptionInterface()
        const { region } = setCanvasAndSelector(thisLine, page)
        await this.applyLineSelection(thisLine, previousLine, index, region)
    }
}

customElements.define("tpen-column-selector", ColumnSelector)