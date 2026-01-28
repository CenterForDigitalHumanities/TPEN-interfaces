import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * ManagePages - Provides UI for managing pages within a layer including reordering, editing labels, and deletion.
 * Requires PAGE METADATA view access.
 * @element tpen-manage-pages
 */
class ManagePages extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Shows permission message if user lacks PAGE METADATA view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess('PAGE', 'METADATA')) {
            this.shadowRoot.innerHTML = `<p>You don't have permission to view pages</p>`
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    render() {
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
                .manage-pages {
                    background: var(--interface-primary);
                    color: var(--white);
                    width: 100%;
                }
                .manage-pages:hover {
                    background: var(--interface-primary-hover);
                }
                .edit-pages {
                    background: var(--warning-color);
                    color: var(--white);
                }
                .save-label {
                    background: var(--interface-primary);
                    color: var(--white);
                }
                .hidden {
                    display: none;
                }
            </style>
            <button class="layer-btn manage-pages">Manage Pages</button>
        `
        const layers = TPEN.activeProject?.layers
        const pages = layers?.pages
        this.shadowRoot.querySelectorAll(".manage-pages").forEach((button) => {
            button.addEventListener("click", () => {
                // Check if user has edit permission for pages
                const hasEditAccess = CheckPermissions.checkEditAccess('PAGE', 'METADATA')
                if (!hasEditAccess) {
                    TPEN.eventDispatcher.dispatch("tpen-toast", {
                        status: "error",
                        message: "You don't have permission to manage pages"
                    })
                    return
                }
                const buttonParent = button.getRootNode().host
                const mainParent= buttonParent.getRootNode().host
                const layerIndex = buttonParent.getAttribute("data-index")
                const layerId = buttonParent.getAttribute("data-layer-id")
                const layer_id = layerId.substring(layerId.lastIndexOf("/") + 1)
                const layerCardOuter = mainParent.shadowRoot.querySelector(`.layer-card-outer[data-index="${layerIndex}"]`)
                const layerActions = layerCardOuter.querySelector(".layer-actions")
                layerActions.classList.add("layer-actions-margin")
                layerCardOuter.querySelector(".layer-pages").classList.add("layer-container")
                let layerPagesCard = layerCardOuter.querySelectorAll(".layer-page")
                let el_dragged, el_droppedOn
                layerPagesCard
                .forEach(el => { 
                    const pageId = el.getAttribute("data-page-id")
                    const page_id = pageId.substring(pageId.lastIndexOf("/") + 1)
                    const labelDiv = el.querySelector(".page-id")
                    const pageIndex = labelDiv.getAttribute("data-index")
                    el.classList.add("layer-card", "layer-card-flex")
                    el.setAttribute("draggable", "true")

                    el.addEventListener("dragstart", (event) => {
                        event.dataTransfer.setData("text/plain", el.dataset.index)
                        el_dragged = event.target
                    })
                    el.addEventListener("dragend", () => {
                        layerPagesCard.forEach((el) => el.style.opacity = "1")
                    })
                    el.addEventListener("dragover", (event) => {
                        event.preventDefault()
                    })
                    el.addEventListener("dragleave", () => {
                    })
                    el.addEventListener("drop", (event) => {
                        event.preventDefault()
                        el_droppedOn = event.target
                        if (!el_droppedOn.classList.contains("layer-page")) el_droppedOn = el_droppedOn.closest(".layer-page")
                        const draggedIndex = parseInt(el_dragged.getAttribute("position"))
                        const targetIndex = parseInt(el_droppedOn.getAttribute("position"))
                        const container = el_droppedOn.closest(".layer-pages")
                        if (draggedIndex === targetIndex) return
                        if(draggedIndex < targetIndex) {
                            container.insertBefore(el_dragged, el_droppedOn)
                            container.insertBefore(el_droppedOn, container.children[draggedIndex])    
                        }
                        else{
                            container.insertBefore(el_dragged, el_droppedOn)
                            container.insertBefore(el_droppedOn, container.children[draggedIndex + 1])
                        }
                        
                        Array.from(container.children).forEach((el, i) => {
                            el.setAttribute("position", i)
                            if (parseInt(el.getAttribute("data-index")) !== i) {
                                container.$isDirty = true
                                el.style.borderLeft = "none"
                            }
                            else{
                                el.style.borderLeft = "5px solid var(--interface-primary)"
                            }
                        })
                    })

                    const editPageLabelButton = document.createElement("button")
                    editPageLabelButton.className = "layer-btn edit-pages"
                    editPageLabelButton.style.marginTop = "0"
                    editPageLabelButton.dataset.index = pageIndex
                    editPageLabelButton.dataset.layerId = layerId
                    editPageLabelButton.innerText = "Edit Label"
                    el.insertBefore(editPageLabelButton, el.lastChild).insertAdjacentElement("afterend", editPageLabelButton)
                    const deleteButton = document.createElement("button")
                    deleteButton.className = "layer-btn delete-page"
                    deleteButton.dataset.index = pageIndex
                    deleteButton.dataset.layerId = layerId
                    deleteButton.innerText = "Delete Page"
                    editPageLabelButton.after(deleteButton)

                    editPageLabelButton.addEventListener("click", () => {
                        const hasUpdateAccess = CheckPermissions.checkEditAccess('PAGE', 'METADATA')
                        if (!hasUpdateAccess) {
                            TPEN.eventDispatcher.dispatch("tpen-toast", {
                                status: "error",
                                message: "You don't have permission to edit page labels"
                            })
                            return
                        }
                        labelDiv.classList.add("hidden")
                        editPageLabelButton.classList.add("hidden")
                        const labelInput = document.createElement("input")
                        labelInput.type = "text"
                        labelInput.className = "label-input"
                        labelInput.value = labelDiv.innerText
                        labelInput.dataset.index = pageIndex
                        labelInput.dataset.pageId = pageId
                        labelDiv.after(labelInput)
                        const saveLabelButton = document.createElement("button")
                        saveLabelButton.className = "layer-btn save-label"
                        saveLabelButton.style.marginTop = "0"
                        saveLabelButton.dataset.index = pageIndex
                        saveLabelButton.dataset.pageId = pageId
                        saveLabelButton.innerText = "Save Label"
                        labelInput.after(saveLabelButton)
                        saveLabelButton.addEventListener("click", () => {
                            fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/page/${page_id}`, {
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
                                if (response.ok) {
                                    labelDiv.innerText = labelInput.value
                                    layers[layerIndex].pages[pageIndex].label = labelInput.value
                                }
                                labelInput.remove()
                                saveLabelButton.remove()
                                labelDiv.classList.remove("hidden")
                                editPageLabelButton.classList.remove("hidden")
                                return TPEN.eventDispatcher.dispatch("tpen-toast", 
                                response.ok ? 
                                    { status: "info", message: 'Successfully Updated Page Label' } : 
                                    { status: "error", message: 'Error Updating Page Label' }
                                )
                            })
                            .catch(err => {
                                labelInput.remove()
                                saveLabelButton.remove()
                                labelDiv.classList.remove("hidden")
                                editPageLabelButton.classList.remove("hidden")
                                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Error Updating Page Label' })
                            })
                        })
                    })

                    deleteButton.addEventListener("click", () => {
                        const hasDeleteAccess = CheckPermissions.checkDeleteAccess('PAGE', '*')
                        if (!hasDeleteAccess) {
                            TPEN.eventDispatcher.dispatch("tpen-toast", {
                                status: "error",
                                message: "You don't have permission to delete pages"
                            })
                            return
                        }
                        if (!confirm("This Page will be removed from this layer and deleted.  This action cannot be undone.")) return
                        layerCardOuter.querySelector(".layer-pages").removeChild(el)
                        layers[layerIndex].pages.splice(el.dataset.index, 1)
                        mainParent.shadowRoot.querySelectorAll(`.layer-card-outer[data-index="${layerIndex}"] .layer-page`).forEach((card, newIndex) => {
                            card.dataset.index = newIndex
                        })
                        layerPagesCard = mainParent.shadowRoot.querySelectorAll(`.layer-card-outer[data-index="${layerIndex}"] .layer-page`)
                    })
                })

                const labelDiv = layerCardOuter.querySelector(".layer-label-div")
                labelDiv.style.display = "flex"
                const editLayerLabelButton = document.createElement("button")
                editLayerLabelButton.className = "layer-btn edit-pages"
                editLayerLabelButton.style.marginTop = "0"
                editLayerLabelButton.dataset.index = layerIndex
                editLayerLabelButton.dataset.layerId = layerId
                editLayerLabelButton.innerText = "Edit Label"
                layerCardOuter.querySelector(".layer-label").insertAdjacentElement("afterend", editLayerLabelButton)
                const saveButton = document.createElement("button")
                saveButton.className = "layer-btn save-pages"
                saveButton.dataset.index = layerIndex
                saveButton.dataset.layerId = layerId
                saveButton.innerText = "Save Pages"
                layerActions.insertBefore(saveButton, layerActions.firstChild)
                layerActions.removeChild(layerCardOuter.querySelector("tpen-manage-pages"))

                editLayerLabelButton.addEventListener("click", () => {
                    const hasUpdateAccess = CheckPermissions.checkEditAccess('LAYER', 'METADATA')
                    if (!hasUpdateAccess) {
                        TPEN.eventDispatcher.dispatch("tpen-toast", {
                            status: "error",
                            message: "You don't have permission to edit layer labels"
                        })
                        return
                    }
                    labelDiv.querySelector(".layer-label").classList.add("hidden")
                    editLayerLabelButton.classList.add("hidden")
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
                            if (response.ok) {
                                layers[layerIndex].label = labelInput.value
                                labelDiv.querySelector(".layer-label").innerHTML = `
                                    <strong>Label:</strong>
                                    ${labelInput.value}
                                `  
                            }
                            labelInput.remove()
                            saveLabelButton.remove()
                            labelDiv.querySelector(".layer-label").classList.remove("hidden")
                            editLayerLabelButton.classList.remove("hidden")
                            return TPEN.eventDispatcher.dispatch("tpen-toast", 
                                response.ok ? 
                                    { status: "info", message: 'Successfully Updated Layer Label' } : 
                                    { status: "error", message: 'Error Updating Layer Label' }
                                )                        
                        })
                        .catch(err => {
                            labelInput.remove()
                            saveLabelButton.remove()
                            labelDiv.querySelector(".layer-label").classList.remove("hidden")
                            editLayerLabelButton.classList.remove("hidden")
                            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Error Updating Layer Label' })
                        })
                    })
                })

                saveButton.addEventListener("click", () => {
                    const hasUpdateAccess = CheckPermissions.checkEditAccess('PAGE', 'ORDER')
                    if (!hasUpdateAccess) {
                        TPEN.eventDispatcher.dispatch("tpen-toast", {
                            status: "error",
                            message: "You don't have permission to reorder pages"
                        })
                        return
                    }
                    if (!layerCardOuter.querySelector(".layer-pages")?.$isDirty) {
                        TPEN.eventDispatcher.dispatch("tpen-toast", {"status":"info", "message":"No Changes to Save"})
                        return
                    }
                    layerCardOuter.querySelectorAll("button").forEach(button => button.setAttribute("disabled", "true"))
                    saveButton.innerText = "Saving Pages..."
                    const pageIds = Array.from(layerCardOuter.querySelectorAll(".layer-page")).map((elem) => elem.getAttribute("data-page-id").split("/").pop())
                    fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/layer/${layer_id}`, {
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
                        if (response.ok) {
                            const pageElemsContainer = layerCardOuter.querySelector(".layer-pages")
                            const pageElems = pageElemsContainer.querySelectorAll(".layer-page")
                            const origLayer = JSON.parse(JSON.stringify(layers[layerIndex]))
                            pageElems.forEach((el, i) => {
                                el.setAttribute("position", i)
                                if (el.dataset.index !== i+"") {
                                    // swap them in the data array
                                    layers[layerIndex].pages[i] = origLayer.pages[el.dataset.index]
                                    // Grab any other elements noting the index of this page
                                    const internal_els = el.querySelectorAll(`[data-index="${el.dataset.index}"]`)
                                    // Update their data-index attributes and index properties
                                    for (const other of internal_els) {
                                        other.setAttribute("data-index", i + "")
                                        other.dataset.index = i + ""
                                    }
                                    // Set the current element's new data-index attibute
                                    el.setAttribute("data-index", i + "")
                                    // Set the current element's new index property
                                    el.dataset.index = i
                                }
                                el.style.borderLeft = "5px solid var(--interface-primary)"
                            })
                            layerCardOuter.querySelectorAll("button").forEach(button => button.removeAttribute("disabled"))
                            saveButton.innerText = "Save Pages"
                            return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "info", message: 'Successfully Updated Pages and Layer' })
                        }
                        saveButton.innerText = "ERROR"
                        return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Error Updating Pages and Layer' })
                    })
                    .catch(err => {
                        console.error(err)
                        saveButton.innerText = "ERROR"
                        return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Error Updating Pages and Layer' })
                    })
                })
            })
        })
    }
}

customElements.define("tpen-manage-pages", ManagePages)
