async function loadCanvas(event) {
  const canvas = canvasURI.value
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
  document.getElementById('annotator-container').setAttribute("canvas", canvas)
  render(image, canvas)
}

function render(image, canvas){
  // Full example, may be a bit extra
  // let viewer = OpenSeadragon({
  //   element: document.getElementById('annotator-container'),
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



 let viewer = OpenSeadragon({
    element: document.getElementById('annotator-container'),
    tileSources: {
      type: 'image',
      url: image
    }
  })

  // https://annotorious.dev/api-reference/openseadragon-annotator/
  // let anno = OpenSeadragon.Annotorious(viewer);
  let anno = AnnotoriousOSD.createOSDAnnotator(viewer, {
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

  // Listeners for Annotorious Annotation interactions.  We can add TPEN Services interactions here.

  // Need to implement the Line Chopper UI on an existing 'column designation' on existing Annotations in the UI.
  anno.on('clickAnnotation', (annotation, originalEvent) => {
    console.log('Annotation clicked: ' + annotation.id);
  })

  anno.on('mouseEnterAnnotation', (annotation) => {
    console.log('Mouse entered: ' + annotation.id)
  })

  /**
    * Fired when the set of selected annotation changes. For future compatibility, the argument is an array. 
    * However, only single annotation will be returned currently.
    * When the user de-selects an annotation, the event will be fired with an empty array.
  */
  anno.on('selectionChanged', (annotations) => {
    console.log('Selected annotations', annotations)
  })

  /**
    * Fired when the set of annotations visible in the current viewport changes.
    * This event is only available on the OpenSeadragonAnnotator and will respond to zooming and panning 
    * of the OpenSeadragon image.
  */
  anno.on('viewportIntersect', (annotations) => {
    console.log('Annotations in viewport', annotations)
  })

  anno.on('mouseLeaveAnnotation', (annotation) => {
    console.log('Mouse left: ' + annotation.id)
  })
  
  anno.on('createAnnotation', function(annotation) {
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