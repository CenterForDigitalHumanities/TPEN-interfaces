import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import vault from '../../js/vault.js'
import { orderPageItemsByColumns } from '../../utilities/columnOrdering.js'
import "../check-permissions/permission-match.js"

const eventDispatcher = TPEN.eventDispatcher

/**
 * ColumnSelector - Dropdown for selecting columns when a page has multiple columns defined.
 * Requires LINE SELECTOR view access.
 * @element tpen-column-selector
 */
export default class ColumnSelector extends HTMLElement {
    #page = null
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.columns = []
        this.remainingUnorderedLines = []
        this.allLinesInColumns = []
        this.allLinesInPages = []
    }

    connectedCallback() {
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Removes component if user lacks LINE SELECTOR view access.
     */
    async authgate() {
        if (!CheckPermissions.checkViewAccess("LINE", "SELECTOR")) {
            this.remove()
            return
        }
        await this.findColumnsData()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
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
        const { orderedItems, columnsInPage, allColumnLines } = orderPageItemsByColumns(
            { columns: this.columns, items: page?.items },
            this.#page
        )
        this.columns = columnsInPage
        this.allLinesInColumns = allColumnLines
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

    async selectColumn(e) {
        const selected = e.target.value

        if (selected === "unordered-lines") {
            const firstId = this.remainingUnorderedLines[0]
            const idx = this.#page.items.findIndex(i => i.id === firstId)
            if (idx !== -1) {
                // Dispatch event for transcription interface to handle
                eventDispatcher.dispatch("tpen-column-selected", {
                    lineIndex: idx,
                    columnId: selected,
                    lineId: firstId
                })
            }
            return
        }

        const selectedColumn = this.columns.find(col => col.id === selected)
        if (!selectedColumn) return

        const firstId = selectedColumn.lines?.[0]
        const index = this.#page.items.findIndex(i => i.id === firstId)
        if (index === -1) return

        // Dispatch event for transcription interface to handle
        eventDispatcher.dispatch("tpen-column-selected", {
            lineIndex: index,
            columnId: selected,
            lineId: firstId
        })
    }
}

customElements.define("tpen-column-selector", ColumnSelector)
