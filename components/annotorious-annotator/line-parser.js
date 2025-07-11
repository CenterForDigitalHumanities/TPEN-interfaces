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
import { decodeUserToken } from '../iiif-tools/index.js'
import CheckPermissions from '../check-permissions/checkPermissions.js'

class AnnotoriousAnnotator extends HTMLElement {
  #osd 
  #annotoriousInstance
  #annotoriousContainer
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

  constructor() {
    super()
    TPEN.attachAuthentication(this)
    this.attachShadow({ mode: 'open' })
  }

  // Custom component setup
  async connectedCallback() {
    // Must know the User
    if (!this.#userForAnnotorious) {
      const agent = decodeUserToken(this.userToken)['http://store.rerum.io/agent']
      if (!agent) {
        this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <h3>User Error</h3>
            <p>The user agent could not be detected or does not have access to this page.</p>
        `
        return
      }
      // Whatever value is here becomes the value of 'creator' on the Annotations.
      this.#userForAnnotorious = agent
    }
    // Must know the Project
    this.shadowRoot.innerHTML = "Loading the Annotator.  Please provide a ?projectID= in the URL."
    TPEN.eventDispatcher.on('tpen-project-loaded', (ev) => this.render())
    TPEN.eventDispatcher.on('tpen-project-load-failed', (err) => {
      this.shadowRoot.innerHTML = `
          <style>${this.style}</style>
          <h3>Project Error</h3>
          <p>The project you are looking for does not exist or you do not have access to it.</p>
          <p> ${err.detail.status}: ${err.detail.statusText} </p>
      `
    })
  }

  // Initialize HTML after loading in a TPEN3 Project
  render() {
    if (!CheckPermissions.checkAllAccess("line", "selector")) {
      this.shadowRoot.innerHTML = "You do not have the proper project permissions to use this interface."
      return
    }
    // Must have a Page _id to continue
    if (!TPEN.screen.pageInQuery) {
      const url = new URL(location.href)
      url.searchParams.set('pageID',TPEN.activeProject.getFirstPageID().split('/').pop())
      location.href = url.toString()
      return
    }
    this.#annotationPageURI = TPEN.screen.pageInQuery
    if (!this.#annotationPageURI) {
      this.shadowRoot.innerHTML = "You must provide a '?pageID=theid' in the URL.  The value should be the ID of an existing TPEN3 Page."
      return
    }
    const osdScript = document.createElement("script")
    osdScript.src = "./components/annotorious-annotator/OSD.min.js"
    const annotoriousScript = document.createElement("script")
    annotoriousScript.src = "./components/annotorious-annotator/AnnotoriousOSD.min.js"

    this.shadowRoot.innerHTML = `
      <style>
        @import "./components/annotorious-annotator/AnnotoriousOSD.min.css";
        #annotator-container {
          height: 90vh;
          background-image: url(https://t-pen.org/TPEN/images/loading2.gif);
          background-repeat: no-repeat;
          background-position: center;
        }
        #tools-container {
          background-color: lightgray;
          position: absolute;
          top: 40px;
          left: 5px;
          z-index: 10;
          padding: 0px 5px 5px 5px;
          width: 390px;
          border: 2px solid darkgray;
          border-radius: 5px;
          display: none;
        }
        #tools-container label {
          display: block;
          margin: 6px 0px;
        }
        #tools-container i {
          display: block;
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
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
        .toggleEditType {
          margin-top: 6px;
        }
        .toggleEditType, input[type="checkbox"], #saveBtn {
          cursor: pointer;
        }
        #saveBtn {
          background-color: var(--primary-color);
          text-transform: uppercase;
          outline: var(--primary-light) 1px solid;
          outline-offset: -3.5px;
          color: var(--white);
          border-radius: 5px;
          transition: all 0.3s;
          padding: 10px 20px;
          cursor: pointer;
          width: 100%;
          margin-top: 1em;
        }
        #saveBtn[disabled] {
          background-color: gray;
          color: white;
        }
        #saveBtn:hover {
          background-color: var(--primary-light);
          outline: var(--primary-color) 1px solid;
          outline-offset: -1.5px;
        }
        :focus-visible {
          outline: none !important;
          border: none !important;
        }
        label span {
          position: relative;
          display: inline-block;
          width: 90%;
        }
        .dragMe {
          position: absolute;
          top: -5px;
          cursor: grab;
          height: auto;
          width: auto;
        }

        .dragMe.leftside {
          left: 0
        }

        .dragMe.rightside {
          right: 0
        }

        .helperHeading {
          margin-top: 2em;
          text-align: center;
        }

        .helperText {
          font-size: 9pt;
          font-weight: bold;
        }

        .a9s-annotation.selected .a9s-inner {
          fill-opacity: 0.48 !important;
        }
      </style>
      <div>
        <div id="tools-container" class="card">
          <div class="dragMe leftside"><img draggable="false" src="../../assets/icons/grabspot.png" alt=""></div>
          <div class="dragMe rightside"><img draggable="false" src="../../assets/icons/grabspot.png" alt=""></div>
          <p class="helperHeading helperText"> You can zoom and pan when you are not drawing.</p>
          <label for="drawTool">
           <span>Draw Columns</span>
           <input type="checkbox" id="drawTool">
          </label>
          <label for="editTool">
           <span>Make/Edit Lines</span>
           <input type="checkbox" id="editTool">
          </label>
          <div class="editOptions">
            <i class="helperText">
              * You must select a line.
              <br>
              * Splitting creates a new line under the selected line.
              <br>
              * Merging combines the selected line with the line underneath it.
            </i>
            <input type="button" class="toggleEditType" id="addLinesBtn" value="Add Lines" />
            <input type="button" class="toggleEditType" id="mergeLinesBtn" value="Merge Lines" />
          </div>
          <label> 
           <span>Remove Lines</span>
           <input type="checkbox" id="eraseTool"> 
          </label>
          <label style="display:none;"> 
           <span>Annotation Visibility</span>
           <input type="checkbox" id="seeTool" checked> 
          </label>
          <input id="saveBtn" type="button" value="Save Annotations"/>
        </div>
        <div id="annotator-container"> Loading Annotorious and getting the TPEN3 Page information... </div>
        <div id="ruler"></div>
        <span id="sampleRuler"></span>
      </div>`
    this.#annotoriousContainer = this.shadowRoot.getElementById('annotator-container')
    const drawTool = this.shadowRoot.getElementById("drawTool")
    const editTool = this.shadowRoot.getElementById("editTool")
    const eraseTool = this.shadowRoot.getElementById("eraseTool")
    const seeTool = this.shadowRoot.getElementById("seeTool")
    const saveButton = this.shadowRoot.getElementById("saveBtn")
    const addLinesBtn = this.shadowRoot.getElementById("addLinesBtn")
    const mergeLinesBtn = this.shadowRoot.getElementById("mergeLinesBtn")
    const drag = this.shadowRoot.querySelectorAll(".dragMe")
    drag.forEach(elem => elem.addEventListener("mousedown", (e) => this.dragging(e)))
    addLinesBtn.addEventListener("click", (e) => this.toggleAddLines(e))
    mergeLinesBtn.addEventListener("click", (e) => this.toggleMergeLines(e))
    drawTool.addEventListener("change", (e) => this.toggleDrawingMode(e))
    editTool.addEventListener("change", (e) => this.toggleEditingMode(e))
    eraseTool.addEventListener("change", (e) => this.toggleErasingMode(e))
    seeTool.addEventListener("change", (e) => this.toggleAnnotationVisibility(e))
    saveButton.addEventListener("click", (e) => {
      this.#annotoriousInstance.cancelSelected()
      // Timeout required in order to allow the unfocus native functionality to complete for $isDirty.
      setTimeout(() => { this.saveAnnotations() }, 500)
    })

    // OSD and AnnotoriousOSD need some cycles to load, they are big files.
    this.shadowRoot.appendChild(osdScript)
    setTimeout(() => { 
      this.shadowRoot.appendChild(annotoriousScript)
      setTimeout(() => { 
        // Process the page to get the data required for the component UI
        this.processPage(this.#annotationPageURI)
      }, 200)
    }, 200)
  }

  /**
   * Resolve and process/validate a TPEN3 Page ID.
   * In order to show an Image the AnnotationPage must target a Canvas that has an Image annotated onto it.
   * Process the target, which can be a value of various types.
   * Pass along the string Canvas URI that relates to or is the direct value of the target.
   *
   * FIXME
   * Give users a path when AnnotationPage URIs do not resolve or resolve to something unexpected.
   *
   * @param page An AnnotationPage URI.  The AnnotationPage should target a Canvas.
   */
  async processPage(pageID) {
    if (!pageID) return
    // We want to use this URL instead of the RERUM URL to help with temp pages vs incorrect ids
    this.#resolvedAnnotationPage = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/page/${pageID.split("/").pop()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TPEN.getAuthorization()}`,
        }
      })
      .then(r => {
        if (!r.ok) throw r
        // resolve all the referenced Annotations in items:[]?
        return r.json()
      })
      .catch(e => {
        this.shadowRoot.innerHTML = `
        <style>${this.style}</style>
        <h3>Page Error</h3>
        <p>The Page you are looking for does not exist or you do not have access to it.</p>
        <p> ${e.status}: ${e.statusText} </p>
      `
        throw e
      })
    this.#resolvedAnnotationPage.$isDirty = false
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
    // Resolve any referenced items
    if (this.#resolvedAnnotationPage?.items && this.#resolvedAnnotationPage.items.length) {
      let i = -1
      for await (const anno_ref of this.#resolvedAnnotationPage.items) {
        i++
        if (anno_ref.hasOwnProperty("body")) continue
        const anno_res = await fetch(anno_ref.id).then(res => res.json()).catch(err => { throw err })
        this.#resolvedAnnotationPage.items[i] = anno_res
      }
    }
    // Note this will process the id from embedded Canvas objects to pass forward and be resolved.
    const canvasURI = this.processPageTarget(targetCanvas)
    // Process the Canvas to get the data for the component UI.
    this.processCanvas(canvasURI)
  }

  /**
   * Fetch a Canvas URI and check that it is a Canvas object.  Pass it forward to render the Image into the interface.
   * Be prepared to recieve presentation api 2+
   *
   * FIXME
   * Give users a path when Canvas URIs do not resolve or resolve to something unexpected.
   *
   * @param uri A String Canvas URI
   */
  async processCanvas(uri) {
    if (!uri) return
      // TODO Vault me?
    const resolvedCanvas = await fetch(uri)
      .then(r => {
        if (!r.ok) throw r
        return r.json()
      })
      .catch(e => {
        this.shadowRoot.innerHTML = `
          <style>${this.style}</style>
          <h3>Canvas Error</h3>
          <p>The Canvas within this Page could not be loaded.</p>
          <p> ${e.status ?? e.code}: ${e.statusText ?? e.message} </p>
        `
        throw e
      })
    const context = resolvedCanvas["@context"]
    if (!context?.includes("iiif.io/api/presentation/3/context.json")) {
      console.warn("The Canvas object did not have the IIIF Presentation API 3 context and may not be parseable.")
    }
    const id = resolvedCanvas["@id"] ?? resolvedCanvas.id
    if (!id) {
      throw new Error("Cannot Resolve Canvas or Image", { "cause": "The Canvas is 404 or unresolvable." })
    }
    const type = resolvedCanvas["@type"] ?? resolvedCanvas.type
    if (!(type === "Canvas" || type === "sc:Canvas")) {
      throw new Error(`Provided URI did not resolve a 'Canvas'.  It resolved a '${type}'`, { "cause": "URI must point to a Canvas." })
    }
    // Use the Annotations and Image on the Canvas for inititalizing the Annotorious portion of the component.
    this.loadAnnotorious(resolvedCanvas)
  }

  /**
   * The Project, User, Page, and Canvas data has been processed.
   * The UI is ready to try to load Annotorious and Annotorious listeners.
   *
   * @param resolveCanvas - Canvas JSON which includes the Image and any existing Annotations for Annotorious.
   */
  async loadAnnotorious(resolvedCanvas) {
    this.shadowRoot.getElementById('annotator-container').innerHTML = ""
    const canvasID = resolvedCanvas["@id"] ?? resolvedCanvas.id
    let fullImage = resolvedCanvas?.items?.[0]?.items?.[0]?.body?.id
    if (!fullImage) fullImage = resolvedCanvas?.images?.[0]?.resource?.["@id"]
    let imageService = resolvedCanvas?.items?.[0]?.items?.[0]?.body?.service?.id
    if (!imageService) imageService = resolvedCanvas?.images?.[0]?.resource?.service?.["@id"]
    if (!fullImage) {
      throw new Error("Cannot Resolve Canvas Image", { "cause": "The Image is 404 or unresolvable." })
    }
    let imgx = resolvedCanvas?.items?.[0]?.items?.[0]?.body?.width
    if (!imgx) imgx = resolvedCanvas?.images[0]?.resource?.width
    let imgy = resolvedCanvas?.items?.[0]?.items?.[0]?.body?.height
    if (!imgy) imgy = resolvedCanvas?.images?.[0]?.resource?.height
    this.#imageDims = [imgx, imgy]
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
    else {
      // If the simple image URL will not resolve, we will not be able to load.
      let resolvable = await fetch(fullImage, {"method":"HEAD"}).then(resp => {
        if (!resp.ok) {
          this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <h3>Image Error</h3>
            <p>The Image could not be loaded</p>
            <p> ${resp.status}: ${resp.statusText} </p>
          `
          return false
        }
        return true
      })
      .catch(err => {
        this.shadowRoot.innerHTML = `
          <style>${this.style}</style>
          <h3>Image Error</h3>
          <p>The Image could not be loaded</p>
          <p> ${err.status ?? err.code}: ${err.statusText ?? err.message} </p>
        `
        return false
      })
      if (!resolvable) return
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
      prefixUrl: "./interfaces/annotator/images/",
      showFullPageControl:false,
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
     * Make the page $isDirty so that it knows to save.
     */
    annotator.on('createAnnotation', function(annotation) {
      // console.log("CREATE ANNOTATION")
      if (_this.#isDrawing) _this.#annotoriousInstance.cancelSelected()
      _this.#annotoriousInstance.updateAnnotation(annotation)
      _this.#resolvedAnnotationPage.$isDirty = true
      _this.applyCursorBehavior()
    })

    /**
     * Fired after an annotation is resized or moved in the DOM, and focus is removed.
     * Make the page $isDirty so it knows to update.
     * Note this does not fire on a programmatic annotoriousInstance.updateAnnotation() call.
     */
    annotator.on('updateAnnotation', function(annotation) {
      // console.log("UPDATE ANNOTATION")
      _this.#annotoriousInstance.updateAnnotation(annotation)
      _this.#resolvedAnnotationPage.$isDirty = true
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
            _this.#resolvedAnnotationPage.$isDirty = true
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
        _this.removeRuler()
        return
      }
      if (_this.#isErasing) {
        // Take over the cursor behavior b/c seeing the 'move' cursor is confusing
        elem.style.cursor = "default"
        cursorHandleElem.style.cursor = "default"
      }
      if (_this.#isLineEditing && elem) {
        _this.applyCursorBehavior()
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
   * Format and pass along the Annotations from the provided AnnotationPage.
   * Annotorious will render them on screen and introduce them to the UX flow.
   */
  setInitialAnnotations() {
    if (!this.#resolvedAnnotationPage) {
      this.#annotoriousContainer.style.backgroundImage = "none"
      return
    }
    let allAnnotations = JSON.parse(JSON.stringify(this.#resolvedAnnotationPage.items))
    // Make sure Annotation targets and bodies are Annotorious friendly.
    allAnnotations = this.formatAnnotations(allAnnotations)
    // Convert the Annotation selectors so that they are relative to the Image dimensions
    allAnnotations = this.convertSelectors(allAnnotations, true)
    this.#annotoriousInstance.setAnnotations(allAnnotations, false)
    this.#annotoriousContainer.style.backgroundImage = "none"
    this.shadowRoot.getElementById("tools-container").style.display = "block"
  }

  /**
   * Format Annotation body and target properties so they are Annotorious friendly.
   * Otherwise Annotorious will not draw them in the UI.
   *
   * @param annotations - An Array of Annotations that may need to be formatted
   *
   * @return the Array of Annotations formatted for Annotorious
   */
  formatAnnotations(annotations) {
    if (!annotations || annotations.length === 0) return annotations
    let orig_xywh, converted_xywh = []
    return annotations.map(annotation => {
      if (!annotation.hasOwnProperty("target") || !annotation.hasOwnProperty("body")) return annotation
      if (typeof annotation.target === "string") {
        // This is probably a simplified fragment selector like uri#xywh= and Annotorious will not process it.
        const tarsel = annotation.target.split("#")
        if (tarsel && tarsel.length === 2) {
          if (!tarsel[1].includes("pixel:")) tarsel[1] = tarsel[1].replace("xywh=", "xywh=pixel:")
          annotation.target = {
            source: tarsel[0],
            selector: {
              conformsTo: "http://www.w3.org/TR/media-frags/",
              type: "FragmentSelector",
              value: tarsel[1]
            }
          }
        }
      }
      if (!Array.isArray(annotation.body)) {
        if (typeof annotation.body === "object") {
          annotation.body = (Object.keys(annotation.body).length > 0) ? [annotation.body] : []
        } else {
          // This is a malformed Annotation body!  What to do...
          annotation.body = [annotation.body]
        }
      }
      annotation.motivation ??= "transcribing"
      return annotation
    })
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
    // Don't need to convert if image and canvas dimensions are the same.
    if (this.#imageDims[0] === this.#canvasDims[0] && this.#imageDims[1] === this.#canvasDims[1]) return annotations
    if (!annotations || annotations.length === 0) return annotations
    let orig_xywh, converted_xywh = []
    let tar, sel = ""
    return annotations.map(annotation => {
      if (!annotation.target) return annotation
      orig_xywh = annotation.target.selector.value.replace("xywh=pixel:", "").split(",")
      if (bool) {
        /**
         * You are converting for Annotorious.  Selectors need to be changed to be relative to the Image dimensions.
         * This is so that they render correctly.  TPEN3 selectors are relative to the Canvas dimensions.
         * The target is in expanded Annotorious format. {source:"uri", selector:{value:"xywh="}}
         */
        converted_xywh[0] = parseFloat((this.#imageDims[0] / this.#canvasDims[0]) * parseFloat(orig_xywh[0]))
        converted_xywh[1] = parseFloat((this.#imageDims[1] / this.#canvasDims[1]) * parseFloat(orig_xywh[1]))
        converted_xywh[2] = parseFloat((this.#imageDims[0] / this.#canvasDims[0]) * parseFloat(orig_xywh[2]))
        converted_xywh[3] = parseFloat((this.#imageDims[1] / this.#canvasDims[1]) * parseFloat(orig_xywh[3]))
      } else {
        /**
         * You are converting for TPEN3.  Selectors need to be changed to be relative to the Canvas dimensions.
         * This is so that they save correctly.  Annotorious selectors are relative to the Image dimensions.
         * The target is in expanded Annotorious format. {source:"uri", selector:{value:"xywh="}}
         */
        converted_xywh[0] = parseFloat((this.#canvasDims[0] / this.#imageDims[0]) * parseFloat(orig_xywh[0]))
        converted_xywh[1] = parseFloat((this.#canvasDims[1] / this.#imageDims[1]) * parseFloat(orig_xywh[1]))
        converted_xywh[2] = parseFloat((this.#canvasDims[0] / this.#imageDims[0]) * parseFloat(orig_xywh[2]))
        converted_xywh[3] = parseFloat((this.#canvasDims[1] / this.#imageDims[1]) * parseFloat(orig_xywh[3]))
      }
      sel = "xywh=pixel:" + converted_xywh.join(",")
      annotation.target.selector.value = sel
      return annotation
    })
  }

  /**
   * Internal conversions may have caused selectors that are non-integer values.
   * The media frags spec notes that #xywh= values need to be integers.
   * Convert any floats encountered by rounding to the nearest integer.
   *
   * @param annotations - An Array of Annotations whose selectors may need rounded.
   *
   * @return the Array of Annotations with their selectors rounded
   */
  roundSelectors(annotations) {
    if (!annotations) return
    return annotations.map(annotation => {
      if (!annotation.target) return annotation
      let orig_xywh, rounded_xywh = []
      //The target is in expanded Annotorious format. {source:"uri", selector:{value:"xywh="}}
      orig_xywh = annotation.target.selector.value.replace("xywh=pixel:", "").split(",")
      rounded_xywh[0] = Math.round(parseFloat(orig_xywh[0]))
      rounded_xywh[1] = Math.round(parseFloat(orig_xywh[1]))
      rounded_xywh[2] = Math.round(parseFloat(orig_xywh[2]))
      rounded_xywh[3] = Math.round(parseFloat(orig_xywh[3]))
      const sel = "xywh=pixel:" + rounded_xywh.join(",")
      annotation.target.selector.value = sel
      return annotation
    })
  }

  /**
   * Annotorious causes some Annotation data fodder that we need to clean up.
   * It will add keys and give them the value: undefined.  We want to remove those keys.
   * Note that it will add those keys to the Annotation object as well as the embedded body object.
   *
   * @param annotations - An Array of Annotations whose selectors may need rounded.
   *
   * @return the Array of Annotations without any key: undefined values
   */
  cleanAnnotations(annotations) {
    if (!annotations) return
    return annotations.map(annotation => {
      let body = annotation.body.length ? annotation.body[0] : {}
      // clean out Annotorious
      delete body.created
      delete body.creator
      delete body.modified
      if(!body?.purpose) delete body.purpose
      annotation.body = Object.keys(body).length > 0 ? [body] : []
      if (!annotation?.creator) delete annotation.creator
      delete annotation.modified
      delete annotation.created
      return annotation
    })
  }

  /**
   * The order of these Annotations is not guaranteed.
   * These Annotations should be ordered by x then y.  Generally, this mocks a column design.
   *
   * @param annotations - An Array of Annotations that needs to be sorted.
   *
   * @return the Array of Annotations with their new sorted order
   */
  sortAnnotations(annotations) {
    return annotations.sort((a, b) => {
      const a_selector = a.target.selector.value.replace("xywh=pixel:", "").split(",")
      const b_selector = b.target.selector.value.replace("xywh=pixel:", "").split(",")
      if (parseFloat(a_selector[0]) < parseFloat(b_selector[0])) return -1
      if (parseFloat(a_selector[0]) > parseFloat(b_selector[0])) return 1
      if (parseFloat(a_selector[1]) < parseFloat(b_selector[1])) return -1
      if (parseFloat(a_selector[1]) > parseFloat(b_selector[1])) return 1
      return 0
    })
  }

  /**
   * This page renders because of a known AnnotationPage.  Existing Annotations in that AnnotationPage were drawn.
   * There have been edits to the page items and those edits need to be saved.
   * Announce the AnnotationPage with the changes that needs to be updated for processing upstream.
   */
  async saveAnnotations() {
    if (!this.#resolvedAnnotationPage.$isDirty) {
      TPEN.eventDispatcher.dispatch("tpen-toast", {
        message: "No changes to save",
        status: "info"
      })
      return
    }
    const saveButton = this.shadowRoot.getElementById("saveBtn")
    saveButton.setAttribute("disabled", "true")
    saveButton.value = "saving.  please wait..."
    let allAnnotations = this.#annotoriousInstance.getAnnotations()
    // Convert the Annotation selectors so that they are relative to the Canvas dimensions
    allAnnotations = this.convertSelectors(allAnnotations, false)
    // Round all selectors to integer values per media-frags spec
    allAnnotations = this.roundSelectors(allAnnotations)
    // Remove junk generated by Annotorious that we don't want to save
    allAnnotations = this.cleanAnnotations(allAnnotations)
    // Sort by x,y
    allAnnotations = this.sortAnnotations(allAnnotations)
    let page = JSON.parse(JSON.stringify(this.#resolvedAnnotationPage))
    page.items = allAnnotations
    const pageID = page["@id"] ?? page.id
    const mod = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/page/${pageID.split("/").pop()}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TPEN.getAuthorization()}`,
        },
        body: JSON.stringify({ "items": page.items })
      })
      .then(res => res.json())
      .catch(err => {
        saveButton.value = "ERROR"
        throw err
      })
    page.items = page.items.map(i => ({
      ...i,
      ...(mod.items?.find(a => a.target === i.target) ?? {})
    }))
    this.#modifiedAnnotationPage = page
    TPEN.eventDispatcher.dispatch("tpen-page-committed", this.#modifiedAnnotationPage)
    TPEN.eventDispatcher.dispatch("tpen-toast", {
      message: "Annotations Saved",
      status: "success"
    })
    saveButton.removeAttribute("disabled")
    saveButton.value = "Save Annotations"
    return this.#modifiedAnnotationPage
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
      if (this.#annotoriousInstance.getSelected().length) ruler.style.display = "block"
    }
  }

  toggleMergeLines(e) {
    if (!this.#isLineEditing) return
    this.removeRuler()
    if (e.target.classList.contains("selected")) {
      e.target.classList.remove("selected")
      this.#editType = ""
      const elem = this.#annotoriousInstance.viewer.element.querySelector(".a9s-annotation.selected")
      if (elem) elem.style.cursor = "move"
    } else {
      this.shadowRoot.querySelectorAll(".toggleEditType").forEach(el => { el.classList.remove("selected") })
      e.target.classList.add("selected")
      this.#editType = "merge"
      // Don't strictly HAVE to cancel, but it helps control the cursor.
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
  showAnnotations(toast_it = true) {
    this.#annotoriousInstance.setVisible(true)
    const toast = {
      message: "Annotations are visible",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Use Annotorious to hide all visible Annotations (except the one in focus, if any)
   * https://annotorious.dev/api-reference/openseadragon-annotator/#setvisible
   */
  hideAnnotations(toast_it = true) {
    this.#annotoriousInstance.setVisible(false)
    const toast = {
      message: "Annotations are hidden",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Activate Annotorious annotation drawing mode.
   * This makes it so the user cannot zoom and pan.
   */
  startDrawing(toast_it = true) {
    this.stopErasing(false)
    this.stopLineEditing(false)
    this.#isDrawing = true
    this.shadowRoot.getElementById("eraseTool").checked = false
    this.shadowRoot.getElementById("editTool").checked = false
    this.#annotoriousInstance.setDrawingEnabled(true)
    const toast = {
      message: "You started drawing columns",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Deactivate Annotorious annotation drawing mode.
   * This makes it so that the user can zoom and pan.
   */
  stopDrawing(toast_it = true) {
    this.#isDrawing = false
    this.#annotoriousInstance.setDrawingEnabled(false)
    const toast = {
      message: "You stopped drawing columns",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Activate Annotorious annotation chopping mode.
   * Clicking on an existing annotation will prompt the user about deleting the annotation.
   */
  startLineEditing(toast_it = true) {
    this.stopDrawing(false)
    this.stopErasing(false)
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
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Activate Annotorious annotation chopping mode.
   * Clicking on an existing annotation will prompt the user about deleting the annotation.
   */
  stopLineEditing(toast_it = true) {
    this.#isLineEditing = false
    this.#editType = ""
    this.removeRuler()
    this.shadowRoot.querySelector(".editOptions").style.display = "none"
    this.shadowRoot.querySelectorAll(".toggleEditType").forEach(el => { el.classList.remove("selected") })
    const toast = {
      message: "You stopped line editing",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Activate Annotorious annotation erasing mode.
   * Clicking on an existing annotation will prompt the user about deleting the annotation.
   */
  startErasing(toast_it = true) {
    this.stopDrawing(false)
    this.stopLineEditing(false)
    this.#isErasing = true
    this.shadowRoot.getElementById("drawTool").checked = false
    this.shadowRoot.getElementById("editTool").checked = false
    this.#annotoriousInstance.cancelSelected()
    const toast = {
      message: "You started erasing",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Deactivate Annotorious annotation erasing mode.
   * This allows user to zoom and pan, and select annotations to edit.
   */
  stopErasing(toast_it = true) {
    this.#isErasing = false
    const toast = {
      message: "You stopped erasing",
      status: "info"
    }
    if (toast_it) TPEN.eventDispatcher.dispatch("tpen-toast", toast)
  }

  /**
   * Get the amount the Annotorious container is offset from the top of the window, in units.
   * This typically helps account for the space that page headers take up.
   * Necessary to help adjust coordinates for accuracy while a user hovers or clicks during line parsing.
   */
  containerTopOffset() {
    if (!this.#annotoriousContainer) return 0
    const rect = this.#annotoriousContainer.getBoundingClientRect()
    if(!rect?.top) return 0
    return rect.top
  }

  /**
   * Get the amount the Annotorious container is offset from the left of the window, in units.
   * This helps account for any left side padding, margin, or text.
   * Necessary to help adjust coordinates for accuracy while a user hovers or clicks during line parsing.
   */
  containerLeftOffset() {
    if (!this.#annotoriousContainer) return 0
    const rect = this.#annotoriousContainer.getBoundingClientRect()
    if(!rect?.left) return 0
    return rect.left
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
    const origIndex = allAnnotations.findIndex((a) => {
      const checkId = a["@id"] ?? a.id
      return checkId === compareId
    })
    // Drawn Annotation dims represented as units, not pixels
    const annoY_units = rect.y - this.containerTopOffset()
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
    // This new Annotation should not have text.
    newAnnoObject.body = []
    allAnnotations.splice(origIndex + 1, 0, newAnnoObject)
    // Clear and redraw Annotations in the Annotorious UI
    this.#annotoriousInstance.removeAnnotation(compareId)
    this.#annotoriousInstance.addAnnotation(allAnnotations[origIndex])
    this.#annotoriousInstance.addAnnotation(allAnnotations[origIndex + 1])
    // Prepare UI for next click in chop mode by selecting the new Annotation
    this.#annotoriousInstance.setSelected(newAnnoObject.id)
    this.#resolvedAnnotationPage.$isDirty = true
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
     * These Annotations should be ordered by x then y.  Generally, this mocks a columnization order.
     * The reorder is only a helper for the logic here and does not persist or change the order in Annotorious.
     */
    allAnnotations = this.sortAnnotations(allAnnotations)

    const compareId = annoJsonToEdit["@id"] ?? annoJsonToEdit.id
    const origIndex = allAnnotations.findIndex((a) => {
      const checkId = a["@id"] ?? a.id
      return checkId === compareId
    })
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
    if (annoJsonToMergeIn.body.length) {
      // This new Annotation should combine any existing text from the Annotations merging together.
      let origText = annoJsonToEdit.body.length ? annoJsonToEdit.body[0]?.value : null
      let mergeInText = annoJsonToMergeIn.body[0]?.value ? " ¶" + annoJsonToMergeIn.body[0]?.value : null
      let lang = origText ? annoJsonToEdit.body[0]?.language : mergeInText ? annoJsonToMergeIn.body[0]?.language : null
      if (!lang) lang = "none"
      if (!origText) origText = ""
      if (!mergeInText) mergeInText = ""
      newAnnoObject.body = [{
        "type": "TextualBody",
        "value": origText + mergeInText,
        "format": "text/plain",
        "language": lang
      }]
    }
    allAnnotations.splice(origIndex, 1, newAnnoObject)
    // Clear and redraw Annotations in the Annotorious UI
    this.#annotoriousInstance.removeAnnotation(compareId)
    this.#annotoriousInstance.addAnnotation(newAnnoObject)
    // Prepare UI for next click in chop mode by selecting the new Annotation
    this.#annotoriousInstance.setSelected(newAnnoObject.id)
    this.#resolvedAnnotationPage.$isDirty = true
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
        ruler.style.display = "block"
      } else if (this.#editType === "merge") {
        elem.style.cursor = "cell"
        cursorHandleElem.style.cursor = "cell"
      } else {
        elem.style.cursor = "move"
        cursorHandleElem.style.cursor = "move"
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
        } else if (_this.#editType === "merge") {
          elem.style.cursor = "cell"
          cursorHandleElem.style.cursor = "cell"
        } else {
          elem.style.cursor = "move"
          cursorHandleElem.style.cursor = "move"
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
      ruler.style.left = (rect.x - _this.containerLeftOffset()) + "px"
      ruler.style.top = (e.pageY - _this.containerTopOffset() - window.scrollY) + "px"
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

  /*
   * Make parsing options draggable
   * https://www.w3schools.com/howto/howto_js_draggable.asp
   */
  dragging(ev) {
    ev = ev || window.event
    let pos1 = 0, pos2 = 0, pos3 =  ev.clientX, pos4 = ev.clientY
    let containerElem = this.shadowRoot.getElementById("tools-container")
    ev.preventDefault()
    document.onmouseup = closeDragElement
    document.onmousemove = elementDrag
    let grabber = ev.target
    grabber.style.cursor = "grabbing"
    containerElem.style.boxShadow = "0px 0px 20px black"

    function elementDrag(e) {
      e = e || window.event
      e.preventDefault()
      pos1 = pos3 - e.clientX
      pos2 = pos4 - e.clientY
      pos3 = e.clientX
      pos4 = e.clientY
      containerElem.style.top = (containerElem.offsetTop - pos2) + "px"
      containerElem.style.left = (containerElem.offsetLeft - pos1) + "px"
    }

    function closeDragElement(e) {
      e = e || window.event
      grabber.style.cursor = "grab"
      containerElem.style.boxShadow = "none"
      document.onmouseup = null
      document.onmousemove = null
    }
  }

}

customElements.define('tpen-line-parser', AnnotoriousAnnotator)
