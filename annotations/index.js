document.addEventListener("DOMContentLoaded", () => {
  const imageUpload = document.getElementById("imageUpload")
  const imageContainer = document.getElementById("imageContainer")
  const uploadedImage = document.getElementById("uploadedImage")
  const drawTool = document.getElementById("drawTool")
  const eraseTool = document.getElementById("eraseTool")
  let isDrawing = false
  let startX = 0
  let startY = 0
  let currentRectangle

  imageUpload.addEventListener("change", handleImageUpload)
  imageContainer.addEventListener("mousedown", switchOperation) 
  imageContainer.addEventListener("mouseup", endDrawing)

  drawTool.addEventListener("change", toggleDrawingMode)
  eraseTool.addEventListener("change", toggleEraseMode)

  function handleImageUpload(event) {
   // this function is just for testing while Services is discnonnected. It will be replaced by one that just places an image on the canvas.
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = function (e) {
        uploadedImage.src = e.target.result
        fetchRectangleData()
      }
      reader.readAsDataURL(file)
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
    const rect = uploadedImage.getBoundingClientRect()
    startX = ((event.clientX - rect.left) / rect.width) * 100
    startY = ((event.clientY - rect.top) / rect.height) * 100
    currentRectangle = document.createElement("div")
    currentRectangle.classList.add("rectangle") 
    imageContainer.appendChild(currentRectangle) 
    imageContainer.addEventListener("mousemove", drawRectangle)
  }

  function drawRectangle(event) {
    if (!isDrawing || !drawTool.checked) return
    updateRectangleSize(event)
  }

  function endDrawing() {
    if (!currentRectangle) return
    isDrawing = false
    currentRectangle.classList.add("drawn-shape") 
  }

  function updateRectangleSize(event) {
    if (!currentRectangle) return
    const rect = uploadedImage.getBoundingClientRect()
    const currentX = ((event.clientX - rect.left) / rect.width) * 100
    const currentY = ((event.clientY - rect.top) / rect.height) * 100
    const width = currentX - startX
    const height = currentY - startY
    currentRectangle.style.width = Math.abs(width) + "%"
    currentRectangle.style.height = Math.abs(height) + "%"
    currentRectangle.style.left = (width >= 0 ? startX : startX + width) + "%"
    currentRectangle.style.top = (height >= 0 ? startY : startY + height) + "%"
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

  function fetchRectangleData() {
     fetch("https://baseURL/rectangle")
      .then((response) => response.json())
      .then((rectData) => {

       if(rectData.length){
        rectData.map((data)=>{
         const rect = document.createElement("div")
          rect.classList.add("rectangle")
          rect.style.left = data.left
          rect.style.top = data.top
          rect.style.width = data.width
          rect.style.height = data.height
          rect.style.border = "2px solid grey"
          imageContainer.appendChild(rect)
        })
       } 
      })
      .catch((error) => {
        console.error("Error:", error)
      })
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
})
