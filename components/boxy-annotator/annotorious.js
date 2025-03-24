/**
    * The Annotation generation and UI is powered in part by Annotorious.  The TPEN3 team hereby acknowledges
    * and thanks the Annotorious development team for this open source software.
    * @see https://annotorious.dev/
    * Annotorious licensing information can be found at https://github.com/annotorious/annotorious
*/

import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class BoxyAnnotator extends HTMLElement {
    #osd
    #annotoriousInstance
    #userForAnnotorious
    #knownAnnotationPage
    #isDrawing = false
    #isErasing = false
    static get observedAttributes() {
        return ["canvas", "image", "annotationpage"]
    }

    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
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
          #tools-container {
            background-color: lightgray;
            position: absolute;
            top: 4em;
            z-index: 10;
          }
        </style>
        <div>
            <div id="tools-container">
              <p> You can zoom and pan when you are not drawing or erasing.</p>
              <label for="drawTool">Check To Draw:
               <input  type="checkbox" id="drawTool">
              </label>
              <br>
              <label> Check to Erase:
               <input type="checkbox" id="eraseTool"> 
              </label>
              <br>
              <label> Check to See Annotations:
               <input type="checkbox" id="seeTool" checked> 
              </label>
            </div>
            <div id="annotator-container"></div>
        </div>

        `
        const drawTool = this.shadowRoot.getElementById("drawTool")
        const eraseTool = this.shadowRoot.getElementById("eraseTool")
        const seeTool = this.shadowRoot.getElementById("seeTool")
        drawTool.addEventListener("change", (e) => this.toggleDrawingMode(e))
        eraseTool.addEventListener("change", (e) => this.toggleErasingMode(e))
        seeTool.addEventListener("change", (e) => this.toggleAnnotationVisibility(e))
        this.shadowRoot.appendChild(osdScript)
        this.shadowRoot.appendChild(annotoriousScript)
    }

    async connectedCallback() {
        if(!this.#userForAnnotorious) {
          let tpenUserProfile = await User.fromToken(this.userToken).getProfile()
          //tpenUserProfile.id = tpenUserProfile.agent
          //tpenUserProfile.name = tpenUserProfile.displayName
          //this.#userForAnnotorious = tpenUserProfile
          this.#userForAnnotorious = tpenUserProfile.agent.replace("http://", "https://")
        }
        this.#knownAnnotationPage = this.getAnnotationPageFromURL()
        this.setAttribute("annotationpage", this.#knownAnnotationPage)
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if(newValue === oldValue) return
      if (name === 'canvas') {
          this.loadCanvas(newValue)
      }
      if (name === 'annotationpage') {
          this.processAnnotationPage(newValue)
      }
    }

    async render(resolvedCanvas) {
        this.shadowRoot.getElementById('annotator-container').innerHTML = ""
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
        
        // https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
        this.#osd = OpenSeadragon({
            element: this.shadowRoot.getElementById('annotator-container'),
            tileSources: imageInfo,
            prefixUrl: "./images/",
            gestureSettingsMouse:{
              clickToZoom: false,
              dblClickToZoom: true  
            },
            gestureSettingsTouch:{
              clickToZoom: false,
              dblClickToZoom: true  
            },
            gestureSettingsPen:{
              clickToZoom: false,
              dblClickToZoom: true  
            },
            gestureSettingsUnknown:{
              clickToZoom: false,
              dblClickToZoom: true  
            }
        })

        // @see https://annotorious.dev/api-reference/openseadragon-annotator/ for all the available methods of this annotator.
        this.#annotoriousInstance = AnnotoriousOSD.createOSDAnnotator(this.#osd, {
            adapter: AnnotoriousOSD.W3CImageFormat(canvasID),
            drawingEnabled: false,
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
        this.#annotoriousInstance.setUser(this.#userForAnnotorious)
        this.#annotoriousInstance.setDrawingTool("rectangle")
        this.listenTo(this)
    }

    /**
        * Listeners on all available Annotorious instance events.  See inline comments for details.
        * Here we can catch events, then do TPEN things with the Annotations from those events.
        * Lifecycle Events API is available at https://annotorious.dev/api-reference/events/
        *
        * @param annotator - An established instance of a AnnotoriousOSD.createOSDAnnotator
    */ 
    listenTo(_this) {
      const annotator = _this.#annotoriousInstance
      // A click event on a drawn Annotation.  The annotation data is known and available as a parameter.
      annotator.on('clickAnnotation', (annotation, originalEvent) => {
        console.log('Annotation clicked: ' + annotation.id)
        if(_this.#isErasing) {
          setTimeout(()=>{
            // Timeout required in order to let the click-and-focus native functionality to complete.
            let c = confirm("Are you sure you want to remove this?")
            if(c) {
              _this.#annotoriousInstance.cancelSelected()
              _this.#annotoriousInstance.removeAnnotation(annotation)  
            }
          }, 500)
        }
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
        console.log('Annotation Created:', annotation)
        _this.#annotoriousInstance.cancelSelected(annotation)  
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

    /**
     * Fetch a Canvas URI and check that it is a Canvas object.  Pass it forward to render the Image into the interface.
     *
     * @param uri A String Canvas URI
    */
    async loadCanvas(uri) {
      let err
      const canvas = uri
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

    async processAnnotationPage(page) {
      if(!page) return
      let err
      let resolvedPage = await fetch(page)
        .then(r => {
            if(!r.ok) throw r
            return r.json()
        })
        .catch(e => {
            throw e
        })
      const context = resolvedPage["@context"]
      if(!(context.includes("iiif.io/api/presentation/3/context.json") || context.includes("w3.org/ns/anno.jsonld"))){
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

    toggleDrawingMode(e) {
      if(e.target.checked) this.startDrawing()
      else { this.stopDrawing() }
    }

    //TODO
    toggleErasingMode(e) {
      if(e.target.checked) this.startErasing()
      else { this.stopErasing() }
    }

    toggleAnnotationVisibility (e) {
      if(e.target.checked) this.showAnnotations()
      else { this.hideAnnotations() }
    }

    //hmm doesn't do what I expect
    // https://annotorious.dev/api-reference/openseadragon-annotator/#setvisible
    showAnnotations() {
      this.#annotoriousInstance.setVisible(true)
    }

    //hmm doesn't do what I expect
    // https://annotorious.dev/api-reference/openseadragon-annotator/#setvisible
    hideAnnotations() {
      this.#annotoriousInstance.setVisible(false)
    }

    startDrawing() {
      this.stopErasing()
      this.#isDrawing = true
      this.shadowRoot.getElementById("eraseTool").checked = false
      this.#annotoriousInstance.setDrawingEnabled(true)
    }

    stopDrawing() {
      this.#isDrawing = false
      this.#annotoriousInstance.setDrawingEnabled(false)
    }

    startErasing() {
      this.stopDrawing()
      this.#isErasing = true
      this.shadowRoot.getElementById("drawTool").checked = false
    }

    stopErasing() {
      this.#isErasing = false
    }

}

customElements.define('tpen-boxy-annotator', BoxyAnnotator)
