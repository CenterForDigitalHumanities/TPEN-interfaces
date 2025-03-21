/**
    * The Annotation generation and UI is powered in part by Annotorious.  The TPEN3 team hereby acknowledges
    * and thanks the Annotorious development team for this open source software.
    * @see https://annotorious.dev/
    * Annotorious licensing information can be found at https://github.com/annotorious/annotorious
*/

import { eventDispatcher } from '../../api/events.js'
import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class BoxyAnnotator extends HTMLElement {
    #OpenSeadragon = null
    #AnnotoriousOSD = null

    static get observedAttributes() {
        return ["canvas", "image"]
    }

    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
    }

    async connectedCallback() {
        this.shadowRoot.innerHTML = `
        <style>
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
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'canvas' && newValue !== oldValue) {
            this.loadCanvas(newValue)
        }
    }

    async render(image, canvas) {

      // Full example, may be a bit extra
      //   let viewer = OpenSeadragon({
      //   element: this.shadowRoot.getElementById('annotator-container'),
      //   tileSources: {
      //    "@context":"http://iiif.io/api/image/3/context.json",
      //    "id":"https://iiif.io/api/image/3.0/example/reference/15f769d62ca9a3a2deca390efed75d73-3_titlepage1",
      //    "height":7230,
      //    "width":5428,
      //    "profile":"level1",
      //    "protocol":"http://iiif.io/api/image",
      //    "tiles":[
      //       {
      //          "height":512,
      //          "scaleFactors":[
      //             1,
      //             2,
      //             4,
      //             8
      //          ],
      //          "width":512
      //       }
      //    ]
      //   }
      // })

      // https://annotorious.dev/guides/openseadragon-iiif/
      // with this cannot use 'https://iiif.io/api/image/3.0/example/reference/15f769d62ca9a3a2deca390efed75d73-3_titlepage1/'

    // try {
    //     this.#OpenSeadragon = await import("https://cdn.jsdelivr.net/npm/openseadragon@5.0/build/openseadragon/openseadragon.min.js")
    //     this.#AnnotoriousOSD = await import("https://cdn.jsdelivr.net/npm/@annotorious/openseadragon@latest/dist/annotorious-openseadragon.js")
    // } catch (error) {
    //     console.error(error)
    // }
    console.log("how can I know OpenSeadDragon and AnnotoriousOSD here.")
    let viewer = OpenSeadragon({
        element: this.shadowRoot.getElementById('annotator-container'),
        tileSources: {
          type: 'image',
          url: image
        }
    })

      // @see https://annotorious.dev/api-reference/openseadragon-annotator/ for all the available methods of this annotator.
      let annotorious = AnnotoriousOSD.createOSDAnnotator(viewer, {
        adapter: AnnotoriousOSD.W3CImageFormat(canvas),
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
      anno.on('clickAnnotation', (annotation, originalEvent) => {
        console.log('Annotation clicked: ' + annotation.id);
      })

      // A mouseenter event on a drawn Annotation.  The annotation data is known and available as a parameter.
      anno.on('mouseEnterAnnotation', (annotation, originalEvent) => {
        console.log('Mouse entered: ' + annotation.id)
      })

      anno.on('mouseLeaveAnnotation', (annotation, originalEvent) => {
        console.log('Mouse left: ' + annotation.id)
      })

      /**
        * Fired when the set of selected annotation changes. For future compatibility, the argument is an array. 
        * However, only single annotation will be returned currently.
        * When the user de-selects an annotation, the event will be fired with an empty array.
      */
      anno.on('selectionChanged', (annotations, originalEvent) => {
        console.log('Selected annotations', annotations)
      })

      /**
        * Fired when the set of annotations visible in the current viewport changes.
        * This event is only available on the OpenSeadragonAnnotator and will respond to zooming and panning 
        * of the OpenSeadragon image.
      */
      anno.on('viewportIntersect', (annotations, originalEvent) => {
        console.log('Annotations in viewport', annotations)
      })

      
      /**
        * Fired after a new annotation is created and available as a shape in the DOM.
        */
      anno.on('createAnnotation', function(annotation) {
        anno.target = "makeItThe#selector"
        console.log('Annotation Created:', annotation)
      })

      /**
       * Fired when an existing annotation is modified. Provides both the updated annotation and the previous state
       * of the annotation.
      */
      anno.on('updateAnnotation', (annotation, previous) => {
        console.log('Annotation before update: ' + previous)
        console.log('Annotation after update: ' + annotation)
      })

      anno.on('deleteAnnotation', (annotation) => {
        console.log('Annotation Deleted:', annotation)
      })

      // Load existing Annotations.  Not sure of the AnnotationPage. Not sure about Content Negotiation yet.
      // anno.loadAnnotations('./annotations.json');
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
      let image = resolvedCanvas?.items[0]?.items[0]?.body?.id

      if(!image){
          err = new Error("Cannot Resolve Canvas or Image", {"cause":"The Image is 404 or unresolvable."})
          throw err
      }
      let imageApiService = resolvedCanvas.items[0].items[0].body.service.type
      const lastchar = image[image.length-1]
      // TODO some content negotiation here.  Need to know presi2 or presi3
      if(imageApiService === "ImageService3"){
        if(!image.includes("default.jpg")) {
            if(lastchar !== "/") image += "/"
            image += "full/max/0/default.jpg"
        }  
      }
      else if (imageApiService === "ImageService2") {
        if(!image.includes("default.jpg")) {
            if(lastchar !== "/") image += "/"
            image += "full/full/0/default.jpg"
        }  
      }
      this.setAttribute("image", image)
      this.render(image, canvas)
    }

}

customElements.define('tpen-boxy-annotator', BoxyAnnotator)
