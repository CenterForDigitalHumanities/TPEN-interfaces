/**
 * A plain TPEN Annotator that can draw Rectangles.
 * This is legacy code that was componentized and brought forward.  It was meant to be a simple annotator POC.
 * We are using Annotorious for this now instead.  However, it is likely we will run into a 'parsing interface'
 * for which we will need a completely custom annotator.
 *
 * It is exposed to the user through /interfaces/annotator/legacy.html
 * @element tpen-legacy-annotator
 *
 * @deprecated in favor of tpen-plain-annotator.
 */

import { eventDispatcher } from '../../api/events.js'
import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'
import vault from '../../js/vault.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

class LegacyAnnotator extends HTMLElement {
    #isDrawing = false
    #currentRectangle
    #startX
    #startY
    #creatorURI
    #knownAnnotationPage
    #mouseMoveHandler = null

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    static get observedAttributes() {
        return ['annotationpage']
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.render()
        this.addEventListeners()
        this.initialize()
    }

    /**
     * Initializes the annotator with user profile and annotation page.
     */
    async initialize() {
        if(!this.#creatorURI) {
          const tpenUserProfile = await User.fromToken(this.userToken).getProfile()
          this.#creatorURI = tpenUserProfile.agent.replace("http://", "https://")
        }
        this.#isDrawing = false
        this.#knownAnnotationPage = TPEN.screen.pageInQuery
        if (!this.#knownAnnotationPage) {
            alert("You must provide a ?pageID= in the URL.  The value should be the URI of an existing AnnotationPage.")
            return
        }
        this.setAttribute("annotationpage", this.#knownAnnotationPage)
    }

    disconnectedCallback() {
        // Clean up mousemove handler if still attached (user was mid-drawing)
        if (this.#mouseMoveHandler) {
            const imageContainer = this.shadowRoot.getElementById("imageContainer")
            imageContainer?.removeEventListener("mousemove", this.#mouseMoveHandler)
            this.#mouseMoveHandler = null
        }
        this.cleanup.run()
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            #uploadedImage {
              display: none;
            }

            #imageContainer {
              position: relative;
              display: block;
              height:  auto;
              width:  fit-content;
            }

            #imageCanvas {
              max-height: 96vh;
              max-width: 96vw;
            }

            .rectangle, .drawn-shape {
              position: absolute;
              border: 2px solid grey;
              background: rgba(255, 255, 0, 0.3);
              transition: background-color 0.2s;
            }

            .delete-bg:hover {
              background: rgba(255, 0, 0, 0.3);
            }

            .delete-bg:hover:after {
              content: "🗑";
              cursor: pointer;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 100;
              height: 100%;
              width: 100%;
            }

