import { checkIfUrlExists } from '../../utilities/checkIfUrlExists.js'

class ReadOnlyViewTranscribe extends HTMLElement {
    #osd 
    #annotoriousInstance
    #annotationPageID
    #resolvedAnnotationPage
    #staticManifest
    #imageDims
    #canvasDims
    #currentPage
    _currentCanvas

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.layers = {}
        this.pages = []
        this.currentLayer = null
        this.#currentPage = 0
        this.currentCanvas = 0
    }

    get currentPage() { 
        return this.#currentPage
    }

    set currentPage(index) { 
        if (index < 0) index = 0
        if (index >= this.pages.length) index = this.pages.length - 1
        this.#currentPage = index
    }

    async connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                @import "../../components/annotorious-annotator/AnnotoriousOSD.min.css";
                :host {
                    display: block;
                    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
                    color: #222;
                }

                .transcribe-container {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 12px 18px;
                    border-bottom: 1px solid #eee;
                    background: #fafafa;
                }

                .transcribe-title {
                    font-size: 20px;
                    font-weight: 700;
                    margin: 0;
                    color: #111;
                }

                .layer-container {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-left: auto;
                }

                select {
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    font-size: 14px;
                    background: #fff;
                    cursor: pointer;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                select:hover {
                    border-color: #aaa;
                }
                
                select:focus {
                    outline: none;
                    border-color: var(--primary-color, #ff6f3d);
                    box-shadow: 0 0 0 2px rgba(255, 111, 61, 0.25);
                }

                .main {
                    display: flex;
                    gap: 18px;
                    padding: 10px 18px;
                }

                #annotator-container {
                    width: 70%;
                    height: 80vh;
                    background-image: url(https://t-pen.org/TPEN/images/loading2.gif);
                    background-repeat: no-repeat;
                    background-position: center;
                    position: relative;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    overflow: hidden;
                }

                .transcribed-text {
                    width: 30%;
                    height: 80vh;
                    overflow: auto;
                    padding: 12px;
                    box-sizing: border-box;
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid #ddd;
                    border-radius: 6px;
                }

                .annotation-box {
                    position: relative;
                    margin: 6px 0;
                    padding: 10px;
                    border-radius: 6px;
                    border: 1px solid #ff6f3d;
                    cursor: pointer;
                    transition: box-shadow 0.2s, transform 0.2s;
                }
                .annotation-box:hover {
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
                    transform: translateY(-1px);
                }

                .annotation-label {
                    font-weight: 600;
                    font-size: 14px;
                    color: #111;
                }

                .page-controls {
                    text-align: center;
                    padding: 10px 18px;
                }

                .page-controls button {
                    padding: 8px 14px;
                    margin: 0 6px;
                    border-radius: 6px;
                    border: none;
                    background: var(--primary-color, #ff6f3d);
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.2s, transform 0.2s;
                }
                .page-controls button:hover:not(:disabled) {
                    background: #e85d2d;
                    transform: translateY(-1px);
                }
                .page-controls button:disabled {
                    background: #ccc;
                    cursor: default;
                    transform: none;
                }

                .hidden {
                    display: none;
                }
            </style>
            <div class="transcribe-container">
                <h2 class="transcribe-title"></h2>
                <div class="layer-container">
                <label for="layerSelect">Layer</label>
                <select id="layerSelect"><option value="">Loading layers</option></select>
                <label for="canvasSelect">Canvas</label>
                <select id="canvasSelect"><option value="">Loading canvases</option></select>
                </div>
            </div>
            <div class="main">
                <div id="annotator-container"></div>
                <div class="transcribed-text"></div>
            </div>
            <div class="page-controls">
                <button id="prevPage">Previous Page</button>
                <span id="pageNumber"></span>
                <button id="nextPage">Next Page</button>
            </div>
        `

        this.shadowRoot.getElementById("nextPage").addEventListener("click", () => this.openPage(this.currentPage + 1))
        this.shadowRoot.getElementById("prevPage").addEventListener("click", () => this.openPage(this.currentPage - 1))

        this.shadowRoot.getElementById("layerSelect").addEventListener("change", (e) => {
            this.currentLayer = e.target.value
            this.populateCanvasDropdown()
            if (this.pages.length > 0) this.openPage(0)
        })

        this.shadowRoot.getElementById("canvasSelect").addEventListener("change", (e) => {
            const canvasIndex = this.pages.indexOf(e.target.value)
            if (canvasIndex !== -1) this.openPage(canvasIndex)
        })

        await this.loadAnnotations()
        await this.loadExternalScripts()

        setTimeout(() => {
            if (this.pages.length > 0) {
                const currentCanvasUrl = this.layers[this.currentLayer][this.pages[this.currentPage]]?.id ?? ''
                this.#annotationPageID = currentCanvasUrl.split('/').pop() ?? ''
            }
            setTimeout(() => { this.processPage(this.#annotationPageID) }, 200)
        }, 200)
    }

    async loadExternalScripts() {
        if (!window.OpenSeadragon) {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script")
                s.src = "../../components/annotorious-annotator/OSD.min.js"
                s.onload = resolve
                s.onerror = reject
                document.head.appendChild(s)
            })
        }

        if (!window.AnnotoriousOSD) {
            await new Promise((resolve, reject) => {
                const s = document.createElement("script")
                s.src = "../../components/annotorious-annotator/AnnotoriousOSD.min.js"
                s.onload = resolve
                s.onerror = reject
                document.head.appendChild(s)
            })
        }
    }

    async loadAnnotations() {
        const staticUrl = "https://dev.static.t-pen.org"
        const output = {}
        const canvasMap = {}
        const projectID = new URLSearchParams(window.location.search).get('projectID')
        const manifestUrl = `${staticUrl}/${projectID}/manifest.json`

        if (!await checkIfUrlExists(manifestUrl)) {
            this.shadowRoot.querySelector(".transcribe-title").textContent = "Transcription not available yet. Please check back later."
            this.shadowRoot.getElementById("annotator-container").classList.add("hidden")
            this.shadowRoot.querySelector(".transcribed-text").classList.add("hidden")
            this.shadowRoot.querySelector(".page-controls").classList.add("hidden")
            this.shadowRoot.querySelector(".layer-container").classList.add("hidden")
            return
        }
        
        const response = await fetch(manifestUrl)
        if (!response.ok) {
            const errText = await response.text()
            throw new Error(`GitHub read failed: ${response.status} - ${errText}`)
        }
        const manifest = await response.json()
        this.#staticManifest = manifest

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
                        output[layerLabel][imgUrl] = { id: '', label: canvasLabel, lines: [] }
                    }
                }

                output[layerLabel][imgUrl] = { id: annoPage.id, label: canvasMap[imgUrl], lines: [] }

                const lines = await Promise.all(
                    annoPage.items.map(async (anno) => {
                        return { text: anno.body?.value ?? '' }
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
    }

    async processPage(pageID) {
        this.currentCanvas = this.shadowRoot.getElementById("canvasSelect").selectedIndex
        
        if (pageID === '') {
            this.#resolvedAnnotationPage = null
            await this.processCanvas(this.#staticManifest?.items?.[this.currentCanvas]?.id)
            return
        }
        
        this.#resolvedAnnotationPage = this.#staticManifest?.items.flatMap(c => c.annotations || []).find(ap => (ap.id ?? ap['@id'] ?? '').endsWith(pageID))
        if (!this.#resolvedAnnotationPage) {
            this.shadowRoot.getElementById('annotator-container').innerHTML = `<h3>Could not find AnnotationPage with ID: ${pageID}</h3>`
            return
        }

        const type = this.#resolvedAnnotationPage["@type"] ?? this.#resolvedAnnotationPage.type
        if (type !== "AnnotationPage") {
            console.warn("Resolved object is not an AnnotationPage:", type)
        }

        const targetCanvas = this.#resolvedAnnotationPage.target
        if (!targetCanvas) {
            this.shadowRoot.getElementById('annotator-container').innerHTML = `<h3>No target Canvas on AnnotationPage</h3>`
            return
        }

        this.shadowRoot.getElementById("annotator-container").style.backgroundImage = "none"

        const canvasURI = this.processPageTarget(targetCanvas)
        await this.processCanvas(canvasURI)
    }

    async processCanvas(uri) {
        if (!uri) return
        let embeddedCanvas = this.#staticManifest?.items.find(c => (c.id ?? c['@id']) === uri)
        let fullImage = embeddedCanvas?.items?.[0]?.items?.[0]?.body?.id
        let imageService = embeddedCanvas?.items?.[0]?.items?.[0]?.body?.service?.id
        let imgx = embeddedCanvas?.items?.[0]?.items?.[0]?.body?.width
        let imgy = embeddedCanvas?.items?.[0]?.items?.[0]?.body?.height
        this.#imageDims = [imgx || 0, imgy || 0]
        this.#canvasDims = [embeddedCanvas?.width || 0, embeddedCanvas?.height || 0]

        let imageInfo = { type: "image", url: fullImage }
        if (imageService) {
            try {
                if (!imageService.endsWith('/')) imageService += '/'
                const info = await fetch(imageService + "info.json").then(resp => {
                    if (!resp.ok) throw new Error('info.json not available')
                    return resp.json()
                })
                if (info) imageInfo = info
            } catch (_) {
                imageInfo = { type: "image", url: fullImage }
            }
        }

        this._currentCanvas = embeddedCanvas

        if (!this.#osd) {
            this.#osd = OpenSeadragon({
                element: this.shadowRoot.getElementById('annotator-container'),
                tileSources: imageInfo,
                prefixUrl: "../../interfaces/annotator/images/",
                showFullPageControl: false,
            })
        } else {
            this.#osd.open(imageInfo)
        }

        const canvasID = embeddedCanvas["@id"] ?? embeddedCanvas.id
        this.#osd.addOnceHandler('open', async () => {
            try {
                await this.loadExternalScripts()
                if (!this.#annotoriousInstance) {
                    this.#annotoriousInstance = AnnotoriousOSD.createOSDAnnotator(this.#osd, {
                        adapter: AnnotoriousOSD.W3CImageFormat(canvasID),
                        style: { fill: "#ff0000", fillOpacity: 0.25 },
                        userSelectAction: "NONE"
                    })
                    this.#annotoriousInstance.setDrawingEnabled(false)
                } else {
                    try {
                        this.#annotoriousInstance.destroy()
                    } catch (_) {}
                    this.#annotoriousInstance = AnnotoriousOSD.createOSDAnnotator(this.#osd, {
                        adapter: AnnotoriousOSD.W3CImageFormat(canvasID),
                        style: { fill: "#ff0000", fillOpacity: 0.25 },
                        userSelectAction: "NONE"
                    })
                    this.#annotoriousInstance.setDrawingEnabled(false)
                }
                this.setInitialAnnotations()
            } catch (err) {
                console.error("Annotorious init error:", err)
            }
        })
    }

    setInitialAnnotations() {
        if (!this.#resolvedAnnotationPage || !this.#annotoriousInstance) {
            this.shadowRoot.getElementById('annotator-container').style.backgroundImage = "none"
            return
        }
        let allAnnotations = JSON.parse(JSON.stringify(this.#resolvedAnnotationPage.items || []))
        allAnnotations = this.formatAnnotations(allAnnotations)
        allAnnotations = this.convertSelectors(allAnnotations, true)
        this.#annotoriousInstance.setAnnotations(allAnnotations, false)
        this.renderRightPanel()
    }

    renderRightPanel() {
        const container = this.shadowRoot.querySelector(".transcribed-text")
        container.innerHTML = ""

        if (!this.layers || !this.currentLayer) {
            container.textContent = "No transcription available."
            return
        }

        const pages = Object.keys(this.layers[this.currentLayer] || {})
        if (pages.length === 0) {
            container.textContent = "No transcription available."
            return
        }

        const canvasUri = pages[this.currentPage] || pages[0]
        const pageObj = this.layers[this.currentLayer][canvasUri]
        const annotations = (pageObj?.lines ?? [])

        if (annotations.length === 0) {
            container.textContent = "No transcription available for this page."
            return
        }

        annotations.sort((a, b) => a.y - b.y)

        annotations.forEach((line, index) => {
            const box = document.createElement("div")
            box.className = "annotation-box"
            box.dataset.selector = [line.x, line.y, line.w, line.h].join(",")
            box.innerHTML = `
                <div class="annotation-label">${index + 1}. ${line.text || "No Text Available"}</div>
            `
            container.appendChild(box)
        })
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
        if (this.pages.length > 0) canvasSelect.value = this.pages[this.currentPage] ?? this.pages[0]
    }

    openPage(index) {
        if (!this.pages[index]) return console.error("Invalid page index", index)
        this.#currentPage = index
        const canvasSelect = this.shadowRoot.getElementById("canvasSelect")
        canvasSelect.value = this.pages[this.currentPage]
        const currentCanvasUrl = this.layers[this.currentLayer][this.pages[this.currentPage]]?.id ?? ''
        this.#annotationPageID = currentCanvasUrl.split('/').pop() ?? ''
        this.processPage(this.#annotationPageID)
        this.renderRightPanel()
        const pageNumberEl = this.shadowRoot.getElementById("pageNumber")
        if (pageNumberEl) pageNumberEl.textContent = `Page ${this.currentPage + 1} of ${this.pages.length}`
        const prevBtn = this.shadowRoot.getElementById("prevPage")
        const nextBtn = this.shadowRoot.getElementById("nextPage")
        if (prevBtn) prevBtn.disabled = this.currentPage === 0
        if (nextBtn) nextBtn.disabled = this.currentPage === this.pages.length - 1
    }

    formatAnnotations(annotations) {
        if (!annotations || annotations.length === 0) return annotations
        return annotations.map(annotation => {
            if (!annotation.hasOwnProperty("target") || !annotation.hasOwnProperty("body")) return annotation
            if (typeof annotation.target === "string") {
                const tarsel = annotation.target.split("#")
                if (tarsel && tarsel.length === 2) {
                    if (!tarsel[1].includes("pixel:")) tarsel[1] = tarsel[1].replace("xywh=", "xywh=pixel:")
                        annotation.target = {
                            source: tarsel[0],
                            selector: {
                            conformsTo: "http://www.w3.org/TR/media-frags/",
                            type: "FragmentSelector",
                            value: tarsel[1]
                        }
                    }
                }
            }
            if (!Array.isArray(annotation.body)) {
                if (typeof annotation.body === "object") {
                    annotation.body = (Object.keys(annotation.body).length > 0) ? [annotation.body] : []
                } else {
                    annotation.body = [annotation.body]
                }
            }
            annotation.motivation ??= "transcribing"
            return annotation
        })
    }

    convertSelectors(annotations, bool = false) {
        if (this.#imageDims[0] === this.#canvasDims[0] && this.#imageDims[1] === this.#canvasDims[1]) return annotations
        if (!annotations || annotations.length === 0) return annotations
        return annotations.map(annotation => {
            if (!annotation.target || !annotation.target.selector || !annotation.target.selector.value) return annotation
            const orig = annotation.target.selector.value.replace("xywh=pixel:", "").split(",").map(parseFloat)
            let converted = [0, 0, 0, 0]
            if (bool) {
                converted[0] = (this.#imageDims[0] / this.#canvasDims[0]) * orig[0]
                converted[1] = (this.#imageDims[1] / this.#canvasDims[1]) * orig[1]
                converted[2] = (this.#imageDims[0] / this.#canvasDims[0]) * orig[2]
                converted[3] = (this.#imageDims[1] / this.#canvasDims[1]) * orig[3]
            } else {
                converted[0] = (this.#canvasDims[0] / this.#imageDims[0]) * orig[0]
                converted[1] = (this.#canvasDims[1] / this.#imageDims[1]) * orig[1]
                converted[2] = (this.#canvasDims[0] / this.#imageDims[0]) * orig[2]
                converted[3] = (this.#canvasDims[1] / this.#imageDims[1]) * orig[3]
            }
            annotation.target.selector.value = "xywh=pixel:" + converted.map(v => Number.isFinite(v) ? v : 0).join(",")
            return annotation
        })
    }

    processPageTarget(pageTarget) {
        let canvasURI
        if (Array.isArray(pageTarget)) {
            throw new Error(`The AnnotationPage object has multiple targets.  We cannot process this yet.`)
        }
        if (typeof pageTarget === "object") {
            const tcid = pageTarget["@id"] ?? pageTarget.id ?? pageTarget.source
            if (!tcid) throw new Error(`The target of the AnnotationPage does not contain an id.`)
            canvasURI = tcid
        } else if (typeof pageTarget === "string") {
            canvasURI = pageTarget
        }
        let uricheck
        try { uricheck = new URL(canvasURI) } catch (_) {}
        if (!(uricheck?.protocol === "http:" || uricheck?.protocol === "https:")) {
            throw new Error(`AnnotationPage.target string is not a URI`)
        }
        return canvasURI
    }
}

customElements.define("tpen-read-only-view-transcribe", ReadOnlyViewTranscribe)