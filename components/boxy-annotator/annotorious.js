/**
    * The Annotation generation UI is powered by Annotorious.  The TPEN3 team hereby acknowledges
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
    #annotationPageURI
    #resolvedAnnotationPage
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
              <p> You can zoom and pan when you are not drawing.</p>
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
              <br>
              <input id="saveBtn" type="button" value="Save"/>
            </div>
            <div id="annotator-container"></div>
        </div>

        `
        const drawTool = this.shadowRoot.getElementById("drawTool")
        const eraseTool = this.shadowRoot.getElementById("eraseTool")
        const seeTool = this.shadowRoot.getElementById("seeTool")
        const saveButton = this.shadowRoot.getElementById("saveBtn")
        drawTool.addEventListener("change", (e) => this.toggleDrawingMode(e))
        eraseTool.addEventListener("change", (e) => this.toggleErasingMode(e))
        seeTool.addEventListener("change", (e) => this.toggleAnnotationVisibility(e))
        saveButton.addEventListener("click", (e) => this.saveAnnotations(e))
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
        this.#annotationPageURI = this.getAnnotationPageFromURL()
        this.setAttribute("annotationpage", this.#annotationPageURI)
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if(newValue === oldValue) return
      if (name === 'canvas') {
          this.processCanvas(newValue)
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
        this.setInitialAnnotations()
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
        // console.log('Annotation clicked: ' + annotation.id)
        if(!annotation) return
        // A click on a drawn Annotation in erase mode means erase the Annotation.
        // FIXME if the user holds the mouse down there is some goofy UX.
        if(_this.#isErasing) {
          setTimeout(()=>{
            // Timeout required in order to let the click-and-focus native functionality to complete.
            // Also stops the goofy UX for naturally slow clickers.
            let c = confirm("Are you sure you want to remove this?")
            if(c) {
              _this.#annotoriousInstance.removeAnnotation(annotation)  
            }
            else{
              _this.#annotoriousInstance.cancelSelected()
            }
          }, 500)
        }
      })

      // A mouseenter event on a drawn Annotation.  The annotation data is known and available as a parameter.
      annotator.on('mouseEnterAnnotation', (annotation, originalEvent) => {
        // console.log('Mouse entered: ' + annotation.id)
      })

      annotator.on('mouseLeaveAnnotation', (annotation, originalEvent) => {
        // console.log('Mouse left: ' + annotation.id)
      })

      /**
        * Fired when the set of selected annotation changes. For future compatibility, the argument is an array. 
        * However, only single annotation will be returned currently.
        * When the user de-selects an annotation, the event will be fired with an empty array.
      */
      annotator.on('selectionChanged', (annotations, originalEvent) => {
        // console.log('Selected annotations', annotations)
      })

      /**
        * Fired when the set of annotations visible in the current viewport changes.
        * This event is only available on the OpenSeadragonAnnotator and will respond to zooming and panning 
        * of the OpenSeadragon image.
      */
      annotator.on('viewportIntersect', (annotations, originalEvent) => {
        // console.log('Annotations in viewport', annotations)
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
        // console.log('Annotation before update: ' + previous)
        // console.log('Annotation after update: ' + annotation)
      })

      annotator.on('deleteAnnotation', (annotation) => {
        // console.log('Annotation Deleted:', annotation)
      })

    }

    /**
     * Resolve and process/validate an AnnotationPage URI.
     * In order to show an Image the AnnotationPage must target a Canvas that has an Image annotated onto it.
     * Process the target, which can be a value of various types.
     * Pass along the string Canvas URI that relates to or is the direct value of the target.
     *
     * @param page An AnnotationPage URI.  The AnnotationPage should target a Canvas.
    */
    async processAnnotationPage(page) {
      if(!page) return
      let err
      this.#resolvedAnnotationPage = await fetch(page)
        .then(r => {
            if(!r.ok) throw r
            return r.json()
        })
        .catch(e => {
            throw e
        })
      const context = this.#resolvedAnnotationPage["@context"]
      if(!(context.includes("iiif.io/api/presentation/3/context.json") || context.includes("w3.org/ns/anno.jsonld"))){
        console.warn("The AnnotationPage object did not have the IIIF Presentation API 3 context and may not be parseable.")
      }
      const id = this.#resolvedAnnotationPage["@id"] ?? this.#resolvedAnnotationPage.id
      if(!id) {
          err = new Error("Cannot Resolve AnnotationPage", {"cause":"The AnnotationPage is 404 or unresolvable."})
          throw err
      }
      const type = this.#resolvedAnnotationPage["@type"] ?? this.#resolvedAnnotationPage.type
      if(type !== "AnnotationPage"){
          err = new Error(`Provided URI did not resolve an 'AnnotationPage'.  It resolved a '${type}'`, {"cause":"URI must point to an AnnotationPage."})
          throw err
      }
      let targetCanvas = this.#resolvedAnnotationPage.target
      if(!targetCanvas) {
        err = new Error(`The AnnotationPage object did not have a target Canvas.  There is no image to load.`, {"cause":"AnnotationPage.target must have a value."})
        throw err
      }
      // Note this will process the id from embedded Canvas objects to pass forward and be resolved.
      const canvasURI = this.processPageTarget(targetCanvas)
      this.processCanvas(canvasURI)
    }

    /**
     * Fetch a Canvas URI and check that it is a Canvas object.  Pass it forward to render the Image into the interface.
     *
     * @param uri A String Canvas URI
    */
    async processCanvas(uri) {
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

    /**
     * Format and pass along the Annotations from the provided AnnotationPage.
     * Annotorious will render them on screen and introduce them to the UX flow.
    */
    setInitialAnnotations() {
      if(!this.#resolvedAnnotationPage) return
      let allAnnotations = JSON.parse(JSON.stringify(this.#resolvedAnnotationPage.items))
      allAnnotations.map(annotation => {
        annotation.body = [annotation.body]
        const tarsel = annotation.target.split("#")
        const target = {
          source: tarsel[0],
          selector: {
            conformsTo: "http://www.w3.org/TR/media-frags/",
            type: "FragmentSelector",
            value: tarsel[1]
          }
        }
        annotation.target = target
        return annotation
      })
      this.#annotoriousInstance.setAnnotations(allAnnotations, false)
    }

    /**
      * This page renders because of a known AnnotationPage.  Existing Annotations in that AnnotationPage were drawn.
      * There have been edits to the Annotations and those edits need to be saved.
      * Announce the AnnotationPage with the changes that needs to be updated.
      * OR
      * Announce the AnnotationPage after it has been updated with the changes
    */
    async saveAnnotations() {
      // Annotorious has opinions about Annotation body and target values.  
      // TPEN3 has opinions about Annotation body and target values.  Preference TPEN3 opinions.
      const allAnnotations = this.#annotoriousInstance.getAnnotations()
      console.log("Save these Annotations")
      console.log(allAnnotations)
      allAnnotations.map(annotation => {
        // Careful here.  Consider targets when the Canvas and Image have differing dimensions.
        annotation.body = annotation.body.length ? annotation.body[0] : []
        const tar = annotation.target.source
        const sel = "#"+annotation.target.selector.value.replace("pixel:", "")
        annotation.target = tar + sel
        // stop undefined from appearing on previously existing Annotations
        if(!annotation.creator) delete annotation.creator
        // We already track this in __rerum.createdAt
        delete annotation.created
        // hmm
        // delete annotation.modified
        return annotation
      })
      // collectionInQuery, lineInQuery, annotationPageInQuery to use TPEN to get it out.
      // TODO what do I do to the AnnotationPage with these new Annotations now?  Just announce them out?
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
          err = new Error(`The AnnotationPage target is not processable.`, {"cause":"AnnotationPage.target is not JSON."})
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

    toggleErasingMode(e) {
      if(e.target.checked) this.startErasing()
      else { this.stopErasing() }
    }

    toggleAnnotationVisibility (e) {
      if(e.target.checked) this.showAnnotations()
      else { this.hideAnnotations() }
    }

    // https://annotorious.dev/api-reference/openseadragon-annotator/#setvisible
    showAnnotations() {
      this.#annotoriousInstance.setVisible(true)
    }

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
