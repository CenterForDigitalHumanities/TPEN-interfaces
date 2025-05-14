/**
 * A manual line parser akin to the one available at TPEN 2.8.
 *
 * It is exposed to the user at /interfaces/annotator/line-parser.html.
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
    #isLineEditing = false
    #isErasing = false
    #editType = ""

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
        #tools-container label {
          display: block;
        }
        #tools-container i {
          display: block;
        }
        input[type="button"].selected {
          background-color: green;
        }
        #ruler {
          display: none;
          background: black;
          position: absolute;
          z-index: 6; 
          pointer-events: none;
        }
        #sampleRuler {
          display: none;
          overflow: hidden;
          position:relative;
          background:black;
          width:80%;
          margin:0 auto;
          height:2px;
          top:-10px;
        }
        .editOptions {
          display: none;
          padding: 5px;
        }
        .toggleEditType, #saveBtn {
          cursor: pointer;
        }
      </style>
      <div>
        <div id="tools-container">
          <p> You can zoom and pan when you are not drawing.</p>
          <label for="drawTool">Draw Columns
           <input type="checkbox" id="drawTool">
          </label>
          <label for="editTool">Make/Edit Lines
           <input type="checkbox" id="editTool">
          </label>
          <div class="editOptions">
            <i>
              * You must select a line.
              <br>
              * Splitting creates a new line under the selected line.
              <br>
              * Merging combines the selected line with the line underneath it.
            </i>
            <input type="button" class="toggleEditType" id="addLinesBtn" value="Add Lines" />
            <input type="button" class="toggleEditType" id="mergeLinesBtn" value="Merge Lines" />
          </div>
          <label> Remove Lines
           <input type="checkbox" id="eraseTool"> 
          </label>
          <label> Annotation Visibility
           <input type="checkbox" id="seeTool" checked> 
          </label>
          <input id="saveBtn" type="button" value="Save Annotations"/>
        </div>
        <div id="annotator-container"></div>
        <div id="ruler"></div>
        <span id="sampleRuler"></span>
      </div>`
    const drawTool = this.shadowRoot.getElementById("drawTool")
    const editTool = this.shadowRoot.getElementById("editTool")
    const eraseTool = this.shadowRoot.getElementById("eraseTool")
    const seeTool = this.shadowRoot.getElementById("seeTool")
    const saveButton = this.shadowRoot.getElementById("saveBtn")
    const addLinesBtn = this.shadowRoot.getElementById("addLinesBtn")
    const mergeLinesBtn = this.shadowRoot.getElementById("mergeLinesBtn")
    addLinesBtn.addEventListener("click", (e) => this.toggleAddLines(e))
    mergeLinesBtn.addEventListener("click", (e) => this.toggleMergeLines(e))
    drawTool.addEventListener("change", (e) => this.toggleDrawingMode(e))
    editTool.addEventListener("change", (e) => this.toggleEditingMode(e))
    eraseTool.addEventListener("change", (e) => this.toggleErasingMode(e))
    seeTool.addEventListener("change", (e) => this.toggleAnnotationVisibility(e))
    saveButton.addEventListener("click", (e) => this.saveAnnotations(e))
    this.shadowRoot.appendChild(osdScript)
    this.shadowRoot.appendChild(annotoriousScript)
  }

  async connectedCallback() {
    if (!this.#userForAnnotorious) {
      const tpenUserProfile = await User.fromToken(this.userToken).getProfile()
      // Whatever value is here becomes the value of 'creator' on the Annotations.
      this.#userForAnnotorious = tpenUserProfile.agent.replace("http://", "https://")
    }
    this.#annotationPageURI = TPEN.screen.pageInQuery
    if (!this.#annotationPageURI) {
      alert("You must provide a ?pageID=theid in the URL.  The value should be the URI of an existing AnnotationPage.")
      return
    }
    this.setAttribute("annotationpage", this.#annotationPageURI)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === oldValue || !newValue) return
    if (name === 'annotationpage') {
      this.processAnnotationPage(newValue)
    }
  }

  async render(resolvedCanvas) {
    this.shadowRoot.getElementById('annotator-container').innerHTML = ""
    const canvasID = resolvedCanvas["@id"] ?? resolvedCanvas.id
    const fullImage = resolvedCanvas?.items[0]?.items[0]?.body?.id
    const imageService = resolvedCanvas?.items[0]?.items[0]?.body?.service?.id
    if (!fullImage) {
      throw new Error("Cannot Resolve Canvas Image", { "cause": "The Image is 404 or unresolvable." })
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
    if (imageService) {
      const lastchar = imageService[imageService.length - 1]
      if (lastchar !== "/") imageService += "/"
      const info = await fetch(imageService + "info.json").then(resp => resp.json()).catch(err => { return false })
      if (info) imageInfo = info
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
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true
      },
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: true
      },
      gestureSettingsPen: {
        clickToZoom: false,
        dblClickToZoom: true
      },
      gestureSettingsUnknown: {
        clickToZoom: false,
        dblClickToZoom: true
      }
    })

    /**
     * An instance of an OpenSeaDragon Annotorious Annotation with customization options that help our desired
     * "draw new column", "chop and merge lines", "delete lines" UX.
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
    // This would change the color of drawn Annotations
    /*
    this.#annotoriousInstance.setStyle({
      fill: '#00ff00',
      fillOpacity: 0.25,
      stroke: '#00ff00',
      strokeOpacity: 1
    }
    */
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
     * Fired after a new annotation is created and available as a shape in the DOM.
     */
    annotator.on('createAnnotation', function(annotation) {
      // console.log("CREATE ANNOTATION")
      if (_this.#isDrawing) _this.#annotoriousInstance.cancelSelected()
      _this.applyCursorBehavior()
    })

    /**
     * Fired after a new annotation is resized DOM.
     */
    annotator.on('updateAnnotation', function(annotation) {
      // console.log("UPDATE ANNOTATION")
      _this.applyCursorBehavior()
    })

    /**
     * Fired after a click event on a drawn, unselected Annotation.
     * Supports Annotation removal.  If the interface is not erasing then nothing special should happen.
     */
    annotator.on('clickAnnotation', (originalAnnotation, originalEvent) => {
      // console.log("Annotorious clickAnnotation")
      if (!originalAnnotation) return
      if (_this.#isErasing) {
        setTimeout(() => {
          // Timeout required in order to allow the click-and-focus native functionality to complete.
          // Also stops the goofy UX for naturally slow clickers.
          let c = confirm("Are you sure you want to remove this?")
          if (c) {
            _this.#annotoriousInstance.removeAnnotation(originalAnnotation)
          } else {
            _this.#annotoriousInstance.cancelSelected()
          }
        }, 500)
      }
    })

    /**
     * Fired after a new set of Annotations is selected by clicking unselected Annotations.
     * It may be fired in tandem with clickAnnotation.
     * Supports line editing.  If the interface is not line editing then nothing special should happen.
     */
    annotator.on('selectionChanged', (annotations) => {
      let elem, cursorHandleElem
      if (annotations && annotations.length) {
        elem = this.#annotoriousInstance.viewer.element.querySelector(".a9s-annotation.selected")
        cursorHandleElem = this.#annotoriousInstance.viewer.element.querySelector(".a9s-shape-handle")
      } else {
        // This is a little race condition-y.  It removes the ruler during the split line process
        // Without it the ruler can be left behind when clearing all selections during line editing.
        // this.removeRuler()
      }
      if (!elem) return
      if (_this.#isErasing) {
        // Take over the cursor behavior b/c seeing the 'move' cursor is confusing
        elem.style.cursor = "default"
        cursorHandleElem.style.cursor = "default"
      }
      if (_this.#isLineEditing) {
        this.applyCursorBehavior()
      }
    })

    _this.onkeydown = function(evt) {
      evt = evt || window.event
      // Quit actions with escape key
      if (evt.key === "Escape") {
        evt.preventDefault()
        const drawTool = _this.shadowRoot.getElementById("drawTool")
        if (drawTool.checked) {
          drawTool.checked = false
          _this.stopDrawing()
        }
        const editTool = _this.shadowRoot.getElementById("editTool")
        if (editTool.checked) {
          editTool.checked = false
          _this.stopLineEditing()
        }
        const eraseTool = _this.shadowRoot.getElementById("eraseTool")
        if (eraseTool.checked) {
          eraseTool.checked = false
          _this.stopErasing()
        }
        _this.#annotoriousInstance.cancelSelected()
      }
    }

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
    if (!page) return
    this.#resolvedAnnotationPage = await fetch(page)
      .then(r => {
        if (!r.ok) throw r
        return r.json()
      })
      .catch(e => {
        throw e
      })
    const context = this.#resolvedAnnotationPage["@context"]
    if (!(context.includes("iiif.io/api/presentation/3/context.json") || context.includes("w3.org/ns/anno.jsonld"))) {
      console.warn("The AnnotationPage object did not have the IIIF Presentation API 3 context and may not be parseable.")
    }
    const id = this.#resolvedAnnotationPage["@id"] ?? this.#resolvedAnnotationPage.id
    if (!id) {
      throw new Error("Cannot Resolve AnnotationPage", { "cause": "The AnnotationPage is 404 or unresolvable." })
    }
    const type = this.#resolvedAnnotationPage["@type"] ?? this.#resolvedAnnotationPage.type
    if (type !== "AnnotationPage") {
      throw new Error(`Provided URI did not resolve an 'AnnotationPage'.  It resolved a '${type}'`, { "cause": "URI must point to an AnnotationPage." })
    }
    const targetCanvas = this.#resolvedAnnotationPage.target
    if (!targetCanvas) {
      throw new Error(`The AnnotationPage object did not have a target Canvas.  There is no image to load.`, { "cause": "AnnotationPage.target must have a value." })
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
    if (!canvas) return
    const resolvedCanvas = await fetch(canvas)
      .then(r => {
        if (!r.ok) throw r
        return r.json()
      })
      .catch(e => {
        throw e
      })
    const context = resolvedCanvas["@context"]
    if (!context.includes("iiif.io/api/presentation/3/context.json")) {
      console.warn("The Canvas object did not have the IIIF Presentation API 3 context and may not be parseable.")
    }
    const id = resolvedCanvas["@id"] ?? resolvedCanvas.id
    if (!id) {
      throw new Error("Cannot Resolve Canvas or Image", { "cause": "The Canvas is 404 or unresolvable." })
    }
    const type = resolvedCanvas["@type"] ?? resolvedCanvas.type
    if (type !== "Canvas") {
      throw new Error(`Provided URI did not resolve a 'Canvas'.  It resolved a '${type}'`, { "cause": "URI must point to a Canvas." })
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
  convertSelectors(annotations, bool = false) {
    if (this.#imageDims[0] === this.#canvasDims[0] && this.#imageDims[1] === this.#canvasDims[1]) return annotations
    if (!annotations || annotations.length === 0) return annotations
    let orig_xywh, converted_xywh = []
    let tar, sel = ""
    return annotations.map(annotation => {
      if (!annotation.target) return annotation
      if (bool) {
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
      } else {
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
    if (!this.#resolvedAnnotationPage) return
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
      const sel = "#" + annotation.target.selector.value.replace("pixel:", "")
      annotation.target = tar + sel
      annotation.motivation = "transcribing"
      // stop undefined from appearing on previously existing Annotations
      if (!annotation.creator) delete annotation.creator
      if (!annotation.modified) delete annotation.modified
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
    // Do we want to sort the Annotations in any way?  Annotorious may not have them in any particular order.
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
    if (Array.isArray(pageTarget)) {
      throw new Error(`The AnnotationPage object has multiple targets.  We cannot process this yet, and nothing will load.`, { "cause": "AnnotationPage.target is an Array." })
    }
    if (typeof pageTarget === "object") {
      // An embedded object, a referenced object, or a {source:"", selector:{}} object
      try {
        JSON.parse(JSON.stringify(target))
      } catch (err) {
        throw new Error(`The AnnotationPage target is not processable.`, { "cause": "AnnotationPage.target is not JSON." })
      }
      const tcid = pageTarget["@id"] ?? pageTarget.id ?? pageTarget.source
      if (!tcid) {
        throw new Error(`The target of the AnnotationPage does not contain an id.  There is no image to load.`, { "cause": "AnnotationPage.target must be a Canvas." })
      }
      // For now we don't trust the embedded Canvas and are going to take the id forward to resolve.
      canvasURI = tcid
    } else if (typeof pageTarget === "string") {
      // Just use it then
      canvasURI = pageTarget
    }

    let uricheck
    try {
      uricheck = new URL(canvasURI)
    } catch (_) {}
    if (!(uricheck?.protocol === "http:" || uricheck?.protocol === "https:")) {
      throw new Error(`AnnotationPage.target string is not a URI`, { "cause": "AnnotationPage.target string must be a URI." })
    }
    return canvasURI
  }

  toggleAddLines(e) {
    if (!this.#isLineEditing) return
    const ruler = this.shadowRoot.getElementById("ruler")
    if (e.target.classList.contains("selected")) {
      e.target.classList.remove("selected")
      this.#editType = ""
      ruler.style.display = "none"
    } else {
      this.shadowRoot.querySelectorAll(".toggleEditType").forEach(el => { el.classList.remove("selected") })
      e.target.classList.add("selected")
      this.#editType = "add"
      ruler.style.display = "block"
    }
  }

  toggleMergeLines(e) {
    if (!this.#isLineEditing) return
    this.removeRuler()
    if (e.target.classList.contains("selected")) {
      e.target.classList.remove("selected")
      this.#editType = ""
    } else {
      this.shadowRoot.querySelectorAll(".toggleEditType").forEach(el => { el.classList.remove("selected") })
      e.target.classList.add("selected")
      this.#editType = "merge"
      this.#annotoriousInstance.cancelSelected()
    }
  }

  toggleDrawingMode(e) {
    if (e.target.checked) this.startDrawing()
    else { this.stopDrawing() }
  }

  toggleEditingMode(e) {
    if (e.target.checked) this.startLineEditing()
    else { this.stopLineEditing() }
  }

  toggleErasingMode(e) {
    if (e.target.checked) this.startErasing()
    else { this.stopErasing() }
  }

  toggleAnnotationVisibility(e) {
    if (e.target.checked) this.showAnnotations()
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
    this.stopLineEditing()
    this.#isDrawing = true
    this.shadowRoot.getElementById("eraseTool").checked = false
    this.shadowRoot.getElementById("editTool").checked = false
    this.#annotoriousInstance.setDrawingEnabled(true)
    const toast = {
      message: "You started drawing columns",
      status: "info"
    }
    TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }
  s

  /**
   * Deactivate Annotorious annotation drawing mode.
   * This makes it so that the user can zoom and pan.
   */
  stopDrawing() {
    this.#isDrawing = false
    this.#annotoriousInstance.setDrawingEnabled(false)
    const toast = {
      message: "You stopped drawing columns",
      status: "info"
    }
    TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Activate Annotorious annotation chopping mode.
   * Clicking on an existing annotation will prompt the user about deleting the annotation.
   */
  startLineEditing() {
    this.stopDrawing()
    this.stopErasing()
    this.#isLineEditing = true
    this.shadowRoot.getElementById("eraseTool").checked = false
    this.shadowRoot.getElementById("drawTool").checked = false
    this.shadowRoot.querySelector(".editOptions").style.display = "block"
    this.shadowRoot.querySelectorAll(".toggleEditType").forEach(el => { el.classList.remove("selected") })
    this.#editType = ""
    const toast = {
      message: "You started line editing",
      status: "info"
    }
    TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Activate Annotorious annotation chopping mode.
   * Clicking on an existing annotation will prompt the user about deleting the annotation.
   */
  stopLineEditing() {
    this.#isLineEditing = false
    this.#editType = ""
    this.removeRuler()
    this.shadowRoot.querySelector(".editOptions").style.display = "none"
    this.shadowRoot.querySelectorAll(".toggleEditType").forEach(el => { el.classList.remove("selected") })
    const toast = {
      message: "You stopped line editing",
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
    this.stopLineEditing()
    this.#isErasing = true
    this.shadowRoot.getElementById("drawTool").checked = false
    this.shadowRoot.getElementById("editTool").checked = false
    this.#annotoriousInstance.cancelSelected()

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

  /**
   * Adds a line by splitting the current line where it was clicked.
   * The only DOM elem available in relation to Annotations is the selected line.
   */
  splitLine(event) {
    if (!this.#isLineEditing) return

    const annoElem = event.target
    // Note that if there is no selected line, there are no DOM elements representing Annotations. 
    if (!annoElem) return
    // Then we really should be able to get the selected annotation JSON from Annotorious
    let selectedAnnos = this.#annotoriousInstance.getSelected()
    const annoJsonToEdit = selectedAnnos ? selectedAnnos[0] : null
    if (!annoJsonToEdit) return
    let newAnnoObject = JSON.parse(JSON.stringify(annoJsonToEdit))
    const rect = annoElem.getBoundingClientRect()
    const annoDims = annoJsonToEdit.target.selector.value.replace("xywh=pixel:", "").split(",")
    let allAnnotations = this.#annotoriousInstance.getAnnotations()
    const compareId = annoJsonToEdit["@id"] ?? annoJsonToEdit.id
    let origIndex = -1
    let i = 0
    for (const a of allAnnotations) {
      const checkId = a["@id"] ?? a.id
      if (checkId === compareId) {
        origIndex = i
        break
      }
      i++
    }
    // Drawn Annotation dims represented as units, not pixels
    const annoY_units = rect.y
    const annoH_units = rect.height
    // Drawn Annotation dims represented as pixels, not units
    const annoY_pixels = parseFloat(annoDims[1])
    const annoH_pixels = parseFloat(annoDims[3])
    // Where the click happened in units relative to the height of the drawn Annotation's height in units
    const clickY_units = annoH_units - (event.offsetY - annoY_units)
    // Where the click happened, in pixels
    const clickY_pixels = annoH_pixels * (clickY_units / annoH_units) + annoY_pixels
    // Adjust the original Annotation's height (in pixels) to accomodate the split.  All other dimensions remain the same.
    let adjustedAnnoDims = [...annoDims]
    const annoH_pixels_adjusted = annoH_pixels - (clickY_pixels - annoY_pixels)
    adjustedAnnoDims[3] = annoH_pixels_adjusted + ""
    // Figure the new Annotation's height and y position (in pixels), relative to the original Annotation and the click event.
    let newAnnoDims = [...annoDims]
    const new_annoY_pixels = annoY_pixels + annoH_pixels_adjusted
    const new_annoH_pixels = annoH_pixels - annoH_pixels_adjusted
    newAnnoDims[1] = new_annoY_pixels + ""
    newAnnoDims[3] = new_annoH_pixels + ""
    // Replace original Annotation dimensions
    annoJsonToEdit.target.selector.value = `xywh=pixel:${adjustedAnnoDims.join()}`
    allAnnotations.splice(origIndex, 1, annoJsonToEdit)
    // Splice new Annotation data into original Annotation list
    newAnnoObject.id = Date.now() + ""
    newAnnoObject.target.selector.value = `xywh=pixel:${newAnnoDims.join()}`
    newAnnoObject.created = new Date().toJSON()
    allAnnotations.splice(origIndex + 1, 0, newAnnoObject)
    // Clear and redraw Annotations in the Annotorious UI
    this.#annotoriousInstance.removeAnnotation(compareId)
    this.#annotoriousInstance.addAnnotation(allAnnotations[origIndex])
    this.#annotoriousInstance.addAnnotation(allAnnotations[origIndex + 1])
    // Prepare UI for next click in chop mode by selecting the new Annotation
    this.#annotoriousInstance.setSelected(newAnnoObject.id)
  }

  /**
   * Reduces two lines to a single line by merging.
   * Lines will only be merged if they share the same x coordinate.
   * A line is always merged with the line underneath it.  
   */
  mergeLines(event) {
    if (!this.#isLineEditing) return
    let toast
    const annoElem = event.target
    // Note that if there is no selected line, there are no DOM elements representing Annotations. 
    if (!annoElem) return
    // Then we really should be able to get the selected annotation JSON from Annotorious
    let selectedAnnos = this.#annotoriousInstance.getSelected()
    const annoJsonToEdit = selectedAnnos ? selectedAnnos[0] : null
    if (!annoJsonToEdit) return
    let allAnnotations = this.#annotoriousInstance.getAnnotations()

    /**
     * The order of these Annotations is not guaranteed which messes up merge line.
     * These Annotations should be ordered by y then x.  Generally, this mocks a columnization order.
     * The reorder is only a helper for the logic here and does not persist or change the order in Annotorious.
     */
    allAnnotations.sort((a, b) => {
      const a_selector = a.target.selector.value.replace("xywh=pixel:", "").split(",")
      const b_selector = b.target.selector.value.replace("xywh=pixel:", "").split(",")
      return parseFloat(a_selector[1]) - parseFloat(b_selector[1])
    })
    allAnnotations.sort((a, b) => {
      const a_selector = a.target.selector.value.replace("xywh=pixel:", "").split(",")
      const b_selector = b.target.selector.value.replace("xywh=pixel:", "").split(",")
      return parseFloat(a_selector[0]) - parseFloat(b_selector[0])
    })
    const compareId = annoJsonToEdit["@id"] ?? annoJsonToEdit.id
    let origIndex = -1
    let i = 0
    for (const a of allAnnotations) {
      const checkId = a["@id"] ?? a.id
      if (checkId === compareId) {
        origIndex = i
        break
      }
      i++
    }
    const annoJsonToMergeIn = allAnnotations[origIndex + 1] ?? null
    // Can't merge with the line underneath it because there is no line underneath it
    if (!annoJsonToMergeIn) {
      toast = {
        message: "No line underneath",
        status: "error"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
      return
    }
    const annoDims = annoJsonToEdit.target.selector.value.replace("xywh=pixel:", "").split(",")
    const mergeIntoAnnoDims = annoJsonToMergeIn.target.selector.value.replace("xywh=pixel:", "").split(",")
    // Can only merge annotations that share the same x dimension
    if (annoDims[0] !== mergeIntoAnnoDims[0]) {
      toast = {
        message: "No line underneath",
        status: "error"
      }
      TPEN.eventDispatcher.dispatch("tpen-toast", toast)
      return
    }
    const nextId = annoJsonToMergeIn["@id"] ?? annoJsonToMergeIn.id
    let newAnnoObject = JSON.parse(JSON.stringify(annoJsonToEdit))
    // Make the original absorb the height of the line underneath it.
    const newAnnoHeight = parseFloat(annoDims[3]) + parseFloat(mergeIntoAnnoDims[3])
    // If the line underneath it was wider, take on that width
    const newAnnoWidth = parseFloat(annoDims[2]) < parseFloat(mergeIntoAnnoDims[2]) ? mergeIntoAnnoDims[2] : annoDims[2]
    const newAnnoDims = [annoDims[0], annoDims[1], newAnnoWidth + "", newAnnoHeight + ""]
    // Remove the Annotation underneath the selected Annotation
    allAnnotations.splice(origIndex + 1, 1)
    this.#annotoriousInstance.removeAnnotation(nextId)
    // Splice new Annotation data into original Annotation list
    newAnnoObject.id = Date.now() + ""
    newAnnoObject.target.selector.value = `xywh=pixel:${newAnnoDims.join()}`
    newAnnoObject.created = new Date().toJSON()
    allAnnotations.splice(origIndex, 1, newAnnoObject)
    // Clear and redraw Annotations in the Annotorious UI
    this.#annotoriousInstance.removeAnnotation(compareId)
    this.#annotoriousInstance.addAnnotation(newAnnoObject)
    // Prepare UI for next click in chop mode by selecting the new Annotation
    this.#annotoriousInstance.setSelected(newAnnoObject.id)
  }

  /**
   * Mouseover / mousemove needs to do the ruler UI
   */
  applyCursorBehavior() {
    const elem = this.#annotoriousInstance.viewer.element.querySelector(".a9s-annotation.selected")
    if (!elem) return
    const cursorHandleElem = this.#annotoriousInstance.viewer.element.querySelector(".a9s-shape-handle")
    const ruler = this.shadowRoot.getElementById("ruler")
    const _this = this
    let mouseStart = 0
    let mouseFinish = 0

    // Cursor support for editing options, applies when an Annotation is clicked and selected.
    if (this.#isLineEditing) {
      if (this.#editType === "add") {
        elem.style.cursor = "crosshair"
        cursorHandleElem.style.cursor = "crosshair"
      }
      if (this.#editType === "merge") {
        elem.style.cursor = "cell"
        cursorHandleElem.style.cursor = "cell"
      }
    } else {
      elem.style.cursor = "move"
      cursorHandleElem.style.cursor = "move"
    }

    // Further cursor support when user changes edit options while an Annotation is selected.
    elem.addEventListener('mouseenter', function(e) {
      if (_this.#isLineEditing) {
        if (_this.#editType === "add") {
          elem.style.cursor = "crosshair"
          cursorHandleElem.style.cursor = "crosshair"
        }
        if (_this.#editType === "merge") {
          elem.style.cursor = "cell"
          cursorHandleElem.style.cursor = "cell"
        }
      } else {
        elem.style.cursor = "move"
        cursorHandleElem.style.cursor = "move"
      }
    })

    // Instead of click use mousedown and mouseup to accomodate moving a column during line editing mode
    elem.addEventListener('mousedown', function(e) {
      mouseStart = [e.pageX, e.pageY]
    })

    // A click initiates a split or merge on the active line during line editing mode
    elem.addEventListener('mouseup', function(e) {
      mouseFinish = [e.pageX, e.pageY]
      if (mouseStart[0] !== mouseFinish[0] || mouseStart[1] !== mouseFinish[1]) return
      if (e.button !== 0) return
      _this.lineChange(e)
    })

    // Position the ruler element to be with the cursor
    elem.addEventListener('mousemove', function(e) {
      const rect = elem.getBoundingClientRect()
      ruler.style.left = rect.x + "px"
      ruler.style.top = e.pageY + "px"
      ruler.style.height = '1px'
      ruler.style.width = rect.width + "px"
    })

  }

  /*
   * Hides ruler within parsing tool. Called on mouseleave .parsing.
   */
  removeRuler() {
    const ruler = this.shadowRoot.getElementById("ruler")
    ruler.style.display = "none"
  }

  /**
   * Triggered when a user alters a line to either create a new one or destroy one with the mouseclick
   */
  lineChange(event) {
    if (!this.#isLineEditing) return
    if (this.#editType === "add") this.splitLine(event)
    if (this.#editType === "merge") this.mergeLines(event)
  }
}

customElements.define('tpen-line-parser', AnnotoriousAnnotator)