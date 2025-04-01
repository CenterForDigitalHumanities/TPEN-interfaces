import TPEN from "../../api/TPEN.js"

class ManagePages extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.connectedCallback())
    }

    connectedCallback() {
        const layers = TPEN.activeProject.layers
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

                layerCardOuter.querySelector(".layer-pages").classList.add("layer-container")
                layerCardOuter.querySelectorAll(".layer-page")
                .forEach(el => { 
                    el.classList.add("layer-card")
                    el.setAttribute("draggable", "true")}
                )

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
                saveButton.innerText = "Save"
                layerCardOuter.querySelector(".layer-actions").insertBefore(saveButton, layerCardOuter.querySelector(".layer-actions").firstChild)
                layerCardOuter.querySelector(".layer-actions").removeChild(layerCardOuter.querySelector("tpen-manage-pages"))
                this.rearrangePages(layerIndex, layerCardOuter)

                editButton.addEventListener("click", () => {
                    labelDiv.querySelector(".layer-label").remove()
                    editButton.remove()

                    const labelInput = document.createElement("input")
                    labelInput.type = "text"
                    labelInput.className = "label-input"
                    labelInput.value = layers[layerIndex].label
                    labelInput.dataset.index = layerIndex
                    labelInput.dataset.layerId = layerId
                    labelDiv.insertAdjacentElement("afterbegin", labelInput)

                    const saveLabelButton = document.createElement("button")
                    saveLabelButton.className = "layer-btn save-label"
                    saveLabelButton.style.marginTop = "0"
                    saveLabelButton.dataset.index = layerIndex
                    saveLabelButton.dataset.layerId = layerId
                    saveLabelButton.innerText = "Save"
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
                    const pageIds = layers[layerIndex].pages.map((page) => page["@id"] ?? page.id)

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

    rearrangePages(layerIndex, layerCardOuter) {
        const layers = TPEN.activeProject.layers
        const cards = layerCardOuter.querySelectorAll(".layer-card")
        let layer = layers[layerIndex]

        cards.forEach((card) => {
            card.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("text/plain", card.dataset.index)
                card.style.border = "none"
            })

            card.addEventListener("dragend", () => {
                cards.forEach((card) => card.style.opacity = "1")
            })

            card.addEventListener("dragover", (event) => {
                event.preventDefault()
            })

            card.addEventListener("dragleave", () => {
            })

            card.addEventListener("drop", (event) => {
                event.preventDefault()
                const draggedIndex = event.dataTransfer.getData("text/plain")
                const targetIndex = card.dataset.index

                if (draggedIndex !== targetIndex) {
                    const draggedPage = layer.pages[draggedIndex]
                    const targetPage = layer.pages[targetIndex]
                    layer.pages[draggedIndex] = targetPage
                    layer.pages[targetIndex] = draggedPage
                    let temp = cards[targetIndex].textContent
                    cards[targetIndex].textContent = cards[draggedIndex].textContent
                    cards[draggedIndex].textContent = temp
                    layers[layerIndex] = layer
                }
                card.style.border = "none"
            })
        })
    }
}

customElements.define("tpen-manage-pages", ManagePages)
