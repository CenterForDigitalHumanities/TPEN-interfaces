import TPEN from "../../api/TPEN.js"

class ManagePages extends HTMLElement {
    #layers = TPEN.activeProject.layers
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.connectedCallback())
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                .layer-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 100%;
                    margin: 0 auto;
                }
                .layer-card, .layer-card-outer {
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    padding: 15px;
                    border-left: 5px solid #007bff;
                    cursor: move;
                    user-select: none;
                    margin: 0 auto;
                    width: 60%;
                    text-align: center;
                }
                .label-input {
                    width: 70%;
                    padding: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                .layer-page {
                    margin: 0 auto;
                    font-size: 14px;
                }
                .layer-actions {
                    display: flex;
                    justify-content: flex-end;
                    width: 100%;
                    gap: 10px;
                }
                .layer-label-div {
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .layer-btn {
                    margin-top: 10px;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .manage-pages {
                    background: #007bff;
                    color: white;
                    width: 100%;
                }
                .manage-pages:hover {
                    background: #0069d9;
                }
                .edit-pages {
                    background: #ffc107;
                    color: white;
                }
                .save-label {
                    background: #007bff;
                    color: white;
                }
            </style>
            <button class="layer-btn manage-pages">Manage Pages</button>
        `
        this.shadowRoot.querySelectorAll(".manage-pages").forEach((button) => {
            button.addEventListener("click", async () => {
                const buttonParent = button.getRootNode().host
                const mainParent= buttonParent.getRootNode().host
                const layerIndex = buttonParent.getAttribute("data-index")
                const layerId = buttonParent.getAttribute("data-layer-id")
                const layer_id = layerId.substring(layerId.lastIndexOf("/") + 1)
                const layerCardOuter = mainParent.shadowRoot.querySelector(`.layer-card-outer[data-index="${layerIndex}"]`)

                const layerActions = layerCardOuter.querySelector(".layer-actions")
                layerActions.classList.add("layer-actions-margin")

                layerCardOuter.querySelector(".layer-pages").classList.add("layer-container")
                let layerCard = layerCardOuter.querySelectorAll(".layer-page")
                layerCard
                .forEach(el => { 
                    el.classList.add("layer-card", "layer-card-flex")
                    el.setAttribute("draggable", "true")

                    el.addEventListener("dragstart", (event) => {
                        event.dataTransfer.setData("text/plain", el.dataset.index)
                        el.style.border = "none"
                    })
        
                    el.addEventListener("dragend", () => {
                        layerCard.forEach((el) => el.style.opacity = "1")
                    })
        
                    el.addEventListener("dragover", (event) => {
                        event.preventDefault()
                    })
        
                    el.addEventListener("dragleave", () => {
                    })
        
                    el.addEventListener("drop", (event) => {
                        event.preventDefault()
                        const draggedIndex = event.dataTransfer.getData("text/plain")
                        const targetIndex = el.dataset.index
        
                        if (draggedIndex !== targetIndex) {
                            const draggedPage = this.#layers[layerIndex].pages[draggedIndex]
                            const targetPage = this.#layers[layerIndex].pages[targetIndex]
                            this.#layers[layerIndex].pages[draggedIndex] = targetPage
                            this.#layers[layerIndex].pages[targetIndex] = draggedPage
                            let temp = layerCard[targetIndex].querySelector(".page-id").textContent
                            layerCard[targetIndex].querySelector(".page-id").textContent = layerCard[draggedIndex].querySelector(".page-id").textContent
                            layerCard[draggedIndex].querySelector(".page-id").textContent = temp
                        }
                        el.style.border = "none"
                    })

                    const deleteButton = document.createElement("button")
                    deleteButton.className = "layer-btn delete-page"
                    deleteButton.dataset.index = layerIndex
                    deleteButton.dataset.layerId = layerId
                    deleteButton.innerText = "Delete"
                    el.insertBefore(deleteButton, el.lastChild).insertAdjacentElement("afterend", deleteButton)

                    deleteButton.addEventListener("click", () => {
                        layerCardOuter.querySelector(".layer-pages").removeChild(el)
                        this.#layers[layerIndex].pages.splice(el.dataset.index, 1)
                        mainParent.shadowRoot.querySelectorAll(`.layer-card-outer[data-index="${layerIndex}"] .layer-page`).forEach((card, newIndex) => {
                            card.dataset.index = newIndex
                        })
                        layerCard = mainParent.shadowRoot.querySelectorAll(`.layer-card-outer[data-index="${layerIndex}"] .layer-page`)
                    })
                })

                const labelDiv = layerCardOuter.querySelector(".layer-label-div")
                labelDiv.style.display = "flex"

                const editButton = document.createElement("button")
                editButton.className = "layer-btn edit-pages"
                editButton.style.marginTop = "0"
                editButton.dataset.index = layerIndex
                editButton.dataset.layerId = layerId
                editButton.innerText = "Edit"
                layerCardOuter.querySelector(".layer-label").insertAdjacentElement("afterend", editButton)

                const saveButton = document.createElement("button")
                saveButton.className = "layer-btn save-pages"
                saveButton.dataset.index = layerIndex
                saveButton.dataset.layerId = layerId
                saveButton.innerText = "Save Pages"
                layerActions.insertBefore(saveButton, layerActions.firstChild)
                layerActions.removeChild(layerCardOuter.querySelector("tpen-manage-pages"))

                editButton.addEventListener("click", () => {
                    labelDiv.querySelector(".layer-label").remove()
                    editButton.remove()

                    const labelInput = document.createElement("input")
                    labelInput.type = "text"
                    labelInput.className = "label-input"
                    labelInput.value = this.#layers[layerIndex].label
                    labelInput.dataset.index = layerIndex
                    labelInput.dataset.layerId = layerId
                    labelDiv.insertAdjacentElement("afterbegin", labelInput)

                    const saveLabelButton = document.createElement("button")
                    saveLabelButton.className = "layer-btn save-label"
                    saveLabelButton.style.marginTop = "0"
                    saveLabelButton.dataset.index = layerIndex
                    saveLabelButton.dataset.layerId = layerId
                    saveLabelButton.innerText = "Save Label"
                    labelInput.insertAdjacentElement("afterend", saveLabelButton)

                    saveLabelButton.addEventListener("click", () => {
                        fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer/${layer_id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${TPEN.getAuthorization()}`,
                            },
                            body: JSON.stringify({
                                label : labelInput.value
                            })
                        })
                        .then(response => {
                            return TPEN.eventDispatcher.dispatch("tpen-toast", 
                            response.ok ? 
                                { status: "info", message: 'Successfully Updated Layer Label' } : 
                                { status: "error", message: 'Error Updating Layer Label' }
                            )
                        })
                    })
                })
                    
                saveButton.addEventListener("click", () => {
                    const pageIds = this.#layers[layerIndex].pages.map((page) => page.id)

                    fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer/${layer_id}/pages`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${TPEN.getAuthorization()}`,
                        },
                        body: JSON.stringify({
                            pages: pageIds
                        }),
                    })
                    .then(response => {
                        return TPEN.eventDispatcher.dispatch("tpen-toast", 
                        response.ok ? 
                            { status: "info", message: 'Successfully Updated Layer' } : 
                            { status: "error", message: 'Error Updating Layer' }
                        )
                    })
                })
            })
        })
    }
}

customElements.define("tpen-manage-pages", ManagePages)
