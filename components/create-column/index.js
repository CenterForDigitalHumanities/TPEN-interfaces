import TPEN from "../../api/TPEN.js"

class TpenCreateColumn extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        TPEN.attachAuthentication(this)

        this.projectID = null
        this.annotationPageID = null
        this.selectedBoxes = []
        this.lastClickedIndex = null
        this.totalIds = []
        this.existingColumns = []

        this.shadowRoot.innerHTML = `
            <style>
                .columnDiv {
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
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
                    align-items: center;
                    justify-content: flex-start;
                    padding-left: 10px;
                    font-size: 16px;
                }
                .overlayBox.clicked {
                    border-color: red;
                    border-width: 3px;
                    box-shadow: 0 0 12px rgba(255,255,255,0.8);
                    z-index: 10;
                    background-color: rgba(255,0,0,0.8);
                    color: white;
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
                    width: 50%;
                }
                img#canvasImage {
                    width: 100%;
                    display: block;
                }
                .toolbar {
                    position: absolute;
                    top: 80px;
                    left: 50px;
                    width: 20%;
                    padding: 10px;
                    background-color: #f9f9f9;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 8px;
                    z-index: 20;
                }
                #columnTitle {
                    padding: 10px 20px;
                    font-size: 14px;
                    border: 1px solid var(--primary-color);
                    border-radius: 4px;
                    width: 80%;
                    cursor: text;
                }
                button#createColumnBtn, button#clearSelectionBtn {
                    background-color: var(--primary-color);
                    text-transform: uppercase;
                    outline: var(--primary-light) 1px solid;
                    outline-offset: -3.5px;
                    color: var(--white);
                    border-radius: 5px;
                    transition: all 0.3s;
                    padding: 10px 20px;
                    cursor: pointer;
                    width: 100%;
                    margin-top: 1em;
                }
                button#createColumnBtn:hover, button#clearSelectionBtn:hover {
                    background-color: var(--primary-light);
                    outline: var(--primary-color) 1px solid;
                    outline-offset: -1.5px;
                }
                .disabled {
                    pointer-events: none;
                    opacity: 0.6;
                }
            </style>
            <div class="toolbar">
                <input type="text" id="columnTitle" placeholder="Column Title" name="columnTitle"/>
                <button id="createColumnBtn">Create Column</button>
                <button id="clearSelectionBtn">Clear All</button>
            </div>
            <div class="columnDiv">
                <div class="container" id="container"></div>
            </div>
        `

        this.container = this.shadowRoot.querySelector("#container")
        this.createBtn = this.shadowRoot.querySelector("#createColumnBtn")
        this.clearBtn = this.shadowRoot.querySelector("#clearSelectionBtn")
        this.createBtn.addEventListener("click", () => this.createColumn())
        this.clearBtn.addEventListener("click", () => this.clearAllSelections())
        window.addEventListener('beforeunload', async () => await this.saveAnnotationState())
    }

    connectedCallback() {
        localStorage.removeItem('annotationsState')
        const params = new URLSearchParams(window.location.search)
        const annotationPage = params.get("annotationPage")
        this.projectID = params.get("projectID")
        this.annotationPageID = annotationPage.split("/").pop()
        this.loadPage(annotationPage)
    }

    async loadPage(annotationPage = null) {
        try {
            this.showLoading()
            let { imgUrl, annotations, imgWidth, imgHeight } = await this.fetchPageViewerData(annotationPage)
            await this.renderImage(imgUrl)
            const page = await TPEN.activeProject.layers.flatMap(layer => layer.pages || []).find(p => p.id.split('/').pop() === this.annotationPageID)
            this.existingColumns = page?.columns || []
            const assignedAnnotationIds = []
            this.existingColumns.forEach(column => {
                column.lines.forEach(annoId => assignedAnnotationIds.push({
                    lineid: annoId, columnLabel: column.label
                }))
            })
            const filteredAnnotations = assignedAnnotationIds.filter(a => a.columnLabel !== "Unordered Column")
            this.totalIds = annotations.filter(anno => !filteredAnnotations.find(a => a.lineid === anno.lineid)).map(a => a.lineid)

            localStorage.setItem('annotationsState', JSON.stringify({
                remainingIDs: this.totalIds,
                selectedIDs: []
            }))

            this.renderAnnotations(annotations, imgWidth, imgHeight, filteredAnnotations)
            this.restoreAnnotationState()
        } catch (e) {
            this.showError(e.message)
        }
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
    isValidJSON(input) {
        try {
            (typeof input === "string") ? JSON.parse(input) : JSON.parse(JSON.stringify(input))
            return true
        } catch {
            return false
        }
    }

    async getSpecificTypeData(type) {
        if (!type) throw new Error("No IIIF resource provided")
        if (typeof type === "string" && this.isValidUrl(type)) {
            const res = await fetch(type)
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
            return await res.json()
        } else if (typeof type === "object" && this.isValidJSON(type)) return type
        else throw new Error("Invalid IIIF input")
    }

    async fetchPageViewerData(annotationPage) {
        const annotationPageData = annotationPage ? await this.getSpecificTypeData(annotationPage) : null
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
                const res = await fetch(anno.id)
                const data = await res.json()
                return { target: data?.target?.selector?.value ?? data?.target, lineid: data?.id }
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
        this.container.innerHTML = `<div class="error-message"><strong>Error:</strong>${message}</div>` 
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

    async saveAnnotationState() {
        const saved = localStorage.getItem('annotationsState')
        if (!saved) return
        const { remainingIDs = [] } = JSON.parse(saved)
        try {
            const res = await fetch(`${TPEN.servicesURL}/project/${this.projectID}/page/${this.annotationPageID}/unordered-column`, {
                method: 'POST',
                headers: { 
                    "Authorization": `Bearer ${TPEN.getAuthorization()}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    label: 'Unordered Column',
                    annotations: remainingIDs,
                    unordered: true
                })
            })
            if (!res.ok) throw new Error(`Server error: ${res.status}`)
        } catch (error) {
            console.error("Error saving annotation state:", error)
        }
    }

    restoreAnnotationState() {
        const saved = localStorage.getItem('annotationsState')
        if (!saved) return
        const { selectedIDs = [] } = JSON.parse(saved)
        const boxes = Array.from(this.shadowRoot.querySelectorAll('.overlayBox'))
        this.selectedBoxes = boxes.filter(b => selectedIDs.includes(b.dataset.lineid))
        this.selectedBoxes.forEach((b, idx) => {
            b.classList.add('clicked')
            b.textContent = idx + 1
        })
        boxes.forEach(b => {
            if (b.classList.contains('disabled')) return
            if (!selectedIDs.includes(b.dataset.lineid)) b.textContent = ''
        })
        if (this.selectedBoxes.length) {
            const lastId = selectedIDs[selectedIDs.length - 1]
            this.lastClickedIndex = boxes.findIndex(b => b.dataset.lineid === lastId)
        }
    }

    renderAnnotations(annotations, imgWidth, imgHeight, filteredAnnotations = []) {
        this.annotationData = annotations
        const createdBoxes = []

        annotations.forEach((anno, i) => {
            if (!anno.target) return

            const { x, y, w, h } = this.parseXYWH(anno.target)

            const box = document.createElement("div")
            box.className = "overlayBox"
            box.dataset.index = i
            box.dataset.lineid = anno.lineid

            box.style.left   = `${(x / imgWidth) * 100}%`
            box.style.top    = `${(y / imgHeight) * 100}%`
            box.style.width  = `${(w / imgWidth) * 100}%`
            box.style.height = `${(h / imgHeight) * 100}%`

            box.addEventListener("click", (event) => this.selectAnnotation(box, event))

            createdBoxes.push(box)
        })

        createdBoxes.sort((a, b) =>
            parseFloat(a.style.top) - parseFloat(b.style.top)
        )

        createdBoxes.forEach(box => {
            this.container.appendChild(box)

            const filtered = filteredAnnotations.find(a => a.lineid === box.dataset.lineid)
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

        const selectedIDs = this.selectedBoxes.map(b => b.dataset.lineid)
        const remainingIDs = this.totalIds.filter(id => !this.selectedBoxes.some(b => b.dataset.lineid === id))
        localStorage.setItem('annotationsState', JSON.stringify({ remainingIDs, selectedIDs }))
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
            if (typeof col.label === "string") {
                return col.label === columnLabel
            }
        })
        if (duplicate) {
            return TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Column label already exists. Please choose a different label.' 
            })
        }
        
        const selectedIDs = this.selectedBoxes.map(b => b.dataset.lineid)
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
            this.selectedBoxes.forEach(b => b.remove())
            this.totalIds = this.totalIds.filter(id => !this.selectedBoxes.some(b => b.dataset.lineid === id))
            localStorage.setItem('annotationsState', JSON.stringify({ remainingIDs: this.totalIds, selectedIDs: [] }))
            window.location.reload()

            this.selectedBoxes = []
            this.lastClickedIndex = null
            this.shadowRoot.getElementById("columnTitle").value = ""
            TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "info", message: 'Column created successfully.' 
            })
        } catch (err) {
            console.error("Column creation failed:", err)
            TPEN.eventDispatcher.dispatch("tpen-toast", { 
                status: "error", message: 'Failed to create column.' 
            })
        }
    }

    async clearAllSelections() {
        const boxes = Array.from(this.shadowRoot.querySelectorAll('.overlayBox'))
        boxes.forEach(b => {
            b.classList.remove('clicked','disabled')
            b.textContent = ''
        })
        this.selectedBoxes = []
        this.lastClickedIndex = null
        const params = new URLSearchParams(window.location.search)
        const annotationPage = params.get("annotationPage")
        let { annotations } = await this.fetchPageViewerData(annotationPage)
        this.totalIds = annotations.map(a => a.lineid)

        localStorage.setItem('annotationsState', JSON.stringify({
            remainingIDs: this.totalIds,
            selectedIDs: []
        }))

        try {
            const res = await fetch(`${TPEN.servicesURL}/project/${this.projectID}/page/${this.annotationPageID}/clear-columns`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${TPEN.getAuthorization()}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!res.ok) throw new Error(`Server error: ${res.status}`)
        } catch (err) {
            console.error("Failed to clear columns:", err)
        }
    }
}

customElements.define("tpen-create-column", TpenCreateColumn)
