class TranscriptionBlock extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: "open"})

    const container = document.createElement("div")
    container.setAttribute("id", "input-block")

    const dragHandle = document.createElement("div")
    dragHandle.setAttribute("id", "drag-handle")
    const dragIcon = document.createElement("img")
    dragIcon.classList.add("dragIcon")
    dragIcon.src = "../../assets/icons/drag_vertical.png"
    dragIcon.draggable = false
    dragHandle.append(dragIcon)
    container.append(dragHandle)

    const textarea = document.createElement("textarea")
    textarea.setAttribute("id", "transcription-input")
    textarea.setAttribute("rows", "3")
    textarea.setAttribute("placeholder", "Transcribe here...")

    const controls = document.createElement("div")
    controls.classList.add("controls")

    const prevButton = document.createElement("button")
    prevButton.setAttribute("id", "prev-line")
    prevButton.innerText = "Prev"

    const nextButton = document.createElement("button")
    nextButton.setAttribute("id", "next-line")
    nextButton.innerText = "Next"

    controls.append(prevButton, nextButton)
    container.append(textarea, controls)

    const style = document.createElement("style")
    style.textContent = `
       #input-block {
         position: absolute;
         top: 10px;
         left: 0;
         right: 0;
         min-height: 100px;
         display: flex;
         flex-direction: column;
         background: rgba(255, 255, 255, 0.9);
         box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
         border-radius: 8px;
         padding: 5px 10px;  
         box-sizing:border-box;
       }
       #transcription-input {
         box-sizing:border-box;
         width: 100%;
         padding: 10px;
         font-size: 16px;
         margin-bottom: 10px;
         resize:vertical;
       }
       .controls {
         display: flex;
         justify-content: space-between;
         align-items: center;
       }
       #prev-line, #next-line {
         padding: 5px 10px;
         font-size: 14px;
         cursor: pointer;
       }
       #drag-handle {
         cursor: grab;
         user-select: none;
         display:flex;
         justify-content:flex-end; 
         margin-bottom:10px;
       }
      .dragIcon{
         width:20px;
         height:20px;
         object-fit:contain;
      }
     `

    this.shadowRoot.append(style, container)

    this.currentLineIndex = 0
    this.isDragging = false
    this.startY = 0
    this.startTop = 0

    this.textarea = textarea
    this.prevButton = prevButton
    this.nextButton = nextButton
    this.dragHandle = dragHandle
    this.inputBlock = container
  }

  connectedCallback() {
    this.nextButton.addEventListener("click", this.moveToNextLine.bind(this))
    this.prevButton.addEventListener("click", this.moveToPrevLine.bind(this))
    this.dragHandle.addEventListener("mousedown", this.startDragging.bind(this))
    document.addEventListener("mousemove", this.drag.bind(this))
    document.addEventListener("mouseup", this.stopDragging.bind(this))
  }

  moveToNextLine() {
    this.currentLineIndex++
    this.moveToLine(this.currentLineIndex)
  }

  moveToPrevLine() {
    if (this.currentLineIndex > 0) {
      this.currentLineIndex--
      this.moveToLine(this.currentLineIndex)
    }
  }

  moveToLine(index) {
    const lineHeight = 50 // To be adjusted
    const newTop = index * lineHeight
    this.inputBlock.style.top = `${newTop}px`
  }

  startDragging(e) {
    this.isDragging = true
    this.startY = e.clientY
    this.startTop = this.inputBlock.offsetTop
    this.inputBlock.style.cursor = "grabbing"
  }

  drag(e) {
    if (!this.isDragging) return
    const deltaY = e.clientY - this.startY
    const newTop = Math.max(0, this.startTop + deltaY)
    this.inputBlock.style.top = `${newTop}px`
  }

  stopDragging() {
    this.isDragging = false
    this.inputBlock.style.cursor = "grab"
  }

  disconnectedCallback() {
    this.nextButton.removeEventListener("click", this.moveToNextLine)
    this.prevButton.removeEventListener("click", this.moveToPrevLine)
    this.dragHandle.removeEventListener("mousedown", this.startDragging)
    document.removeEventListener("mousemove", this.drag)
    document.removeEventListener("mouseup", this.stopDragging)
  }
}

customElements.define("transcription-block", TranscriptionBlock)