            .drawn-shape {
              border: 2px solid black;
              background-color: transparent;
            }
        </style>
        <div class="container">
            <div class="tools-container">
              <label for="drawTool">Drawing Tool:
               <input  type="checkbox" id="drawTool">
              </label>
              <label>
               <input type="checkbox" id="eraseTool"> Shape Eraser
             </label>
             <input id="saveButton" type="button" value="Save" />
            </div>
            <div id="imageContainer" class="image-container" canvas="">
              <img id="uploadedImage" draggable="false" src="" alt="Uploaded Image">
              <canvas id="imageCanvas"> </canvas>
            </div>
        </div>
        `
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(newValue === oldValue) return
        if (name === 'annotationpage') {
            this.processAnnotationPage(newValue)
        }
    }

    addEventListeners() {
        const imageContainer = this.shadowRoot.getElementById("imageContainer")
        const drawTool = this.shadowRoot.getElementById("drawTool")
        const eraseTool = this.shadowRoot.getElementById("eraseTool")
        const saveButton = this.shadowRoot.getElementById("saveButton")

        this.cleanup.onElement(saveButton, "click", () => this.saveAnnotations())
        this.cleanup.onElement(imageContainer, "mousedown", (ev) => this.switchOperation(ev))
        this.cleanup.onElement(imageContainer, "mouseup", () => this.endDrawing())
        this.cleanup.onElement(drawTool, "change", () => this.toggleDrawingMode())
        this.cleanup.onElement(eraseTool, "change", () => this.toggleEraseMode())
    }

    switchOperation(event) {
        const eraseTool = this.shadowRoot.getElementById("eraseTool")
        const drawTool = this.shadowRoot.getElementById("drawTool")
        if (eraseTool.checked) {
          this.handleErase(event)
        } else if (drawTool.checked) {
          this.startDrawing(event)
        }
    }

    startDrawing(event) {
        this.#isDrawing = true
        const imageContainer = this.shadowRoot.getElementById("imageContainer")
        const rect = imageContainer.getBoundingClientRect()
        // If the client location is clearly outside the bounds don't be drawing.
        if(event.clientX < rect.x || event.clientX > (rect.x + rect.width)) {
            return
        }
        if(event.clientY < rect.y || event.clientY > (rect.y + rect.height)) {
            return
        }
        this.#startX = ((event.clientX - rect.left) / rect.width) * 100
        this.#startY = ((event.clientY - rect.top) / rect.height) * 100
        this.#currentRectangle = document.createElement("div")
        this.#currentRectangle.classList.add("rectangle")
        imageContainer.appendChild(this.#currentRectangle)
        // Store handler reference for cleanup
        this.#mouseMoveHandler = (ev) => this.drawRectangle(ev)
        imageContainer.addEventListener("mousemove", this.#mouseMoveHandler)
    }

    updateRectangleSize(event) {
        if (!this.#currentRectangle) return
        const imageContainer = this.shadowRoot.getElementById("imageContainer")
        const rect = imageContainer.getBoundingClientRect()

        // If the client location is clearly outside the bounds don't be drawing.
        if(event.clientX < rect.x || event.clientX > (rect.x + rect.width)) {
            return
        }
        if(event.clientY < rect.y || event.clientY > (rect.y + rect.height)) {
            return
        }
        const currentX = ((event.clientX - rect.left) / rect.width) * 100
        const currentY = ((event.clientY - rect.top) / rect.height) * 100
        const width = currentX - this.#startX
        const height = currentY - this.#startY
        this.#currentRectangle.style.width = Math.abs(width) + "%"
        this.#currentRectangle.style.height = Math.abs(height) + "%"
        this.#currentRectangle.style.left = (width >= 0 ? this.#startX : this.#startX + width) + "%"
        this.#currentRectangle.style.top = (height >= 0 ? this.#startY : this.#startY + height) + "%"
    }

    drawRectangle(event) {
        const drawTool = this.shadowRoot.getElementById("drawTool")
        if (!this.#isDrawing || !drawTool.checked) return
        this.updateRectangleSize(event)
    }

    endDrawing() {
        if (!this.#currentRectangle) return
        this.#isDrawing = false
        // Remove the mousemove handler to prevent memory leaks
        if (this.#mouseMoveHandler) {
            const imageContainer = this.shadowRoot.getElementById("imageContainer")
            imageContainer?.removeEventListener("mousemove", this.#mouseMoveHandler)
            this.#mouseMoveHandler = null
        }
        this.#currentRectangle.classList.add("drawn-shape")
        this.generateAnnotationFromShape(this.#currentRectangle)
    }

    toggleDrawingMode() {
        let allRects = this.shadowRoot.querySelectorAll(".drawn-shape")
        const drawTool = this.shadowRoot.getElementById("drawTool")
        const eraseTool = this.shadowRoot.getElementById("eraseTool")
        if (drawTool.checked) {
            eraseTool.checked = false
            allRects.forEach((rect) => {
                rect.classList.remove("delete-bg")
            })
        }
    }

    toggleEraseMode() {
        const drawTool = this.shadowRoot.getElementById("drawTool")
        const eraseTool = this.shadowRoot.getElementById("eraseTool")
        let allRects = document.querySelectorAll(".drawn-shape")
        if (eraseTool.checked) {
          drawTool.checked = false
          allRects.forEach((rect) => {
            rect.classList.add("delete-bg")
          })
        }
    }

    handleErase(event) {
        const drawTool = this.shadowRoot.getElementById("drawTool")
        const imageContainer = this.shadowRoot.getElementById("imageContainer")
        if (!eraseTool.checked) return
        const target = event.target
        if (target.classList.contains("rectangle")) {
          imageContainer.removeChild(target)
          this.deleteRectangle(target.dataset.id)
        }
    }

    deleteRectangle(id) {
        fetch('/rectangle', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        })
       .then(response => response.json())
       .then(data => {
            if (data.success) {
                console.log('Rectangle deleted successfully')
            }
       })
       .catch(error => {
            console.error('Error:', error)
       })
     }
    
    generateAnnotationFromShape(shapeElem) {
        let err
        if(!shapeElem){
            err = new Error("No shape to generate fragment selector annotation", {"cause":"The shape does not exist."})
            throw err
        }
        const imageCanvas = this.shadowRoot.getElementById("imageCanvas")
        const x = (parseFloat(shapeElem.style.left) / 100) * imageCanvas.width
        const y = (parseFloat(shapeElem.style.top) / 100) * imageCanvas.height
        const w = (parseFloat(shapeElem.style.width) / 100) * imageCanvas.width
        const h = (parseFloat(shapeElem.style.height) / 100) * imageCanvas.height
        const selector = `#xywh=${x},${y},${w},${h}`
        const target = imageCanvas.getAttribute("canvas") + selector

