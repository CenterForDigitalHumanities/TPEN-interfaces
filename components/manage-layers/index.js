import TPEN from "../../api/TPEN.js"

class ProjectLayers extends HTMLElement {
    canvases = []
    layers = []
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    render() {
        const layers = TPEN.activeProject.layers
        this.shadowRoot.innerHTML = `
            <style>
                .layer-title {
                    text-align: center;
                    margin: 10px 0;
                    font-size: 20px;
                    color: #007bff;
                    font-weight: bold;
                    text-transform: uppercase;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
                    padding: 20px;
                }
                .layer-container, .layer-container-outer {
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
                .layer-div {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 80%;
                    margin: 0 auto;
                }
                .layer-div input {
                    width: 70%;
                    padding: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                .layer-btn {
                    margin-top: 10px;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .delete-layer {
                    background: #dc3545;
                    color: white;
                    width: 20%;
                }
                .delete-layer:hover {
                    background: #c82333;
                }
                .manage-pages {
                    background: #007bff;
                    color: white;
                    width: 20%;
                }
                .manage-pages:hover {
                    background: #0069d9;
                }
                .add-layer {
                    background: #28a745;
                    color: white;
                    width: 20%;
                }
                .add-layer:hover {
                    background: #1e7e34;
                }
            </style>

            <h1 class="layer-title">Add Layers</h1>
            <div class="layer-div">
                <div>
                    <label for="layerLabel">Label:</label>
                    <input type="text" id="layerLabel" placeholder="Layer Label">
                </div>
                <button class="layer-btn add-layer">Add Layer</button>
            </div>
            
            <h1 class="layer-title">Manage Layers</h1>
            <div class="layer-container-outer">
            ${layers
                .map(
                    (layer, layerIndex) => `
                    <div class="layer-card-outer" data-index="${layerIndex}" style="cursor:default;}">
                        <p><strong>Layer ID:</strong> ${layer["@id"] ?? layer.id}</p>
                        ${layer.label ? `<p><strong>Label:</strong> ${layer.label.none}</p>` : ``}
                        <div class="layer-pages">
                        ${(layer.pages ?? layer.items)
                            .map(
                                (page, pageIndex) =>
                                    `<p class="layer-page" data-index="${pageIndex}">${page["@id"] ?? page.id ?? page.map((page) => page["@id"] ?? page.id )}</p>`
                                )
                            .join("")}
                        </div>
                        ${(String(layer.id) ?? String(layer["@id"])).includes("https") ?
                        `<div class="layer-actions">
                            <button class="layer-btn manage-pages" data-index="${layerIndex}" data-layer-id="${layer["@id"] ?? layer.id}">Manage Pages</button>
                            <button class="layer-btn delete-layer" data-index="${layerIndex}" data-layer-id="${layer["@id"] ?? layer.id}">Delete Layer</button>
                        </div>`
                        : ``}
                    </div>`
                )
                .join("")}     
            </div>
        `
        this.layers = TPEN.activeProject.layers
        this.shadowRoot.querySelectorAll(".manage-pages").forEach((button) => {
            button.addEventListener("click", async (event) => {
                this.shadowRoot.querySelector(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .layer-pages`).classList.add("layer-container")
                this.shadowRoot.querySelectorAll(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .layer-page`)
                .forEach(el => { 
                    el.classList.add("layer-card")
                    el.setAttribute("draggable", "true")}
                )
                const saveButton = document.createElement("button")
                saveButton.setAttribute("class", "layer-btn save-pages")
                saveButton.setAttribute("data-index", event.target.getAttribute("data-index"))
                saveButton.setAttribute("data-layer-id", event.target.getAttribute("data-layer-id"))
                saveButton.innerText = "Save"
                this.shadowRoot.querySelector(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .layer-actions`).insertBefore(saveButton, this.shadowRoot.querySelector(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .layer-actions`).firstChild)
                this.shadowRoot.querySelector(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .layer-actions`).removeChild(this.shadowRoot.querySelector(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .manage-pages`))
                const layerIndex = event.target.getAttribute("data-index")
                this.rearrangePages(layerIndex)

                this.shadowRoot.querySelector(`.layer-card-outer[data-index="${event.target.getAttribute("data-index")}"] .layer-actions .save-pages`)
                .addEventListener("click", async (event) => {
                    const url = event.target.getAttribute("data-layer-id")
                    const layerId = url.substring(url.lastIndexOf("/") + 1)
                    const pageIds = this.layers[layerIndex].items.map((page) => page["@id"] ?? page.id)
                    await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer/${layerId}/pages`, {
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
                        const toast = new CustomEvent('tpen-toast', {
                        detail: {
                            message: (response.ok) ? 'Successfully updated layer' : 'Error updating layer',
                            status: (response.ok) ? 200 : 500
                            }
                        })
                        return TPEN.eventDispatcher.dispatchEvent(toast)
                    })
                })
            })
        })

        this.shadowRoot.querySelectorAll(".delete-layer").forEach((button) => {
            button.addEventListener("click", async (event) => {
                const layerIndex = event.target.getAttribute("data-index")
                TPEN.activeProject.layers.splice(layerIndex, 1)
                const url = event.target.getAttribute("data-layer-id")
                const layerId = url.substring(url.lastIndexOf("/") + 1)
                await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer/${layerId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${TPEN.getAuthorization()}`,
                    },
                })
                .then(response => {
                    const toast = new CustomEvent('tpen-toast', {
                    detail: {
                        message: (response.ok) ? 'Successfully deleted layer' : 'Error deleting layer',
                        status: (response.ok) ? 200 : 500
                        }
                    })
                    return TPEN.eventDispatcher.dispatchEvent(toast)
                })
            })
        })

        this.shadowRoot.querySelector(".add-layer").addEventListener("click", async() => {
            const layers = TPEN.activeProject.layers
            layers.map(layer => (layer.pages ?? layer.items).map(page => {
                if (!this.canvases.includes(page.canvas) && page.canvas) {
                    this.canvases.push(page.canvas)
                }
            }))
            let layerLabel = this.shadowRoot.getElementById("layerLabel").value
            if (layerLabel === "") {
                layerLabel = null
            }
            await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TPEN.getAuthorization()}`,
                },
                body: JSON.stringify({
                    label: layerLabel,
                    canvases : this.canvases
                }), 
            })
            .then(response => {
                const toast = new CustomEvent('tpen-toast', {
                detail: {
                    message: (response.ok) ? 'Successfully added layer' : 'Error adding layer',
                    status: (response.ok) ? 200 : 500
                    }
                })
                return TPEN.eventDispatcher.dispatchEvent(toast)
            })
            this.render()
        })
    }

    rearrangePages(layerIndex) {
        const cards = this.shadowRoot.querySelectorAll(".layer-card")
        let layer = this.layers[layerIndex]

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
                    const draggedPage = layer.items[draggedIndex]
                    const targetPage = layer.items[targetIndex]
                    layer.items[draggedIndex] = targetPage
                    layer.items[targetIndex] = draggedPage
                    let temp = this.shadowRoot.querySelectorAll(".layer-card")[targetIndex].textContent
                    this.shadowRoot.querySelectorAll(".layer-card")[targetIndex].textContent = this.shadowRoot.querySelectorAll(".layer-card")[draggedIndex].textContent
                    this.shadowRoot.querySelectorAll(".layer-card")[draggedIndex].textContent = temp
                    this.layers[layerIndex] = layer
                }
                card.style.border = "none"
            })
        })
    }
}

customElements.define("tpen-manage-layers", ProjectLayers)
