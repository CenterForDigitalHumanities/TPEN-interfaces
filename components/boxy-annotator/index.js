import { eventDispatcher } from '../../api/events.js'
import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class BoxyAnnotator extends HTMLElement {
    #isDrawing = false
    #currentRectangle = null
    #startX = null
    #startY = null
    static get observedAttributes() {
        return ['canvas-uri, image-uri']
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        //eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
    }

    connectedCallback() {
        // If we have a good image or a good canvas
        //TPEN.attachAuthentication(this)
        //if(TPEN.currentUser?._id) this.render()
        this.#isDrawing = false
        this.render()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'canvas-uri') {
            
        }
        else if (name === 'image-uri'){

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
            <label>Enter Canvas ID to Annotate</label><input id="canvasURI" type="text" placeholder="IIIF Canvas URI" /><br>
            <input id="loadCanvasButton" type="button" value="Load Canvas" />
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

    async loadCanvas(event) {
        let canvasURI = this.shadowRoot.getElementById("canvasURI")
        let imageCanvas = this.shadowRoot.getElementById("imageCanvas")
        let uploadedImage = this.shadowRoot.getElementById("uploadedImage")
        const canvas = canvasURI.value
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
        
        return {
            "canvasURI" : canvas,
            "imageURI" : image
        }
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
}

customElements.define('tpen-boxy-annotator', BoxyAnnotator)
