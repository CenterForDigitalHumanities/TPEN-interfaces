// import { eventDispatcher } from '../../api/events.js'
// import TPEN from '../../api/TPEN.js'
// import User from '../../api/User.js'

// class BoxyAnnotator extends HTMLElement {
//     static get observedAttributes() {
//         return ['canvas-uri, image-uri']
//     }

//     constructor() {
//         super()
//         this.attachShadow({ mode: 'open' })
//         eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
//     }

//     connectedCallback() {
//         // If we have a good image or a good canvas
//         TPEN.attachAuthentication(this)
//         if(TPEN.currentUser?._id) this.render()
//     }

//     attributeChangedCallback(name, oldValue, newValue) {
//         if (name === 'canvas-uri') {
            
//         }
//         else if (name === 'image-uri'){

//         }
//     }

//     // This component uses Annotorious to draw Annotations and TPEN Services to save Annotations.
//     async render() {
//         this.shadowRoot.innerHTML = `
//         <h4>Boxy Annotator!</h4>

//         `
//     }
// }

// customElements.define('tpen-boxy-annotator', BoxyAnnotator)


const imageContainer = document.getElementById("imageContainer")
const uploadedImage = document.getElementById("uploadedImage")
const drawTool = document.getElementById("drawTool")
const eraseTool = document.getElementById("eraseTool")
let isDrawing = false
let startX = 0
let startY = 0
let currentRectangle

imageContainer.addEventListener("mousedown", switchOperation) 
imageContainer.addEventListener("mouseup", endDrawing)

drawTool.addEventListener("change", toggleDrawingMode)
eraseTool.addEventListener("change", toggleEraseMode)

async function loadCanvas(event) {
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
    let image = resolvedCanvas?.items[0]?.items[0]?.body?.id
    if(!image){
        err = new Error("Cannot Resolve Canvas or Image", {"cause":"The Canvas is 404 or unresolvable."})
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

function switchOperation(event) {
    if (eraseTool.checked) {
      handleErase(event)
    } else if (drawTool.checked) {
      startDrawing(event)
    }
}

function startDrawing(event) { 
    isDrawing = true
    const rect = imageContainer.getBoundingClientRect()
    // If the client location is clearly outside the bounds don't be drawing.
    if(event.clientX < rect.x || event.clientX > (rect.x + rect.width)) {
        return
    }
    if(event.clientY < rect.y || event.clientY > (rect.y + rect.height)) {
        return
    }
    startX = ((event.clientX - rect.left) / rect.width) * 100
    startY = ((event.clientY - rect.top) / rect.height) * 100
    currentRectangle = document.createElement("div")
    currentRectangle.classList.add("rectangle") 
    imageContainer.appendChild(currentRectangle) 
    imageContainer.addEventListener("mousemove", drawRectangle)
}

function updateRectangleSize(event) {
    if (!currentRectangle) return
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
    const width = currentX - startX
    const height = currentY - startY
    currentRectangle.style.width = Math.abs(width) + "%"
    currentRectangle.style.height = Math.abs(height) + "%"
    currentRectangle.style.left = (width >= 0 ? startX : startX + width) + "%"
    currentRectangle.style.top = (height >= 0 ? startY : startY + height) + "%"
    console.log("SIZES")
}

function drawRectangle(event) {
    if (!isDrawing || !drawTool.checked) return
    updateRectangleSize(event)
}

function endDrawing() {
    if (!currentRectangle) return
    isDrawing = false
    currentRectangle.classList.add("drawn-shape")
    generateAnnotationFromShape(currentRectangle)
}

function toggleDrawingMode() {
    let allRects = document.querySelectorAll(".drawn-shape")
    if (drawTool.checked) {
      eraseTool.checked = false
      allRects.forEach((rect) => {
        rect.classList.remove("delete-bg")
      })
    }
}

function toggleEraseMode() {
    let allRects = document.querySelectorAll(".drawn-shape")
    if (eraseTool.checked) {
      drawTool.checked = false
      allRects.forEach((rect) => {
        rect.classList.add("delete-bg")
      })
    }
}

function handleErase(event) {
    if (!eraseTool.checked) return
    const target = event.target
    if (target.classList.contains("rectangle")) {
      imageContainer.removeChild(target)
      deleteRectangle(target.dataset.id)
    }
}

function deleteRectangle(id) {
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
       console.log('Rectangle deleted successfully');
     }
   })
   .catch(error => {
     console.error('Error:', error);
   });
 }

 function generateAnnotationFromShape(shapeElem) {
    let err
    if(!shapeElem){
        err = new Error("No shape to generate fragment selector annotation", {"cause":"The shape does not exist."})
        throw err
    }
    const x = (parseFloat(shapeElem.style.left) / 100) * imageCanvas.width
    const y = (parseFloat(shapeElem.style.top) / 100) * imageCanvas.height
    const w = (parseFloat(shapeElem.style.width) / 100) * imageCanvas.width
    const h = (parseFloat(shapeElem.style.height) / 100) * imageCanvas.height
    const selector = `#xywh=${x},${y},${w},${h}`
    const target = imageCanvas.getAttribute("canvas") + selector

    let anno = {
        "@context": "http://www.w3.org/ns/anno.jsonld"
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
