import TPEN from "../../api/TPEN.js"

class ProjectLayers extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        TPEN.eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    render() {
        TPEN.attachAuthentication(this)
        const layers = TPEN.activeProject.layers
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .layer-card {
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    padding: 15px;
                    border-left: 5px solid #007bff;
                    cursor: move;
                    user-select: none;
                }
                p {
                    margin: 5px 0;
                    font-size: 14px;
                }
                button {
                    margin-top: 10px;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .delete-layer {
                    background: #dc3545;
                    color: white;
                }
                .delete-layer:hover {
                    background: #c82333;
                }
            </style>

            <div class="container">
                ${layers
                    .map(
                        (layer, layerIndex) => `
                        <div class="layer-card" draggable="true" data-index="${layerIndex}">
                            <p><strong>Layer ID:</strong> ${layer["@id"] ?? layer.id}</p>
                            ${layer.pages
                                .map(
                                    (page) =>
                                        `<p>Page: ${page["@id"] ?? page.id}</p>`
                                )
                                .join("")}
                            <button class="delete-layer" data-index="${layerIndex}">Delete Layer</button>
                        </div>`
                    )
                    .join("")}
            </div>
        `

        this.shadowRoot.querySelectorAll(".delete-layer").forEach((button) => {
            button.addEventListener("click", (event) => {
                const index = event.target.dataset.index
                if (index !== undefined) {
                    TPEN.activeProject.layers.splice(index, 1)
                    this.render()
                }
            })
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
