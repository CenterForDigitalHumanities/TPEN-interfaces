import { eventDispatcher } from '../../api/events.js'
import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class BoxyAnnotator extends HTMLElement {
    #isDrawing = false
    #currentRectangle
    #startX
    #startY
    #creatorURI
    #knownAnnotationPage
    static get observedAttributes() {
        return ['annotationpage']
    }

    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        if(!this.#creatorURI) {
          let tpenUserProfile = await User.fromToken(this.userToken).getProfile()
          this.#creatorURI = tpenUserProfile.agent.replace("http://", "https://")
        }
        this.#isDrawing = false
        this.#knownAnnotationPage = getAnnotationPageFromURL()
        this.render()
        this.setAttribute("annotationpage", this.#knownAnnotationPage)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(newValue === oldValue) return
        if (name === 'annotationpage') {
            this.processAnnotationPage(newValue)
        }
    }

    // This component uses Annotorious to draw Annotations and TPEN Services to save Annotations.
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
            </div>
            <div id="imageContainer" class="image-container" canvas="">
              <img id="uploadedImage" draggable="false" src="" alt="Uploaded Image">
              <canvas id="imageCanvas"> </canvas>
            </div>
        </div>

        `
        this.listen()
    }

    listen() {
        let imageContainer = this.shadowRoot.getElementById("imageContainer")
        let uploadedImage = this.shadowRoot.getElementById("uploadedImage")
        let drawTool = this.shadowRoot.getElementById("drawTool")
        let eraseTool = this.shadowRoot.getElementById("eraseTool")
        let loadButton = this.shadowRoot.getElementById("loadCanvasButton")
        loadButton.addEventListener("click", () => this.loadCanvas())
        imageContainer.addEventListener("mousedown", (ev) => this.switchOperation(ev)) 
        imageContainer.addEventListener("mouseup", () => this.endDrawing())
        drawTool.addEventListener("change", () => this.toggleDrawingMode())
        eraseTool.addEventListener("change", () => this.toggleEraseMode())
    }

    switchOperation(event) {
        let eraseTool = this.shadowRoot.getElementById("eraseTool")
        let drawTool = this.shadowRoot.getElementById("drawTool")
        if (eraseTool.checked) {
          this.handleErase(event)
        } else if (drawTool.checked) {
          this.startDrawing(event)
        }
    }

    startDrawing(event) { 
        this.#isDrawing = true
        let imageContainer = this.shadowRoot.getElementById("imageContainer")
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
        imageContainer.addEventListener("mousemove", (ev) => this.drawRectangle(ev))
    }

    updateRectangleSize(event) {
        if (!this.#currentRectangle) return
        let imageContainer = this.shadowRoot.getElementById("imageContainer")
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
        console.log("SIZES")
    }

    drawRectangle(event) {
        let drawTool = this.shadowRoot.getElementById("drawTool")
        if (!this.#isDrawing || !drawTool.checked) return
        this.updateRectangleSize(event)
    }

    endDrawing() {
        if (!this.#currentRectangle) return
        this.#isDrawing = false
        this.#currentRectangle.classList.add("drawn-shape")
        this.generateAnnotationFromShape(this.#currentRectangle)
    }

    toggleDrawingMode() {
        let allRects = this.shadowRoot.querySelectorAll(".drawn-shape")
        let drawTool = this.shadowRoot.getElementById("drawTool")
        let eraseTool = this.shadowRoot.getElementById("eraseTool")
        if (drawTool.checked) {
          eraseTool.checked = false
          allRects.forEach((rect) => {
            rect.classList.remove("delete-bg")
          })
        }
    }

    toggleEraseMode() {
        let drawTool = this.shadowRoot.getElementById("drawTool")
        let eraseTool = this.shadowRoot.getElementById("eraseTool")
        let allRects = document.querySelectorAll(".drawn-shape")
        if (eraseTool.checked) {
          drawTool.checked = false
          allRects.forEach((rect) => {
            rect.classList.add("delete-bg")
          })
        }
    }

    handleErase(event) {
        let drawTool = this.shadowRoot.getElementById("drawTool")
        let imageContainer = this.shadowRoot.getElementById("imageContainer")
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

        let anno = {
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

        console.log("Annotation Generated")
        console.log(anno)
     }

     async processAnnotationPage(page) {
      if(!page) return
      let resolvedPage = await fetch(canvas)
        .then(r => {
            if(!r.ok) throw r
            return r.json()
        })
        .catch(e => {
            throw e
        })
      const context = resolvedPage["@context"]
      if(!(context.includes("iiif.io/api/presentation/3/context.json") || context.includes("w3.org/ns/anno.jsonld"))) {
        console.warn("The AnnotationPage object did not have the IIIF Presentation API 3 context and may not be parseable.")
      }
      const id = resolvedPage["@id"] ?? resolvedPage.id
      if(!id) {
          err = new Error("Cannot Resolve AnnotationPage", {"cause":"The AnnotationPage is 404 or unresolvable."})
          throw err
      }
      const type = resolvedPage["@type"] ?? resolvedPage.type
      if(type !== "AnnotationPage"){
          err = new Error(`Provided URI did not resolve an 'AnnotationPage'.  It resolved a '${type}'`, {"cause":"URI must point to an AnnotationPage."})
          throw err
      }
      let targetCanvas = resolvedPage.target
      if(!targetCanvas) {
        err = new Error(`The AnnotationPage object did not have a target Canvas.  There is no image to load.`, {"cause":"AnnotationPage.target must have a value."})
        throw err
      }
      // Note this will process the id from embedded Canvas objects to pass forward and be resolved.
      const canvasURI = this.processPageTarget(targetCanvas)
      this.loadCanvas(canvasURI)

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
      let err
      if(Array.isArray(pageTarget)){
        err = new Error(`The AnnotationPage object has multiple targets.  We cannot process this yet, and nothing will load.`, {"cause":"AnnotationPage.target is an Array."})
        throw err
      }
      else if(typeof pageTarget === "object") {
        try{
          JSON.parse(JSON.stringify(target))
        }
        catch(err){
          err = new Error(`The AnnotationPage target is not processable.`, {"cause":"AnnotationPage.target"})
          throw err
        }
        const tcid = pageTarget["@id"] ?? pageTarget.id
        if(!tcid) {
          err = new Error(`The target of the AnnotationPage does not contain an id.  This Canvas cannot be loaded, and so there is no image to load.`, {"cause":"AnnotationPage.target must be a Canvas and must have an id."})
          throw err
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
        console.warn("AnnotationPage.target string is not a URI")
        err = new Error(`AnnotationPage.target string is not a URI`, {"cause":"AnnotationPage.target string must be a URI."})
        throw err
      }
      return canvasURI
    }

    getAnnotationPageFromURL() {
        const urlParams = new URLSearchParams(window.location.search)
        const page = urlParams.get("page")
        if (!page) {
            alert("You must provide a ?page= in the URL.  The value should be the URI of an existing AnnotationPage.")
            return
        }
        return page
    }

    async loadCanvas(canvas) {
        let imageCanvas = this.shadowRoot.getElementById("imageCanvas")
        let uploadedImage = this.shadowRoot.getElementById("uploadedImage")
        const ctx = imageCanvas.getContext("2d")
        let err
        if(!canvas) return
        const resolvedCanvas = await fetch(canvas)
            .then(r => {
                if(!r.ok) throw r
                return r.json()
            })
            .catch(e => {
                throw e
            })
        const id = resolvedCanvas["@id"] ?? resolvedCanvas.id
        if(!id) {
            err = new Error("Cannot Resolve Canvas or Image", {"cause":"The Canvas is 404 or unresolvable."})
            throw err
        }
        const type = resolvedCanvas["@type"] ?? resolvedCanvas.type
        if(type !== "Canvas"){
            err = new Error(`Provided URI did not resolve a 'Canvas'.  It resolved a '${type}'`, {"cause":"URI must point to a Canvas."})
            throw err
        }
        let image = resolvedCanvas?.items[0]?.items[0]?.body?.id
        if(!image){
            err = new Error("Cannot Resolve Canvas or Image", {"cause":"The Image is 404 or unresolvable."})
            throw err
        }
        if(!image.includes("default.jpg")) {
            const lastchar = image[image.length-1]
            if(lastchar !== "/") image += "/"
            image += "full/max/0/default.jpg"
        }
        imageCanvas.setAttribute("canvas", canvas)
        uploadedImage.addEventListener("load", (e) => {
            // Note the CSS capping height/width to 96vh/vw
            let h = uploadedImage.height
            let w = uploadedImage.width
            imageCanvas.setAttribute("height", h)
            imageCanvas.setAttribute("width", w)
            ctx.drawImage(uploadedImage, 0, 0)
        })
        uploadedImage.setAttribute("src", image)
    }
}

customElements.define('tpen-custom-annotator', BoxyAnnotator)
