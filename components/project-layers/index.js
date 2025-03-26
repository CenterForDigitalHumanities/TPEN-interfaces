import TPEN from "../../api/TPEN.js"

class ProjectLayers extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on('tpen-project-loaded', () => this.render())
    }

    render() {
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
            </style>
            <div class="container">
                ${layers.map(layer => `
                    <div class="layer-card">
                        <p>Layer ID: ${layer["@id"] ?? layer.id}</p>
                        <p>Pages Count: ${(layer.pages ?? layer.items).flat().length}</p>
                    </div>
                `).join("")}
            </div>
        `
    }
}

customElements.define("tpen-project-layers", ProjectLayers)