        const anno = {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            "type": "Annotation",
            "motivation": "transcribing",
            "body": {
                "type": "TextualBody",
                "value": "",
                "format": "text/plain",
                "language": "none"
            },
            "target": target,
            "creator": "bry-dun"
        }
        return anno
     }

    async processAnnotationPage(page) {
        if(!page) return
        let resolvedPage = await vault.get(page, 'annotationpage')
        if (!resolvedPage && TPEN.activeProject?.manifest) {
            await vault.prefetchManifests(TPEN.activeProject.manifest)
            resolvedPage = await vault.get(page, 'annotationpage')
        }
        if (!resolvedPage) {
            throw new Error("Cannot Resolve AnnotationPage", {cause: "The AnnotationPage is 404 or unresolvable."})
        }
        const context = resolvedPage["@context"]
        if(!(context.includes("iiif.io/api/presentation/3/context.json") || context.includes("w3.org/ns/anno.jsonld"))){
            console.warn("The AnnotationPage object did not have the IIIF Presentation API 3 context and may not be parseable.")
        }
        const id = resolvedPage["@id"] ?? resolvedPage.id
        if(!id) {
            throw new Error("Cannot Resolve AnnotationPage",
             {"cause":"The AnnotationPage is 404 or unresolvable."})
        }
        const type = resolvedPage["@type"] ?? resolvedPage.type
        if(type !== "AnnotationPage"){
            throw new Error(`Provided URI did not resolve an 'AnnotationPage'.  It resolved a '${type}'`,
             {"cause":"URI must point to an AnnotationPage."})
        }
        const targetCanvas = resolvedPage.target
        if(!targetCanvas) {
            throw new Error(`The AnnotationPage object did not have a target Canvas.  There is no image to load.`,
             {"cause":"AnnotationPage.target must have a value."})
        }
        // Note this will process the id from embedded Canvas objects to pass forward and be resolved.
        const canvasURI = this.processPageTarget(targetCanvas)
        this.loadCanvas(canvasURI)
        // Note this does not load and draw the existing Annotations.  That functionality was not present at the time of componentizing.
    }

    /**
     * Process the string URI from an AnnotationPage.target value.  This means an Array, a JSON Object, or a String URI already.
     * Process it if possible.  Attempt to determine a single Canvas URI.
     *
     * @param pageTarget an Array, a JSON Object, or a String URI value from some AnnotationPage.target
     * @return The URI from the input pageTarget
    */ 
    processPageTarget(pageTarget) {
      let canvasURI
      if(Array.isArray(pageTarget)){
        throw new Error(`The AnnotationPage object has multiple targets.  We cannot process this yet, and nothing will load.`,
          {"cause":"AnnotationPage.target is an Array."})
      }
      else if(typeof pageTarget === "object") {
        try{
          JSON.parse(JSON.stringify(target))
        }
        catch(err){
          throw new Error(`The AnnotationPage target is not processable.`, 
            {"cause":"AnnotationPage.target is not JSON."})
        }
        const tcid = pageTarget["@id"] ?? pageTarget.id
        if(!tcid) {
          throw new Error(`The target of the AnnotationPage does not contain an id.  This Canvas cannot be loaded, and so there is no image to load.`,
            {"cause":"AnnotationPage.target must be a Canvas and must have an id."})
        }
        // For now we don't trust the embedded Canvas and are going to take the id forward to resolve.
        canvasURI = tcid
      }
      else if (typeof pageTarget === "string") {
        // Just use it then
        canvasURI = pageTarget
      }

      let uricheck
      try {
        uricheck = new URL(canvasURI)
      } 
      catch (_) {}
      if(!(uricheck?.protocol === "http:" || uricheck?.protocol === "https:")){
        throw new Error(`AnnotationPage.target string is not a URI`, 
          {"cause":"AnnotationPage.target string must be a URI."})
      }
      return canvasURI
    }

    async loadCanvas(canvas) {
        const imageCanvas = this.shadowRoot.getElementById("imageCanvas")
        const uploadedImage = this.shadowRoot.getElementById("uploadedImage")
        const ctx = imageCanvas.getContext("2d")
        let err
        if(!canvas) return
        let resolvedCanvas = await vault.get(canvas, 'canvas')
        if (!resolvedCanvas && TPEN.activeProject?.manifest) {
            // Try to hydrate from all manifests
            await vault.prefetchManifests(TPEN.activeProject.manifest)
            // After manifests are cached, try again
            resolvedCanvas = await vault.get(canvas, 'canvas')
        }
        if (!resolvedCanvas) {
            throw new Error("Canvas Error", {cause: "The Canvas could not be resolved"})
        }
        const context = resolvedCanvas["@context"]
        if(!context.includes("iiif.io/api/presentation/3/context.json")){
            console.warn("The Canvas object did not have the IIIF Presentation API 3 context and may not be parseable.")
        }
        const id = resolvedCanvas["@id"] ?? resolvedCanvas.id
        if(!id) {
            throw new Error("Cannot Resolve Canvas or Image",
             {"cause":"The Canvas is 404 or unresolvable."})
        }
        const type = resolvedCanvas["@type"] ?? resolvedCanvas.type
        if(type !== "Canvas"){
           throw new Error(`Provided URI did not resolve a 'Canvas'.  It resolved a '${type}'`, 
            {"cause":"URI must point to a Canvas."})
        }
        let image = resolvedCanvas?.items[0]?.items[0]?.body?.id
        if(!image){
            throw new Error("Cannot Resolve Canvas or Image", 
             {"cause":"The Image is 404 or unresolvable."})
        }
        if(!image.includes("default.jpg")) {
            const lastchar = image[image.length-1]
            if(lastchar !== "/") image += "/"
            image += "full/max/0/default.jpg"
        }
        imageCanvas.setAttribute("canvas", canvas)
        uploadedImage.addEventListener("load", (e) => {
            let h = uploadedImage.height
            let w = uploadedImage.width
            imageCanvas.setAttribute("height", h)
            imageCanvas.setAttribute("width", w)
            ctx.drawImage(uploadedImage, 0, 0)
        })
        uploadedImage.setAttribute("src", image)
    }

    /**
      * This page renders because of a known AnnotationPage.  Existing Annotations in that AnnotationPage were drawn.
      * There have been edits to the Annotations and those edits need to be saved.
      * TODO hand these off to be saved through TPEN Services.
    */
    async saveAnnotations() {
      const allAnnotations = Array.from(this.shadowRoot.querySelectorAll(".drawn-shape")).map(shape => {
        return this.generateAnnotationFromShape(shape)
      })
      console.log("Save these Annotations")
      console.log(allAnnotations)
    }
}

customElements.define('tpen-legacy-annotator', LegacyAnnotator)
