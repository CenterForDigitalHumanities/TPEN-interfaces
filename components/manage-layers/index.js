import TPEN from "../../api/TPEN.js"

class ProjectLayers extends HTMLElement {
    canvases = []
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
                .layer-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 80%;
                    margin: 0 auto;
                }
                .layer-card {
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
            <div class="layer-container">
            ${layers
                .map(
                    (layer, layerIndex) => `
                    <div class="layer-card" draggable="true" data-index="${layerIndex}">
                        <p><strong>Layer ID:</strong> ${layer["@id"] ?? layer.id}</p>
                        ${layer.label ? `<p><strong>Label:</strong> ${layer.label}</p>` : ``}
                        ${layer.pages
                            .map(
                                (page) =>
                                    `<p class="layer-page"> ${page["@id"] ?? page.id ?? page.map((page) => page["@id"] ?? page.id ).join("<br>")}</p>`
                                )
                            .join("")}
                        <div class="layer-actions">
                            <button class="layer-btn delete-layer" data-layer-id="${layer["@id"] ?? layer.id}">Delete Layer</button>
                        </div>
                    </div>`
                )
                .join("")}     
            </div>
        `

        this.shadowRoot.querySelectorAll(".delete-layer").forEach((button) => {
            button.addEventListener("click", async (event) => {
                const layerIndex = event.target.getAttribute("data-index")
                TPEN.activeProject.layers.splice(layerIndex, 1)
                const layerId = event.target.getAttribute("data-layer-id")
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
            layers.map(layer => layer.pages.map(page => {
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

        const cards = this.shadowRoot.querySelectorAll(".layer-card")

        cards.forEach((card) => {
            card.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("text/plain", card.dataset.index)
                card.style.opacity = "0.5"
            })

            card.addEventListener("dragend", () => {
                cards.forEach((card) => card.style.opacity = "1")
            })

            card.addEventListener("dragover", (event) => {
                event.preventDefault()
                card.style.border = "2px dashed #007bff"
            })

            card.addEventListener("dragleave", () => {
                card.style.border = "none"
            })

            card.addEventListener("drop", (event) => {
                event.preventDefault()
                const draggedIndex = event.dataTransfer.getData("text/plain")
                const targetIndex = card.dataset.index

                if (draggedIndex !== targetIndex) {
                    const draggedLayer = TPEN.activeProject.layers[draggedIndex]
                    TPEN.activeProject.layers.splice(draggedIndex, 1)
                    TPEN.activeProject.layers.splice(targetIndex, 0, draggedLayer)
                    this.render()
                }

                card.style.border = "none"
            })
        })
    }
}

customElements.define("tpen-manage-layers", ProjectLayers)
