
/**
 * A plain Annotorious Annotator that can draw Rectangles.  It is able to draw Polygons, but this ability is not exposed to the user.
 * It assigns all Annotations to the provided AnnotationPage (does not make or track more than one page at a time)
 *
 * It is exposed to the user at /interfaces/annotator/index.html and so is our 'default annotator'.
 *
 * The Annotation generation UI is powered by Annotorious.  The TPEN3 team hereby acknowledges
 * and thanks the Annotorious development team for this open source software.
 * @see https://annotorious.dev/
 * Annotorious licensing information can be found at https://github.com/annotorious/annotorious
*/

import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class AnnotoriousAnnotator extends HTMLElement {
    #osd
    #annotoriousInstance
    #userForAnnotorious
    #annotationPageURI
    #resolvedAnnotationPage
    #modifiedAnnotationPage
    #imageDims
    #canvasDims
    #isDrawing = false
    #isErasing = false
    
    static get observedAttributes() {
      return ["annotationpage"]
    }

    constructor() {
      super()
      TPEN.attachAuthentication(this)
      this.attachShadow({ mode: 'open' })
      const osdScript = document.createElement("script")
      osdScript.src = "https://cdn.jsdelivr.net/npm/openseadragon@latest/build/openseadragon/openseadragon.min.js"
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
              <label for="drawTool">Draw Mode
               <input  type="checkbox" id="drawTool">
              </label>
              <br>
              <label> Erase Mode
               <input type="checkbox" id="eraseTool"> 
              </label>
              <br>
              <label> Annotation Visibility
               <input type="checkbox" id="seeTool" checked> 
              </label>
              <br>
              <input id="saveBtn" type="button" value="Save Annotations"/>
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
        const tpenUserProfile = await User.fromToken(this.userToken).getProfile()
        // Whatever value is here becomes the value of 'creator' on the Annotations.
        this.#userForAnnotorious = tpenUserProfile.agent.replace("http://", "https://")
      }
      this.#annotationPageURI = TPEN.screen.pageInQuery
      if(!this.#annotationPageURI) {
          alert("You must provide a ?pageID=theid in the URL.  The value should be the URI of an existing AnnotationPage.")
          return
      }
      this.setAttribute("annotationpage", this.#annotationPageURI)
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if(newValue === oldValue || !newValue) return
      if(name === 'annotationpage') {
          this.processAnnotationPage(newValue)
      }
    }

    async render(resolvedCanvas) {
      this.shadowRoot.getElementById('annotator-container').innerHTML = ""
      const canvasID = resolvedCanvas["@id"] ?? resolvedCanvas.id
      const fullImage = resolvedCanvas?.items[0]?.items[0]?.body?.id
      const imageService = resolvedCanvas?.items[0]?.items[0]?.body?.service?.id
      
      if(!fullImage) {
          throw new Error("Cannot Resolve Canvas Image", 
            {"cause":"The Image is 404 or unresolvable."})
      }

      this.#imageDims = [
        resolvedCanvas?.items[0]?.items[0]?.body?.width,
        resolvedCanvas?.items[0]?.items[0]?.body?.height
      ]
      this.#canvasDims = [
        resolvedCanvas?.width,
        resolvedCanvas?.height
      ]
      let imageInfo = {
        type: "image",
        url: fullImage
      }

      // Try to get the info.json.  If we can't, continue with the simple imageInfo obj.
      if(imageService) {
          const lastchar = imageService[imageService.length-1]
          if(lastchar !== "/") imageService += "/"
          const info = await fetch(imageService+"info.json").then(resp => resp.json()).catch(err => { return false })
          if(info) imageInfo = info
      }

      /**
       * An instance of OpenSeaDragon with customization options that help our desired
       * "draw new annotation", "edit existing drawn annotation", "delete drawn annotation" UX.
       * The interface folder contains an /images/ folder with all the OpenSeaDragon icons.
       * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options for all options and their description.
      */
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

      /**
       * An instance of an OpenSeaDragon Annotorious Annotation with customization options that help our desired
       * "draw new annotation", "edit existing drawn annotation", "delete drawn annotation" UX.
       * @see https://annotorious.dev/api-reference/openseadragon-annotator/ for all the available methods of this annotator.
      */
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
          //   const isMe = annotation.target.creator?.id === 'my_id';
          //   return isMe ? 'EDIT' : 'SELECT';
          // }

      })
      this.#annotoriousInstance.setUser(this.#userForAnnotorious)
      // "polygon" is another available option
      this.#annotoriousInstance.setDrawingTool("rectangle")
      this.setInitialAnnotations()
      this.listenTo(this)
    }

    /**
      * Listeners on all available Annotorious events involving the annotations.  See inline comments for details.
      * Here we can catch events, then do TPEN things with the Annotations from those events.
      * Lifecycle Events API is available at https://annotorious.dev/api-reference/events/
      *
      * @param annotator - An established instance of a AnnotoriousOSD.createOSDAnnotator
    */ 
    listenTo(_this) {
      const annotator = _this.#annotoriousInstance
      
      /**
        * Fired after a click event on a drawn Annotation.  The annotation data is known and available as a parameter.
        * A click on a drawn Annotation in erase mode means erase the Annotation.
        * 
      */
      annotator.on('clickAnnotation', (annotation, originalEvent) => {
        if(!annotation) return
        // FIXME if the user holds the mouse down there is some goofy UX.
        if(_this.#isErasing) {
          setTimeout(()=>{
            // Timeout required in order to allow the click-and-focus native functionality to complete.
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

      /**
        * Fired after a new annotation is created and available as a shape in the DOM.
      */
      annotator.on('createAnnotation', function(annotation) {
        // console.log('Annotation Created:', annotation)
        _this.#annotoriousInstance.cancelSelected(annotation)  
      })

    }

    /**
     * Resolve and process/validate an AnnotationPage URI.
     * In order to show an Image the AnnotationPage must target a Canvas that has an Image annotated onto it.
     * Process the target, which can be a value of various types.
     * Pass along the string Canvas URI that relates to or is the direct value of the target.
     *
     * FIXME
     * Give users a path when AnnotationPage URIs do not resolve or resolve to something unexpected.
     *
     * @param page An AnnotationPage URI.  The AnnotationPage should target a Canvas.
    */
    async processAnnotationPage(page) {
      if(!page) return
      this.#resolvedAnnotationPage = await fetch(page)
        .then(r => {
            if(!r.ok) throw r
            return r.json()
        })
        .catch(e => {
            throw e
        })
      const context = this.#resolvedAnnotationPage["@context"]
      if(!(context.includes("iiif.io/api/presentation/3/context.json") || context.includes("w3.org/ns/anno.jsonld"))) {
        console.warn("The AnnotationPage object did not have the IIIF Presentation API 3 context and may not be parseable.")
      }
      const id = this.#resolvedAnnotationPage["@id"] ?? this.#resolvedAnnotationPage.id
      if(!id) {
          throw new Error("Cannot Resolve AnnotationPage",
            {"cause":"The AnnotationPage is 404 or unresolvable."})
      }
      const type = this.#resolvedAnnotationPage["@type"] ?? this.#resolvedAnnotationPage.type
      if(type !== "AnnotationPage") {
          throw new Error(`Provided URI did not resolve an 'AnnotationPage'.  It resolved a '${type}'`,
            {"cause":"URI must point to an AnnotationPage."})
      }
      const targetCanvas = this.#resolvedAnnotationPage.target
      if(!targetCanvas) {
        throw new Error(`The AnnotationPage object did not have a target Canvas.  There is no image to load.`,
          {"cause":"AnnotationPage.target must have a value."})
      }
      // Note this will process the id from embedded Canvas objects to pass forward and be resolved.
      const canvasURI = this.processPageTarget(targetCanvas)
      this.processCanvas(canvasURI)
    }

    /**
     * Fetch a Canvas URI and check that it is a Canvas object.  Pass it forward to render the Image into the interface.
     *
     * FIXME
     * Give users a path when Canvas URIs do not resolve or resolve to something unexpected.
     *
     * @param uri A String Canvas URI
    */
    async processCanvas(uri) {
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
      if(!context.includes("iiif.io/api/presentation/3/context.json")) {
        console.warn("The Canvas object did not have the IIIF Presentation API 3 context and may not be parseable.")
      }
      const id = resolvedCanvas["@id"] ?? resolvedCanvas.id
      if(!id) {
          throw new Error("Cannot Resolve Canvas or Image",
            {"cause":"The Canvas is 404 or unresolvable."})
      }
      const type = resolvedCanvas["@type"] ?? resolvedCanvas.type
      if(type !== "Canvas") {
          throw new Error(`Provided URI did not resolve a 'Canvas'.  It resolved a '${type}'`, 
            {"cause":"URI must point to a Canvas."})
      }
      this.render(resolvedCanvas)
    }

    /**
      * Adjust Annotation selectors as needed for communication between Annotorious and TPEN3.
      * Annotorious naturally builds selector values relative to image dimensions.
      * TPEN3 wants them relative to Canvas dimensions.
      * When recieving Annotations to render convert the selectors so they are relative to the image and draw correctly.
      * When saving Annotations convert the selectors so they are relative to the canvas and save correctly.
      *
      * @param annotations - An Array of Annotations whose selectors need converted
      * @param bool - A switch for forwards or backwards conversion
      *
      * @return the Array of Annotations with their selectors converted
    */
    convertSelectors(annotations, bool=false) {
      if(this.#imageDims[0] === this.#canvasDims[0] && this.#imageDims[1] === this.#canvasDims[1]) return annotations
      if(!annotations || annotations.length === 0) return annotations
      let orig_xywh, converted_xywh = []
      let tar, sel = ""
      return annotations.map(annotation => {
        if(!annotation.target) return annotation
        if(bool) {
          /**
           * You are converting for Annotorious.  Selectors need to be changed to be relative to the Image dimensions.
           * This is so that they render correctly.  TPEN3 selectors are relative to the Canvas dimensions.
           * The target is in simplified TPEN3 format. uri#xywh=
          */
          tar = annotation.target.split("#xywh=")[0]
          orig_xywh = annotation.target.split("#xywh=")[1].split(",")
          converted_xywh[0] = parseInt((this.#imageDims[0] / this.#canvasDims[0]) * parseInt(orig_xywh[0]))
          converted_xywh[1] = parseInt((this.#imageDims[1] / this.#canvasDims[1]) * parseInt(orig_xywh[1]))
          converted_xywh[2] = parseInt((this.#imageDims[0] / this.#canvasDims[0]) * parseInt(orig_xywh[2]))
          converted_xywh[3] = parseInt((this.#imageDims[1] / this.#canvasDims[1]) * parseInt(orig_xywh[3]))
          sel = "#xywh=" + converted_xywh.join(",")
          annotation.target = tar + sel
        }
        else{
          /**
           * You are converting for TPEN3.  Selectors need to be changed to be relative to the Canvas dimensions.
           * This is so that they save correctly.  Annotorious selectors are relative to the Image dimensions.
           * The target is in expanded Annotorious format. {source:"uri", selector:{value:"xywh="}}
          */
          orig_xywh = annotation.target.selector.value.replace("xywh=pixel:", "").split(",")
          converted_xywh[0] = parseInt((this.#canvasDims[0] / this.#imageDims[0]) * parseInt(orig_xywh[0]))
          converted_xywh[1] = parseInt((this.#canvasDims[1] / this.#imageDims[1]) * parseInt(orig_xywh[1]))
          converted_xywh[2] = parseInt((this.#canvasDims[0] / this.#imageDims[0]) * parseInt(orig_xywh[2]))
          converted_xywh[3] = parseInt((this.#canvasDims[1] / this.#imageDims[1]) * parseInt(orig_xywh[3]))
          sel = "xywh=" + converted_xywh.join(",")
          annotation.target.selector.value = sel
        }
        return annotation
      })
    }

    /**
     * Format and pass along the Annotations from the provided AnnotationPage.
     * Annotorious will render them on screen and introduce them to the UX flow.
    */
    setInitialAnnotations() {
      if(!this.#resolvedAnnotationPage) return
      let allAnnotations = JSON.parse(JSON.stringify(this.#resolvedAnnotationPage.items))
      // Convert the Annotation selectors so that they are relative to the Image dimensions
      allAnnotations = this.convertSelectors(allAnnotations, true)
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
      * There have been edits to the page items and those edits need to be saved.
      * Announce the AnnotationPage with the changes that needs to be updated for processing upstream.
    */
    saveAnnotations() {
      let allAnnotations = this.#annotoriousInstance.getAnnotations()
      // Convert the Annotation selectors so that they are relative to the Canvas dimensions
      allAnnotations = this.convertSelectors(allAnnotations, false)
      allAnnotations = allAnnotations.map(annotation => {
        annotation.body = annotation.body.length ? annotation.body[0] : {}
        const tar = annotation.target.source
        const sel = "#"+annotation.target.selector.value.replace("pixel:", "")
        annotation.target = tar + sel
        annotation.motivation = "transcribing"
        // stop undefined from appearing on previously existing Annotations
        if(!annotation.creator) delete annotation.creator
        if(!annotation.modified) delete annotation.modified
        // We already track this in __rerum.createdAt
        delete annotation.created
        return annotation
      })
      const toast = {
        message: "Annotations saved!",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
      let page = JSON.parse(JSON.stringify(this.#resolvedAnnotationPage))
      page.items = allAnnotations
      this.#modifiedAnnotationPage = page
      TPEN.eventDispatcher.dispatch("tpen-page-committed", page)
      console.log(allAnnotations)
      return allAnnotations
    }

    /**
     * Process the string URI from an AnnotationPage.target value.  This value may be an Array, a JSON Object, or a String URI.
     * Process it if possible.  Attempt to determine a single Canvas URI.
     *
     * @param pageTarget an Array, a JSON Object, or a String URI value from some AnnotationPage.target
     * @return The URI from the input pageTarget
    */ 
    processPageTarget(pageTarget) {
      let canvasURI
      if(Array.isArray(pageTarget)) {
        throw new Error(`The AnnotationPage object has multiple targets.  We cannot process this yet, and nothing will load.`,
          {"cause":"AnnotationPage.target is an Array."})
      }
      if(typeof pageTarget === "object") {
        // An embedded object, a referenced object, or a {source:"", selector:{}} object
        try{
          JSON.parse(JSON.stringify(target))
        }
        catch(err) {
          throw new Error(`The AnnotationPage target is not processable.`, 
            {"cause":"AnnotationPage.target is not JSON."})
        }
        const tcid = pageTarget["@id"] ?? pageTarget.id ?? pageTarget.source
        if(!tcid) {
          throw new Error(`The target of the AnnotationPage does not contain an id.  There is no image to load.`,
            {"cause":"AnnotationPage.target must be a Canvas."})
        }
        // For now we don't trust the embedded Canvas and are going to take the id forward to resolve.
        canvasURI = tcid
      }
      else if(typeof pageTarget === "string") {
        // Just use it then
        canvasURI = pageTarget
      }

      let uricheck
      try {
        uricheck = new URL(canvasURI)
      } 
      catch (_) {}
      if(!(uricheck?.protocol === "http:" || uricheck?.protocol === "https:")) {
        throw new Error(`AnnotationPage.target string is not a URI`, 
          {"cause":"AnnotationPage.target string must be a URI."})
      }
      return canvasURI
    }

    toggleDrawingMode(e) {
      if(e.target.checked) this.startDrawing()
      else { this.stopDrawing() }
    }

    toggleErasingMode(e) {
      if(e.target.checked) this.startErasing()
      else { this.stopErasing() }
    }

    toggleAnnotationVisibility(e) {
      if(e.target.checked) this.showAnnotations()
      else { this.hideAnnotations() }
    }

    /**
     * Use Annotorious to show all known Annotations
     * https://annotorious.dev/api-reference/openseadragon-annotator/#setvisible
    */
    showAnnotations() {
      this.#annotoriousInstance.setVisible(true)
      const toast = {
        message: "Annotations are visible",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
    }

    /**
     * Use Annotorious to hide all visible Annotations (except the one in focus, if any)
     * https://annotorious.dev/api-reference/openseadragon-annotator/#setvisible
    */
    hideAnnotations() {
      this.#annotoriousInstance.setVisible(false)
      const toast = {
        message: "Annotations are hidden",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
    }

    /**
     * Activate Annotorious annotation drawing mode.
     * This makes it so the user cannot zoom and pan.
    */ 
    startDrawing() {
      this.stopErasing()
      this.#isDrawing = true
      this.shadowRoot.getElementById("eraseTool").checked = false
      this.#annotoriousInstance.setDrawingEnabled(true)
      const toast = {
        message: "You started drawing",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
    }

    /**
     * Deactivate Annotorious annotation drawing mode.
     * This makes it so that the user can zoom and pan.
    */ 
    stopDrawing() {
      this.#isDrawing = false
      this.#annotoriousInstance.setDrawingEnabled(false)
      const toast = {
        message: "You stopped drawing",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
    }

    /**
     * Activate Annotorious annotation erasing mode.
     * Clicking on an existing annotation will prompt the user about deleting the annotation.
    */ 
    startErasing() {
      this.stopDrawing()
      this.#isErasing = true
      this.shadowRoot.getElementById("drawTool").checked = false
      const toast = {
        message: "You started erasing",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
    }

    /**
     * Deactivate Annotorious annotation erasing mode.
     * This allows user to zoom and pan, and select annotations to edit.
    */ 
    stopErasing() {
      this.#isErasing = false
      const toast = {
        message: "You stopped erasing",
        status: "info"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
    }
}

customElements.define('tpen-plain-annotator', AnnotoriousAnnotator)
