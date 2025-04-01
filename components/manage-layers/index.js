import TPEN from "../../api/TPEN.js"

class ProjectLayers extends HTMLElement {
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
                .edit-pages {
                    background: #ffc107;
                    color: white;
                }
                .save-label {
                    background: #007bff;
                    color: white;
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
                        <p class="layer-id"><strong>Layer ID:</strong> ${layer["@id"] ?? layer.id}</p>
                        <div class="layer-label-div">
                            ${layer.label ? `<p class="layer-label"><strong>Label:</strong> ${layer.label}</p>` : ``}
                        </div>
                        <div class="layer-pages">
                        ${layer.pages
                            .map(
                                (page, pageIndex) =>
                                    `<p class="layer-page" data-index="${pageIndex}">${page["@id"] ?? page.id ?? page.map((page) => page["@id"] ?? page.id )}</p>`
                                )
                            .join("")}
                        </div>
                        ${(String(layer.id) ?? String(layer["@id"])).includes("store.rerum.io") ?
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
        this.shadowRoot.querySelectorAll(".delete-layer").forEach((button) => {
            button.addEventListener("click", (event) => {
                const url = event.target.getAttribute("data-layer-id")
                const layerId = url.substring(url.lastIndexOf("/") + 1)

                fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer/${layerId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${TPEN.getAuthorization()}`
                    }
                })
                .then(response => {
                    return TPEN.eventDispatcher.dispatch("tpen-toast", 
                    response.ok ? 
                        { status: "info", message: 'Successfully Deleted Layer' } : 
                        { status: "error", message: 'Error Deleting Layer' }
                    )
                })
            })
        })

        this.shadowRoot.querySelector(".add-layer").addEventListener("click", () => {
            const canvases = []
            layers.map(layer => (layer.pages).map(page => {
                if (!canvases.includes(page.canvas) && page.canvas) {
                    canvases.push(page.canvas)
                }
            }))

            let layerLabel = this.shadowRoot.getElementById("layerLabel").value
            if (layerLabel === "") {
                layerLabel = null
            }

            fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TPEN.getAuthorization()}`
                },
                body: JSON.stringify({
                    label: layerLabel,
                    canvases
                })
            })
            .then(response => {
                return TPEN.eventDispatcher.dispatch("tpen-toast", 
                response.ok ? 
                    { status: "info", message: 'Successfully Added Layer' } : 
                    { status: "error", message: 'Error Adding Layer' }
                )
            })
        })
    }
}

customElements.define("tpen-manage-layers", ProjectLayers)
