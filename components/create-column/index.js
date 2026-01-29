import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from "../../utilities/CleanupRegistry.js"

/**
 * TpenCreateColumn - Interface for creating and managing columns on annotation pages.
 * Requires LINE SELECTOR all access.
 * @element tpen-create-column
 */
class TpenCreateColumn extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers (annotation boxes) */
    renderCleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for dynamic workspace listeners */
    workspaceCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })

        this.projectID = null
        this.pageID = null
        this.annotationPageID = null
        this.selectedBoxes = []
        this.lastClickedIndex = null
        this.totalIds = []
        this.existingColumns = []
        this.originalColumnLabels = []

        this.shadowRoot.innerHTML = `
            <style>
                .columnDiv {
                    position: relative;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-direction: row;
                    gap: 20px;
                    width: 100%;
                }
                .overlayBox {
                    position: absolute;
                    border: 2px solid rgba(255,255,255,0.7);
                    pointer-events: auto;
                    box-sizing: border-box;
                    cursor: pointer;
                    transition: box-shadow 0.15s ease, border-color 0.15s ease;
                    border-radius: 2px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: flex-start;
                    padding-left: 10px;
                    font-size: 12px;
                }
                .overlayBox.clicked {
                    border-color: red;
                    border-width: 3px;
                    box-shadow: 0 0 12px rgba(255,255,255,0.8);
                    z-index: 10;
                    background-color: rgba(255,0,0,0.8);
                    color: rgb(255, 255, 255);
                    font-weight: bold;
                }
                .loading, .error-message {
                    color: #333;
                    padding: 1em;
                    font-family: sans-serif;
                }
                .loading {
                    text-align: center;
                }
                .error-message {
                    color: red;
                }
                .container {
                    position: relative;
                    display: inline-block;
                    width: 45%;
                }
                img#canvasImage {
                    width: 100%;
                    display: block;
                }
                .toolbar {
                    width: 20%;
                    min-height: 200px;
                    height: fit-content;
                    padding: 10px;
                    background-color: #f9f9f9;
                    border: 2px solid var(--primary-color);
                    border-radius: 5px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 8px;
                }
                #columnTitle, .merge-column-input {
                    padding: 10px 20px;
                    font-size: 14px;
                    border: 1px solid var(--primary-color);
                    border-radius: 4px;
                    width: 80%;
                    cursor: text;
                }
                button#createColumnBtn, button#clearSelectionBtn, button#mergeColumnBtn, button#extendColumnBtn {
                    background-color: var(--primary-color);
                    text-transform: uppercase;
                    outline: var(--primary-light) 1px solid;
                    outline-offset: -3.5px;
                    color: rgb(255, 255, 255);
                    border-radius: 5px;
                    transition: all 0.3s;
                    padding: 10px 20px;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 1em;
                }
                button#createColumnBtn:hover, button#clearSelectionBtn:hover, button#mergeColumnBtn:hover, button#extendColumnBtn:hover {
                    background-color: var(--primary-light);
                    outline: var(--primary-color) 1px solid;
                    outline-offset: -1.5px;
                }
                .disabled {
                    pointer-events: none;
                    opacity: 0.6;
                }
                .workspace-title {
                    margin: 0;
                    font-size: 1.4em;
                    text-align: center;
                    color: var(--primary-color);
                }
                .workspace-description {
                    text-align: center;
                    color: gray;
                    margin-top: 0.5em;
                    font-size: 1em;
                }
                .mode-options {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    font-size: 14px;
                    width: 95%;
                    justify-content: flex-start;
                }
                .mode-options label {
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 15px;
                    color: var(--primary-color);
                }
                .mode-options input[type="checkbox"] {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }
                .disable-other {
                    pointer-events: none;
                    user-select: none;
                    opacity: 0.5;
                    color: gray !important;
                }
                .disable-button {
                    pointer-events: none;
                    user-select: none;
                    opacity: 0.5;
                    background-color: gray !important;
                    border-color: gray !important;
                    color: #fff;
                    cursor: not-allowed;
                }
                .toolbar-workspace {
                    width: 25%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 8px;
                }
                .merge-label-btn, .extend-label-btn {
                    background-color: var(--primary-color);
                    text-transform: uppercase;
                    outline: var(--primary-light) 1px solid;
                    outline-offset: -3.5px;
                    color: rgb(255, 255, 255);
                    border-radius: 5px;
                    transition: all 0.3s;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                }
                .merge-label-btn:hover, .extend-label-btn:hover {
                    background-color: var(--primary-light);
                    outline: var(--primary-color) 1px solid;
                    outline-offset: -1.5px;
                }
                .merge-label-btn[data-selected="true"], .extend-label-btn[data-selected="true"] {
                    border: 8px solid var(--primary-color);
                }
            </style>
            <div class="columnDiv">
                <div class="toolbar">
                    <input type="text" id="columnTitle" placeholder="Column Title" name="columnTitle"/>
                    <div class="mode-options">
                        <input type="checkbox" id="mergeColumnsCheckbox" name="mergeColumns"/>
                        <label id="mergeColumnsLabel" for="mergeColumnsCheckbox">Merge Columns Mode</label>
                    </div>
                    <div class="mode-options">
                        <input type="checkbox" id="extendColumnCheckbox" name="extendColumn"/>
                        <label id="extendColumnLabel" for="extendColumnCheckbox">Extend Column Mode</label>
                    </div>
                    <button id="createColumnBtn">Create Column</button>
                    <button id="clearSelectionBtn">Clear All</button>
                </div>
                <div class="container" id="container"></div>
                <div class="toolbar toolbar-workspace">
                    <h2 class="workspace-title">Workspace</h2>
                    <p class="workspace-description">Use this area to merge or extend existing columns.</p>
                </div>
            </div>
        `

        this.container = this.shadowRoot.querySelector("#container")
        this.createBtn = this.shadowRoot.querySelector("#createColumnBtn")
        this.clearBtn = this.shadowRoot.querySelector("#clearSelectionBtn")
        this.mergeColumnsCheckbox = this.shadowRoot.querySelector("#mergeColumnsCheckbox")
        this.extendColumnCheckbox = this.shadowRoot.querySelector("#extendColumnCheckbox")
        this.mergeColumnsLabel = this.shadowRoot.querySelector("#mergeColumnsLabel")
        this.extendColumnLabel = this.shadowRoot.querySelector("#extendColumnLabel")
        this.columnTitleInput = this.shadowRoot.querySelector("#columnTitle")
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        localStorage.removeItem('annotationsState')
        const params = new URLSearchParams(window.location.search)
        this.pageID = `${TPEN.RERUMURL}/id/${params.get("pageID")}`
        this.projectID = params.get("projectID")
        this.annotationPageID = this.pageID.split("/").pop()
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before loading page.
     * Shows permission message if user lacks LINE SELECTOR all access.
     */
    authgate() {
        if (!CheckPermissions.checkAllAccess("LINE", "SELECTOR")) {
            this.container.innerHTML = `<div class="error-message">You do not have permission to manage columns.</div>`
            return
        }
        this.addEventListeners()
        this.loadPage(this.pageID)
    }

    /**
     * Registers event listeners using CleanupRegistry for proper cleanup.
     */
    addEventListeners() {
        this.cleanup.onElement(this.createBtn, "click", () => this.createColumn())
        this.cleanup.onElement(this.clearBtn, "click", () => this.clearAllSelections())
        this.cleanup.onElement(this.mergeColumnsCheckbox, "change", () => this.handleModeChange())
        this.cleanup.onElement(this.extendColumnCheckbox, "change", () => this.handleModeChange())
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.workspaceCleanup.run()
        this.renderCleanup.run()
        this.cleanup.run()
    }

    async columnLabelCheck() {
        this.originalColumnLabels = this.existingColumns.map(col => col.label)
        this.existingColumns = this.existingColumns.map((col, index) => {
            const { label } = col
            const isAutoLabel = label.startsWith("Column ") && /^[a-f\d]{24}$/i.test(label.slice(7))
            return {
                ...col,
                label: isAutoLabel ? `Unnamed ${index + 1}` : label
            }
        })
    }

    async loadPage(pageID = null) {
        try {
            this.showLoading()
            let { imgUrl, annotations, imgWidth, imgHeight } = await this.fetchPageViewerData(pageID)
            await this.renderImage(imgUrl)
            const page = TPEN.activeProject.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === this.annotationPageID)
            this.existingColumns = page?.columns?.map(column => ({ label: column.label, lines: column.lines })) || []
            const assignedAnnotationIds = []
            await this.columnLabelCheck()
            this.existingColumns.forEach(column => {
                column.lines.forEach(annoId => assignedAnnotationIds.push({
                    lineId: annoId, columnLabel: column.label
                }))
            })
            this.totalIds = annotations.filter(anno => !assignedAnnotationIds.find(a => a.lineId === anno.lineId)).map(a => a.lineId)
            localStorage.setItem('annotationsState', JSON.stringify({
                remainingIDs: this.totalIds,
                selectedIDs: []
            }))

            this.renderAnnotations(annotations, imgWidth, imgHeight, assignedAnnotationIds)
            this.restoreAnnotationState()
        } catch (e) {
            this.showError(e.message)
        }
    }

    handleModeChange() {
        if (this.extendColumnCheckbox.checked || this.mergeColumnsCheckbox.checked) {
            this.createBtn.classList.add("disable-button")
            this.columnTitleInput.disabled = true
            const workspaceToolbar = this.shadowRoot.querySelectorAll('.toolbar')[1]
            workspaceToolbar.style.justifyContent = 'space-between'
        } else {
            this.createBtn.classList.remove("disable-button")
            this.columnTitleInput.disabled = false
            const workspaceToolbar = this.shadowRoot.querySelectorAll('.toolbar')[1]
            workspaceToolbar.innerHTML = `
                <h2 class="workspace-title">Workspace</h2>
                <p class="workspace-description">Use this area to merge existing columns or extend them.</p>
            `
            workspaceToolbar.style.justifyContent = 'flex-start'
        }

        if (this.extendColumnCheckbox.checked) {
            this.mergeColumnsCheckbox.classList.add("disable-other")
            this.mergeColumnsLabel.classList.add("disable-other")
        } else {
            this.mergeColumnsCheckbox.classList.remove("disable-other")
            this.mergeColumnsLabel.classList.remove("disable-other")
        }

        if (this.mergeColumnsCheckbox.checked) {
            this.extendColumnCheckbox.classList.add("disable-other")
            this.extendColumnLabel.classList.add("disable-other")
        } else {
            this.extendColumnCheckbox.classList.remove("disable-other")
            this.extendColumnLabel.classList.remove("disable-other")
        }

        if (this.extendColumnCheckbox.checked) {
            this.extendColumn()
        }

        if (this.mergeColumnsCheckbox.checked) {
            this.mergeColumns()
        }
    }

    mergeColumns() {
        // Clear previous workspace listeners
        this.workspaceCleanup.run()
        const columnLabelsToMerge = []
        const columnLabels = this.existingColumns.map(col => col.label).filter(label => label)
        const workspaceToolbar = this.shadowRoot.querySelectorAll('.toolbar')[1]
        workspaceToolbar.innerHTML = `<h2 class="workspace-title">Workspace - Merge Columns Mode</h2>`
        const workspaceMessage = document.createElement('div')
        workspaceMessage.style.marginTop = '1em'
        workspaceMessage.style.color = 'red'
        workspaceMessage.style.fontWeight = '600'
        workspaceMessage.style.fontSize = '1em'
        if (columnLabels.length === 0) {
            workspaceMessage.textContent = 'No columns available to merge.'
            const workspaceToolbar = this.shadowRoot.querySelectorAll('.toolbar')[1]
            workspaceToolbar.style.justifyContent = 'flex-start'
            workspaceToolbar.appendChild(workspaceMessage)
            return
        }

        const input = document.createElement('input')
        input.type = 'text'
        input.placeholder = 'Enter new column label'
        input.classList.add('merge-column-input')
        workspaceToolbar.appendChild(input)

        columnLabels.forEach(label => {
            const btn = document.createElement('button')
            btn.classList.add('merge-label-btn')
            btn.textContent = label
            btn.style.margin = '5px'
            btn.style.padding = '8px 12px'
            btn.style.cursor = 'pointer'
            this.workspaceCleanup.onElement(btn, 'click', () => {
                if(!btn.dataset.selected) {
                    btn.dataset.selected = 'true'
                    btn.style.backgroundColor = 'rgb(255, 255, 255)'
                    btn.style.color = 'var(--primary-color)'
                    columnLabelsToMerge.push(columnLabels.indexOf(label) !== -1 ? columnLabels.indexOf(label) : '')
                } else {
                    delete btn.dataset.selected
                    btn.style.backgroundColor = 'var(--primary-color)'
                    btn.style.color = 'rgb(255, 255, 255)'
                    const index = columnLabelsToMerge.indexOf(columnLabels.indexOf(label))
                    if (index > -1) {
                        columnLabelsToMerge.splice(index, 1)
                    }
                }
            })
            workspaceToolbar.appendChild(btn)
        })

        const mergeColumnBtn = document.createElement('button')
        mergeColumnBtn.id = 'mergeColumnBtn'
        mergeColumnBtn.textContent = 'Merge Columns'
        mergeColumnBtn.style.marginTop = '1em'
        workspaceToolbar.appendChild(mergeColumnBtn)

        this.workspaceCleanup.onElement(mergeColumnBtn, 'click', async () => {
            const newLabel = input.value.trim()
            if (!newLabel) {
                return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "error", message: 'Please enter a new column label.' 
                })
            }

            const duplicate = this.existingColumns.some(col => {
                const existingLabel = (col.label ?? "").toString().trim()
                return existingLabel === newLabel
            })
            if (duplicate) {
                return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "error", message: 'Column label already exists. Please choose a different label.' 
                })
            }

            try {
                const res = await fetch(`${TPEN.servicesURL}/project/${this.projectID}/page/${this.annotationPageID}/column`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${TPEN.getAuthorization()}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        newLabel,
                        columnLabelsToMerge: columnLabelsToMerge.map(index => this.originalColumnLabels[index]),
                    })
                })
                if (!res.ok) throw new Error(`Failed to merge columns: ${res.status}`)
                TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "success", message: 'Columns merged successfully.' 
                })
                window.location.reload()
            } catch (error) {
                TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "error", message: error.message 
                })
            }
        })
    }

    extendColumn() {
        // Clear previous workspace listeners
        this.workspaceCleanup.run()
        let columnToExtend = ''
        const columnLabels = this.existingColumns.map(col => col.label).filter(label => label)
        const workspaceToolbar = this.shadowRoot.querySelectorAll('.toolbar')[1]
        workspaceToolbar.innerHTML = `<h2 class="workspace-title">Workspace - Extend Column Mode</h2>`
        const workspaceMessage = document.createElement('div')
        workspaceMessage.style.marginTop = '1em'
        workspaceMessage.style.color = 'red'
        workspaceMessage.style.fontWeight = '600'
        workspaceMessage.style.fontSize = '1em'
        if (columnLabels.length === 0) {
            workspaceMessage.textContent = 'No columns available to extend.'
            const workspaceToolbar = this.shadowRoot.querySelectorAll('.toolbar')[1]
            workspaceToolbar.style.justifyContent = 'flex-start'
            workspaceToolbar.appendChild(workspaceMessage)
            return
        }

        columnLabels.forEach(label => {
            const btn = document.createElement('button')
            btn.classList.add('extend-label-btn')
            btn.textContent = label
            btn.style.margin = '5px'
            btn.style.padding = '8px 12px'
            btn.style.cursor = 'pointer'
            this.workspaceCleanup.onElement(btn, 'click', () => {
                if (btn.dataset.selected) {
                    columnToExtend = ''
                    delete btn.dataset.selected
                    btn.style.backgroundColor = 'var(--primary-color)'
                    btn.style.color = 'rgb(255, 255, 255)'
                }
                else {
                    columnToExtend = columnLabels.indexOf(label) !== -1 ? columnLabels.indexOf(label) : ''
                    Array.from(workspaceToolbar.querySelectorAll('.extend-label-btn')).forEach(otherBtn => {
                        if (otherBtn !== btn) {
                            delete otherBtn.dataset.selected
                            otherBtn.style.backgroundColor = 'var(--primary-color)'
                            otherBtn.style.color = 'rgb(255, 255, 255)'
                        }
                    })
                    btn.dataset.selected = 'true'
                    btn.style.backgroundColor = 'rgb(255, 255, 255)'
                    btn.style.color = 'var(--primary-color)'
                }
            })
            workspaceToolbar.appendChild(btn)
        })

        const extendColumnBtn = document.createElement('button')
        extendColumnBtn.id = 'extendColumnBtn'
        extendColumnBtn.textContent = 'Extend Column'
        extendColumnBtn.style.marginTop = '1em'
        workspaceToolbar.appendChild(extendColumnBtn)

        this.workspaceCleanup.onElement(extendColumnBtn, 'click', async () => {
            if (!this.originalColumnLabels[columnToExtend]) {
                return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "error", message: 'Please select a column to extend.' 
                })
            }

            if (this.selectedBoxes.length === 0) {
                return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "error", message: 'Please select annotations to add to the column.' 
                })
            }

            try {
                const annotationIdsToAdd = this.selectedBoxes.map(box => box.dataset.lineId)
                const res = await fetch(`${TPEN.servicesURL}/project/${this.projectID}/page/${this.annotationPageID}/column`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${TPEN.getAuthorization()}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        columnLabel: this.originalColumnLabels[columnToExtend],
                        annotationIdsToAdd
                    })
                })
                if (!res.ok) throw new Error(`Failed to extend column: ${res.status}`)
                TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "success", message: 'Column extended successfully.' 
                })
                window.location.reload()
            } catch (error) {
                TPEN.eventDispatcher.dispatch("tpen-toast", { 
                    status: "error", message: error.message 
                })
            }
        })
    }

    parseXYWH(target) {
        const xywh = target.replace("xywh=pixel:", "").split(",").map(Number)
        return { x: xywh[0], y: xywh[1], w: xywh[2], h: xywh[3] }
    }

    isValidUrl(str) {
        try {
            new URL(str)
            return true
        } catch {
            return false
        }
    }

    async getSpecificTypeData(type) {
        if (!type) throw new Error("No IIIF resource provided")
        if (typeof type === "string" && this.isValidUrl(type)) {
            const res = await fetch(type, { cache: "no-store" })
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
            return await res.json()
        }
    }

    async fetchPageViewerData(pageID = null) {
        const annotationPageData = pageID ? await this.getSpecificTypeData(pageID) : null
        const canvasData = await this.getSpecificTypeData(annotationPageData.target)
        return await this.processDirectCanvasData(canvasData, annotationPageData)
    }

    async processDirectCanvasData(canvasData, annotationPageData = { items: [] }) {
        const canvasInfo = await this.extractImageInfo(canvasData)
        const annotations = await this.extractAnnotations(annotationPageData)
        return { ...canvasInfo, annotations }
    }

    async extractAnnotations(annotationPageData) {
        if (!annotationPageData?.items) return []
        const results = await Promise.all(annotationPageData.items.map(async anno => {
            try {
                const res = await fetch(anno.id, { cache: "no-store" })
                const data = await res.json()
                return { target: data?.target?.selector?.value ?? data?.target, lineId: data?.id }
            } catch { return null }
        }))
        return results.filter(r => r)
    }

    async extractImageInfo(canvasData) {
        const imgUrl = canvasData?.items?.[0]?.items?.[0]?.body?.id ?? canvasData?.images?.[0]?.resource?.["@id"] ?? canvasData?.images?.[0]?.resource?.id
        const imgWidth = canvasData?.width
        const imgHeight = canvasData?.height
        if (!imgUrl || !imgWidth || !imgHeight) throw new Error("Missing image data")
        return { imgUrl, imgWidth, imgHeight }
    }

    showError(message) { 
        this.container.innerHTML = `<div class="error-message"><strong>Error:</strong> ${message}</div>` 
    }

    showLoading(message = "Loading...") { 
        this.container.innerHTML = `<div class="loading">${message}</div>` 
    }

    async renderImage(imgUrl) {
        return new Promise((resolve, reject) => {
            const img = document.createElement("img")
            img.id = "canvasImage"
            img.src = imgUrl
            img.onload = () => resolve(img)
            img.onerror = () => reject("Failed to load image")
            this.container.innerHTML = ""
            this.container.appendChild(img)
        })
    }

    restoreAnnotationState() {
        const saved = localStorage.getItem('annotationsState')
        if (!saved) return
        const { selectedIDs = [] } = JSON.parse(saved)
        const boxes = Array.from(this.shadowRoot.querySelectorAll('.overlayBox'))
        this.selectedBoxes = boxes.filter(b => selectedIDs.includes(b.dataset.lineId))
        this.selectedBoxes.forEach((b, idx) => {
            b.classList.add('clicked')
            b.textContent = idx + 1
        })
        boxes.forEach(b => {
            if (b.classList.contains('disabled')) return
            if (!selectedIDs.includes(b.dataset.lineId)) b.textContent = ''
        })
        if (this.selectedBoxes.length) {
            const lastId = selectedIDs[selectedIDs.length - 1]
            this.lastClickedIndex = boxes.findIndex(b => b.dataset.lineId === lastId)
        }
    }

    renderAnnotations(annotations, imgWidth, imgHeight, filteredAnnotations = []) {
        // Clear previous annotation box listeners
        this.renderCleanup.run()

        this.annotationData = annotations
        const createdBoxes = []

        annotations.forEach((anno, i) => {
            if (!anno.target) return

            const { x, y, w, h } = this.parseXYWH(anno.target)

            const box = document.createElement("div")
            box.className = "overlayBox"
            box.dataset.index = i
            box.dataset.lineId = anno.lineId

            box.style.left   = `${(x / imgWidth) * 100}%`
            box.style.top    = `${(y / imgHeight) * 100}%`
            box.style.width  = `${(w / imgWidth) * 100}%`
            box.style.height = `${(h / imgHeight) * 100}%`

            this.renderCleanup.onElement(box, "click", (event) => this.selectAnnotation(box, event))

            createdBoxes.push(box)
        })

        createdBoxes.sort((a, b) =>
            parseFloat(a.style.top) - parseFloat(b.style.top)
        )

        createdBoxes.forEach(box => {
            this.container.appendChild(box)

            const filtered = filteredAnnotations.find(a => a.lineId === box.dataset.lineId)
            if (filtered) {
                box.textContent = filtered.columnLabel
                box.classList.add("clicked", "disabled")
            }
        })
    }

    selectAnnotation(box, event) {
        if (box.classList.contains('disabled')) return
        const boxes = Array.from(this.shadowRoot.querySelectorAll('.overlayBox'))
        const clickedIndex = boxes.indexOf(box)

        if (event.shiftKey && this.lastClickedIndex !== null) {
            const [start, end] = [this.lastClickedIndex, clickedIndex].sort((a, b) => a - b)
            for (let i = start; i <= end; i++) {
                const b = boxes[i]
                if (!b.classList.contains('disabled') && !this.selectedBoxes.includes(b)) this.selectedBoxes.push(b)
                if (!b.classList.contains('disabled')) b.classList.add('clicked')
            }
        } else if (event.metaKey || event.ctrlKey) {
            if (box.classList.contains('clicked')) {
                box.classList.remove('clicked')
                this.selectedBoxes = this.selectedBoxes.filter(b => b !== box)
            } else {
                box.classList.add('clicked')
                this.selectedBoxes.push(box)
            }
            this.lastClickedIndex = clickedIndex
        } else {
            boxes.forEach(b => {
                if (!b.classList.contains('disabled')) b.classList.remove('clicked')
            })
            this.selectedBoxes = [box]
            box.classList.add('clicked')
            this.lastClickedIndex = clickedIndex
        }

        this.selectedBoxes.forEach((b, idx) => b.textContent = idx + 1)
        boxes.forEach(b => {
            if (!this.selectedBoxes.includes(b) && !b.classList.contains('disabled')) b.textContent = ''
        })

        const selectedIDs = this.selectedBoxes.map(b => b.dataset.lineId)
        const remainingIDs = this.totalIds.filter(id => !this.selectedBoxes.some(b => b.dataset.lineId === id))
        try {
            localStorage.setItem('annotationsState', JSON.stringify({ remainingIDs, selectedIDs }))
        } catch (e) {
            // localStorage may be unavailable (e.g., private mode, quota exceeded)
            console.warn('Could not save annotationsState to localStorage:', e)
        }
    }

    async createColumn() {
        if (!this.selectedBoxes?.length)
            return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Please select annotations first.' 
            })

        const columnLabel = this.shadowRoot.getElementById("columnTitle").value.trim()
        if (!columnLabel)
            return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Please enter a column title.' 
            })

        const duplicate = this.existingColumns.some(col => {
            const existingLabel = (col.label ?? "").toString().trim()
            return existingLabel === columnLabel
        })
        if (duplicate) {
            return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Column label already exists. Please choose a different label.' 
            })
        }
        
        const selectedIDs = this.selectedBoxes.map(b => b.dataset.lineId)
        try {
            const res = await fetch(`${TPEN.servicesURL}/project/${this.projectID}/page/${this.annotationPageID}/column`, {
                method: "POST",
                headers: {  
                    "Authorization": `Bearer ${TPEN.getAuthorization()}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                    label: columnLabel, 
                    annotations: selectedIDs 
                })
            })

            if (!res.ok) 
                throw new Error(`Server error: ${res.status}`)
            TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "success", message: 'Column created successfully.' 
            })
            window.location.reload()
        } catch (err) {
            TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Failed to create column.' 
            })
        }
    }

    async clearAllSelections() {
        try {
            const res = await fetch(`${TPEN.servicesURL}/project/${this.projectID}/page/${this.annotationPageID}/clear-columns`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${TPEN.getAuthorization()}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!res.ok) throw new Error(`Server error: ${res.status}`)
            TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "info", message: 'All columns cleared successfully.' 
            })
            window.location.reload()
        } catch (err) {
            TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Failed to clear columns: ' + err.message 
            })
        }
    }
}

customElements.define("tpen-create-column", TpenCreateColumn)
