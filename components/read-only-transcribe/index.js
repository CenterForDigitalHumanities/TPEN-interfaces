class ReadOnlyViewTranscribe extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.layers = {}
        this.pages = []
        this.currentLayer = null
        this.viewer = null
        this.currentPage = 0
    }

    connectedCallback() {
        this.render()
        this.loadAnnotations()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                #openseadragon {
                    width: 70%;
                    height: 80vh;
                    background-image: url(https://t-pen.org/TPEN/images/loading2.gif);
                    background-repeat: no-repeat;
                    background-position: center;
                    padding: 20px;
                }

                .annotation-box {
                    position: absolute;
                    border: 1px solid #ff6f3d;
                    pointer-events: auto;
                    box-sizing: border-box;
                    border-radius: 2px;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .annotation-box:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 10px rgba(255, 111, 61, 0.3);
                }

                .annotation-label {
                    display: none;
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #ff6f3d;
                    color: white;
                    font-size: 13px;
                    font-weight: 500;
                    padding: 4px 8px;
                    border-radius: 4px;
                    white-space: nowrap;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                    opacity: 0;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    pointer-events: none;
                }

                .annotation-box:hover .annotation-label {
                    display: block;
                    opacity: 1;
                    transform: translateX(-50%) translateY(-4px);
                }

                .page-controls {
                    margin: 10px;
                    text-align: center;
                }

                .page-controls button {
                    padding: 6px 12px;
                    margin: 0 5px;
                    font-size: 14px;
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .page-controls button:disabled {
                    background-color: #ccc;
                    cursor: default;
                }

                .layer-container {
                    margin: auto 10px;
                }

                select {
                    padding: 6px 12px;
                    font-size: 14px;
                    border-radius: 4px;
                    border: 1px solid #ccc;
                }

                .transcribe-message {
                    position: absolute;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 14px;
                    z-index: 1000;
                }

                .transcribe-title {
                    font-size: 25px;
                    font-weight: bold;
                    display: inline-block;
                    margin: 0;
                }

                .transcribe-container {
                    display: flex;
                    justify-content: center;
                    margin: auto;
                    gap: 30px;
                    padding-bottom: 10px;
                }

                .transcription-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .transcribed-text {
                   width: 30%;
                   height: 80vh;
                   overflow: auto;
                   padding: 10px;
                   box-sizing: border-box;
                   background: rgba(255, 255, 255, 0.8);
                   border: 1px solid #ccc;
                   border-radius: 4px;
                   margin: 10px;
               }
                
                .transcribed-text p {
                    margin: 6px 0;
                    padding: 4px 6px;
                    font-size: 20px;
                    line-height: 1.5;
                    cursor: pointer;
                    border-bottom: 1px solid black;
                    transition: background 0.2s ease, border-color 0.2s ease;
                    color: black;
                }

                .transcribed-text p:hover {
                    background: rgba(255, 111, 61, 0.1);
                    border-bottom: 1px solid rgba(255, 111, 61, 0.4);
                }
            </style>
            <div class="transcribe-container">
                <h2 class="transcribe-title"></h2>
                <div class="layer-container">
                    <select id="layerSelect">
                        <option value="">Select a Layer</option>
                    </select>
                    <select id="canvasSelect">
                        <option value="">Select a Canvas</option>
                    </select>
                </div>
            </div>
            <div class="transcription-container">
                <div id="openseadragon"></div>
                <div class="transcribed-text"></div>
            </div>
            <div class="page-controls">
                <button id="prevPage">Previous Page</button>
                <button id="nextPage">Next Page</button>
                <span id="pageNumber"></span>
            </div>
        `

        this.shadowRoot.getElementById("nextPage").addEventListener("click", () => {
            if (this.currentPage < this.pages.length - 1) this.openPage(this.currentPage + 1)
        })

        this.shadowRoot.getElementById("prevPage").addEventListener("click", () => {
            if (this.currentPage > 0) this.openPage(this.currentPage - 1)
        })

        this.shadowRoot.getElementById("layerSelect").addEventListener("change", (e) => {
            this.currentLayer = e.target.value
            this.populateCanvasDropdown()
            if (this.pages.length > 0) this.openPage(0)
        })

        this.shadowRoot.getElementById("canvasSelect").addEventListener("change", (e) => {
            const canvasIndex = this.pages.indexOf(e.target.value)
            if (canvasIndex !== -1) this.openPage(canvasIndex)
        })

        this.viewer = OpenSeadragon({
            element: this.shadowRoot.getElementById("openseadragon"),
            prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/images/"
        })
    }

    async loadAnnotations() {
        const staticUrl = "https://dev.static.t-pen.org"
        const output = {}
        const canvasMap = {}
        const projectID = new URLSearchParams(window.location.search).get('projectID')
        const manifestUrl = `${staticUrl}/${projectID}/manifest.json`

        try {
            const response = await fetch(manifestUrl)
            if (!response.ok) {
                const errText = await response.text()
                throw new Error(`GitHub read failed: ${response.status} - ${errText}`)
            }
            const manifest = await response.json()

            this.shadowRoot.querySelector(".transcribe-title").textContent = `Transcription for ${manifest.label.none?.[0]}`

            for (const canvas of manifest.items) {
                const imageUrl = canvas.items[0].items.find(i => i.motivation === "painting").body.id
                const canvasLabel = canvas.annotations?.[0]?.label?.none?.[0] || `Default Canvas ${manifest.items.indexOf(canvas) + 1}`
                canvasMap[imageUrl] = canvasLabel
            }

            for (const canvas of manifest.items) {
                const imgUrl = canvas.items[0].items.find(i => i.motivation === "painting").body.id
                const annotations = canvas.annotations

                if (!annotations || annotations.length === 0) {
                    const defaultLayer = 'Default Layer'
                if (!output[defaultLayer]) output[defaultLayer] = {}
                    output[defaultLayer][imgUrl] = { label: canvasMap[imgUrl], lines: [] }
                    continue
                }

                for (const annoPage of annotations) {
                    const partOfId = await fetch(annoPage.partOf[0].id).then(res => res.json())
                    const layerLabel = partOfId.label.none[0]

                    if (!output[layerLabel]) {
                        output[layerLabel] = {}
                        for (const [imgUrl, canvasLabel] of Object.entries(canvasMap)) {
                            output[layerLabel][imgUrl] = { label: canvasLabel, lines: [] }
                        }
                    }

                    const lines = await Promise.all(
                        annoPage.items.map(async (anno) => {
                            let selectorValue = anno?.target?.selector?.value || anno?.target?.id || anno?.target
                            const [x, y, w, h] = selectorValue.split(':')[1].split(',').map(Number)
                            return { x, y, w, h, text: anno.body?.value ?? '' }
                        })
                    )
                    output[layerLabel][imgUrl].lines = lines
                }
            }

            for (const layerLabel of Object.keys(output)) {
                const canvases = Object.values(output[layerLabel])
                const maxLen = Math.max(...canvases.map(c => c.lines.length))

                const connectPages = []
                for (let i = 0; i < maxLen; i++) {
                    for (const canvas of canvases) {
                        if (canvas.lines[i]) connectPages.push({ ...canvas.lines[i], fromCanvas: canvas.label })
                    }
                }

                for (const canvas of canvases) {
                    canvas.lines = connectPages.filter(line => line.fromCanvas === canvas.label).map(({ fromCanvas, ...line }) => line)
                }
            }

            this.layers = output
            const layerSelect = this.shadowRoot.getElementById("layerSelect")
            Object.keys(this.layers).forEach(layerName => {
                const option = document.createElement("option")
                option.value = layerName
                option.textContent = layerName
                layerSelect.appendChild(option)
            })

            if (Object.keys(this.layers).length > 0) {
                this.currentLayer = Object.keys(this.layers)[0]
                layerSelect.value = this.currentLayer
                this.populateCanvasDropdown()
                if (this.pages.length > 0) this.openPage(0)
            }
        } catch (err) {
            console.error("Failed to load or parse manifest:", err)
            this.shadowRoot.querySelector(".transcribe-title").textContent = "Error loading manifest"
            return
        }
    }

    populateCanvasDropdown() {
        const canvasSelect = this.shadowRoot.getElementById("canvasSelect")
        canvasSelect.innerHTML = ""
        this.pages = Object.keys(this.layers[this.currentLayer] || {})
        this.pages.forEach(url => {
            const option = document.createElement("option")
            option.value = url
            option.textContent = this.layers[this.currentLayer][url].label
            canvasSelect.appendChild(option)
        })
        if (this.pages.length > 0) canvasSelect.value = this.pages[0]
    }

    updateTranscribedTextXYWH(transcriptionLines = []) {
        const container = this.shadowRoot.querySelector(".transcribed-text")
        if (!container || !this.viewer) return

        container.innerHTML = ""

        if (transcriptionLines.length === 0) {
            container.textContent = "No transcription available for this page."
            return
        }

        transcriptionLines.sort((a, b) => a.y - b.y)
        transcriptionLines.forEach((line, index) => {
            const p = document.createElement("p")
            p.textContent = `${index + 1}. ${line.text || "No Text Available"}`
            p.addEventListener("click", () => {
                this.shadowRoot.querySelectorAll(".annotation-box").forEach(el => {
                    const label = el.querySelector(".annotation-label")
                    if (label && label.textContent === line.text) {
                        label.style.display = "block"
                        label.style.opacity = "1"
                        el.style.boxShadow = "0 0 15px rgba(255,111,61,0.6)"
                        el.style.transform = "scale(1.05)"
                        setTimeout(() => {
                            label.style.display = "none"
                            label.style.opacity = "0"
                            el.style.boxShadow = ""
                            el.style.transform = ""
                        }, 1500)
                    }
                })
            })

            container.appendChild(p)
        })
    }

    openPage(index) {
        if (!this.pages[index]) return console.error("Invalid page index", index)

        this.currentPage = index
        const url = this.pages[index]
        const annotations = this.layers[this.currentLayer][url].lines || []
        this.updateTranscribedTextXYWH(annotations)

        if (!this.viewer) return console.error("OpenSeadragon viewer not initialized")

        const viewerDiv = this.shadowRoot.getElementById("openseadragon")
        this.viewer.open({ type: 'image', url })
        this.viewer.addOnceHandler("open", () => {
            viewerDiv.style.backgroundImage = "none"
            this.viewer.clearOverlays()
            const item = this.viewer.world.getItemAt(0)

            if (annotations.length === 0) {
                const messageEl = document.createElement("div")
                messageEl.className = "transcribe-message"
                messageEl.textContent = "This Page is not transcribed"
                this.viewer.canvas.appendChild(messageEl)
            } else {
                const existingMessage = this.viewer.canvas.querySelector(".transcribe-message")
                if (existingMessage) existingMessage.remove()
                annotations.forEach(a => {
                    const elt = document.createElement("div")
                    elt.className = "annotation-box"
                    elt.innerHTML = `<div class="annotation-label">${a.text}</div>`
                    const rect = item.imageToViewportRectangle(a.x, a.y, a.w, a.h)
                    this.viewer.addOverlay({ element: elt, location: rect })
                })
            }

            const pageNumberEl = this.shadowRoot.getElementById("pageNumber")
            if (pageNumberEl) pageNumberEl.textContent = `Page ${this.currentPage + 1} of ${this.pages.length}`

            const prevBtn = this.shadowRoot.getElementById("prevPage")
            const nextBtn = this.shadowRoot.getElementById("nextPage")
            if (prevBtn) prevBtn.disabled = this.currentPage === 0
            if (nextBtn) nextBtn.disabled = this.currentPage === this.pages.length - 1
        })
    }
}

customElements.define("tpen-read-only-view-transcribe", ReadOnlyViewTranscribe)