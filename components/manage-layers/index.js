import TPEN from "../../api/TPEN.js"
import "../../components/manage-pages/index.js"
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"

class ProjectLayers extends HTMLElement {

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)

        if (TPEN.activeProject?._id) {
            this.render()
        }
        TPEN.eventDispatcher.on('tpen-project-loaded', this.render.bind(this))
    }

    render() {
        // Check if user has view permission (safe - project is loaded)
        const hasViewAccess = CheckPermissions.checkViewAccess('LAYER', 'METADATA')
        if (!hasViewAccess) {
            this.shadowRoot.innerHTML = `<p>You don't have permission to view layers</p>`
            return
        }

        const layers = TPEN.activeProject.layers
        this.shadowRoot.innerHTML = `
            <style>
                .layer-title {
                    text-align: center;
                    margin: 10px 0;
                    font-size: 20px;
                    color: var(--interface-primary);
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
                    background: var(--white);
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    padding: 15px;
                    border-left: 5px solid var(--interface-primary);
                    cursor: move;
                    user-select: none;
                    margin: 0 auto;
                    width: 60%;
                    text-align: center;
                }
                .label-input {
                    width: 70%;
                    padding: 5px;
                    border: 1px solid var(--gray);
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
                    border: 1px solid var(--gray);
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
                    min-width: fit-content;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .layer-btn:disabled {
                    opacity: 0.45;
                    cursor: default;
                }
                .delete-layer {
                    background: var(--error-color);
                    color: var(--white);
                    width: 20%;
                }
                .delete-layer:hover {
                    filter: brightness(0.85);
                }
                .manage-pages {
                    background: var(--interface-primary);
                    color: var(--white);
                    width: 20%;
                }
                .manage-pages:hover {
                    background: var(--interface-primary-hover);
                }
                .add-layer {
                    background: var(--success-color);
                    color: var(--white);
                    width: 20%;
                }
                .add-layer:hover {
                    filter: brightness(0.85);
                }
                .edit-pages {
                    background: var(--warning-color);
                    color: var(--white);
                }
                .save-label {
                    background: var(--interface-primary);
                    color: var(--white);
                }
                .page-id {
                    margin: 0 auto;
                }
                .layer-card-flex {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .delete-page {
                    margin-top: 0;
                    background: var(--error-color);
                    color: var(--white);
                }
                .layer-actions-margin {
                    margin-top: 20px;
                }
                .hidden {
                    display: none;
                }
            </style>

            <h1 class="layer-title">Add Layers</h1>
            <div class="layer-div">
                <div>
                    <label for="layerLabel">Label:</label>
                    <input type="text" class="layer-input" id="layerLabel" placeholder="Layer Label">
                </div>
                <button class="layer-btn add-layer">Add Layer</button>
            </div>
            <h1 class="layer-title">Manage Layers</h1>
            <div class="layer-container-outer">
            ${layers
                .map(
                    (layer, layerIndex) => `
                    <div class="layer-card-outer" data-index="${layerIndex}" style="cursor:default;}">
                        <p class="layer-id"><strong>Layer ID:</strong> ${layer.id}</p>
                        <div class="layer-label-div">
                            ${layer.label ? `<p class="layer-label"><strong>Label:</strong> ${layer.label}</p>` : ``}
                        </div>
                        <div class="layer-pages">
                        ${layer.pages
                            .map(
                                (page, pageIndex) =>
                                `
                                <div class="layer-page" data-index="${pageIndex}" data-page-id="${page.id}" position="${pageIndex}">
                                    <p class="page-id" data-index="${pageIndex}" data-page-id="${page.id}" position="${pageIndex}">${page.label ?? page.id}</p>
                                </div>
                                `
                                )
                            .join("")}
                        </div>
                        <div class="layer-actions">
                            <tpen-manage-pages data-index="${layerIndex}" data-layer-id="${layer.id}" position="${layerIndex}"></tpen-manage-pages>
                            <button class="layer-btn delete-layer" data-index="${layerIndex}" data-layer-id="${layer.id}" position="${layerIndex}">Delete Layer</button>
                        </div>
                    </div>`
                )
                .join("")}     
            </div>
        `
        this.shadowRoot.querySelectorAll(".delete-layer").forEach((button) => {
            button.addEventListener("click", async (event) => {
                const hasDeleteAccess = await CheckPermissions.checkDeleteAccess('LAYER', '*')
                if (!hasDeleteAccess) {
                    TPEN.eventDispatcher.dispatch("tpen-toast", {
                        status: "error",
                        message: "You don't have permission to delete layers"
                    })
                    return
                }
                if (!confirm("This Layer will be deleted and the Pages will no longer be a part of this project.  This action cannot be undone.")) return
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

        this.shadowRoot.querySelector(".add-layer").addEventListener("click", async () => {
            const hasCreateAccess = await CheckPermissions.checkCreateAccess('LAYER', '*')
            if (!hasCreateAccess) {
                TPEN.eventDispatcher.dispatch("tpen-toast", {
                    status: "error",
                    message: "You don't have permission to create layers"
                })
                return
            }
            const canvases = []
            layers.map(layer => (layer.pages).map(page => {
                if (!canvases.includes(page.target) && page.target) {
                    canvases.push(page.target)
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
