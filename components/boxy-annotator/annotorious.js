/**
    * The Annotation generation and UI is powered in part by Annotorious.  The TPEN3 team hereby acknowledges
    * and thanks the Annotorious development team for this open source software.
    * @see https://annotorious.dev/
    * Annotorious licensing information can be found at https://github.com/annotorious/annotorious
*/

import TPEN from '../../api/TPEN.js'

class BoxyAnnotator extends HTMLElement {

    static get observedAttributes() {
        return ["canvas", "image"]
    }

    constructor() {
        super()
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        const osdScript = document.createElement("script")
        osdScript.src = "https://cdn.jsdelivr.net/npm/openseadragon@5.0/build/openseadragon/openseadragon.min.js"
        const annotoriousScript = document.createElement("script")
        annotoriousScript.src = "https://cdn.jsdelivr.net/npm/@annotorious/openseadragon@latest/dist/annotorious-openseadragon.js"

        this.shadowRoot.innerHTML = `
        <style>
          @import url("https://cdn.jsdelivr.net/npm/@annotorious/openseadragon@latest/dist/annotorious-openseadragon.css");
          #annotator-container {
            height:  100vh;
          }
        </style>
        <div>
            <div id="canvasInputContainer">
              <label>Enter Canvas ID to Annotate</label><input id="canvasURI" type="text" placeholder="IIIF Canvas URI" /><br>
              <input id="loadCanvasButton" type="button" value="Load Canvas" />
            </div>
            <div id="annotator-container"></div>
        </div>

        `
        let loadButton = this.shadowRoot.getElementById("loadCanvasButton")
        let inputElem = this.shadowRoot.getElementById("canvasURI")
        loadButton.addEventListener("click", (e) => {
            this.setAttribute("canvas", inputElem.value)
        })
        this.shadowRoot.appendChild(osdScript)
        this.shadowRoot.appendChild(annotoriousScript)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'canvas' && newValue !== oldValue) {
            this.loadCanvas(newValue)
        }
    }

    async render(resolvedCanvas) {
        let canvasID = resolvedCanvas["@id"] ?? resolvedCanvas.id
        let fullImage = resolvedCanvas?.items[0]?.items[0]?.body?.id
        let imageService = resolvedCanvas?.items[0]?.items[0]?.body?.service?.id
        if(!fullImage){
            err = new Error("Cannot Resolve Canvas or Image", {"cause":"The Image is 404 or unresolvable."})
            throw err
        }
        this.setAttribute("image", fullImage)
        let imageInfo = {
          type: "image",
          url: fullImage
        }

        // Try to get the info.json
        if(imageService){
            const lastchar = imageService[imageService.length-1]
            if(lastchar !== "/") imageService += "/"
            imageInfo = await fetch(imageService+"info.json").then(resp => resp.json()).catch(err => { return false })
        }
        
        let viewer = OpenSeadragon({
            element: this.shadowRoot.getElementById('annotator-container'),
            tileSources: imageInfo
        })

      // @see https://annotorious.dev/api-reference/openseadragon-annotator/ for all the available methods of this annotator.
        let annotorious = AnnotoriousOSD.createOSDAnnotator(viewer, {
            adapter: AnnotoriousOSD.W3CImageFormat(canvasID),
            drawingEnabled: true,
            drawingMode: "drag",
            // https://annotorious.dev/api-reference/drawing-style/
            style: {
             fill: "#ff0000",
             fillOpacity: 0.25
            },
            userSelectAction: "EDIT"
            // EXAMPLE: Only allow me to edit my own annotations
            // userSelectAction: (annotation) => {
            //   const isMe = annotation.target.creator?.id === 'aboutgeo';
            //   return isMe ? 'EDIT' : 'SELECT';
            // }

        })
        // anno.setUser({
        //   id: 'aboutgeo',
        //   name: 'Rainer',
        //   avatar: 'https://example.com/lego-saruman.jpg'
        // })
        console.log(TPEN.currentUser)
        console.log(this.currentUser)
        annotorious.setUser(TPEN.currentUser)
        this.listenTo(annotorious)
    }

    /**
        * Listeners on all available Annotorious instance events.  See inline comments for details.
        * Here we can catch events, then do TPEN things with the Annotations from those events.
        * Lifecycle Events API is available at https://annotorious.dev/api-reference/events/
        *
        * @param annotator - An established instance of a AnnotoriousOSD.createOSDAnnotator
    */ 
    listenTo(annotator) {

      // A click event on a drawn Annotation.  The annotation data is known and available as a parameter.
      annotator.on('clickAnnotation', (annotation, originalEvent) => {
        console.log('Annotation clicked: ' + annotation.id);
      })

      // A mouseenter event on a drawn Annotation.  The annotation data is known and available as a parameter.
      annotator.on('mouseEnterAnnotation', (annotation, originalEvent) => {
        console.log('Mouse entered: ' + annotation.id)
      })

      annotator.on('mouseLeaveAnnotation', (annotation, originalEvent) => {
        console.log('Mouse left: ' + annotation.id)
      })

      /**
        * Fired when the set of selected annotation changes. For future compatibility, the argument is an array. 
        * However, only single annotation will be returned currently.
        * When the user de-selects an annotation, the event will be fired with an empty array.
      */
      annotator.on('selectionChanged', (annotations, originalEvent) => {
        console.log('Selected annotations', annotations)
      })

      /**
        * Fired when the set of annotations visible in the current viewport changes.
        * This event is only available on the OpenSeadragonAnnotator and will respond to zooming and panning 
        * of the OpenSeadragon image.
      */
      annotator.on('viewportIntersect', (annotations, originalEvent) => {
        console.log('Annotations in viewport', annotations)
      })

      
      /**
        * Fired after a new annotation is created and available as a shape in the DOM.
        */
      annotator.on('createAnnotation', function(annotation) {
        //annotations.target = "makeItThe#selector"
        console.log('Annotation Created:', annotation)
      })

      /**
       * Fired when an existing annotation is modified. Provides both the updated annotation and the previous state
       * of the annotation.
      */
      annotator.on('updateAnnotation', (annotation, previous) => {
        console.log('Annotation before update: ' + previous)
        console.log('Annotation after update: ' + annotation)
      })

      annotator.on('deleteAnnotation', (annotation) => {
        console.log('Annotation Deleted:', annotation)
      })

      // Load existing Annotations.  Not sure of the AnnotationPage. Not sure about Content Negotiation yet.
      // annotator.loadAnnotations('./annotations.json');
    }

    // Presumes the canvas URI supplied is to a IIIF Presentation API 3 Canvas.  
    async loadCanvas(uri) {
      const canvas = uri || this.shadowRoot.getElementById("canvasURI").value
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
      const context = resolvedCanvas["@context"]
      if(!context.includes("iiif.io/api/presentation/3/context.json")){
        // err = new Error("Canvas does not have context.", {"cause":"The Canvas does not have a context and cannot be processed."})
        // throw err
        console.warn("The Canvas object did not have the IIIF Presentation API 3 context and may not be parseable.")
      }
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
      this.render(resolvedCanvas)
    }
}

customElements.define('tpen-boxy-annotator', BoxyAnnotator)
