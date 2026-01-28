import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import "../check-permissions/permission-match.js"

const eventDispatcher = TPEN.eventDispatcher

/**
 * LayerSelector - Dropdown for selecting layers when a project has multiple layers.
 * Requires LAYER ANY view access.
 * @element tpen-layer-selector
 */
export default class LayerSelector extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.layers = []
    }

    connectedCallback() {
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Removes component if user lacks LAYER ANY view access or there's only one layer.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess("LAYER", "ANY")) {
            this.remove()
            return
        }
        this.layers = TPEN.activeProject.layers
        if (this.layers.length <= 1) {
            // No need to render if there's only one layer.
            return this.remove()
        }
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    getLabel(data) {
        if (typeof data.label === "string") {
            return data.label
        }

        if (typeof data.label === "object") {
            return Object.entries(data.label)
                .map(([lang, values]) => `${lang != "none" ? lang + ":" : ""} ${values.join(", ")}`)
                .join(" | ")
        }

        return `Unlabeled layer: ${data["@id"]}`
    }

    render() {
        const optionsHtml = this.layers
            .map((layer) => {
                const label = this.getLabel(layer)
                return `<option value="${layer["@id"]}">${label}</option>`
            })
            .join("")

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          container-type: inline-size;
        }
        select {
          font-size: clamp(0.8rem, 1vw, 1rem);
          padding: 5px;
          border: 1px dashed var(--border-color, #ccc);
          border-radius: 5px;
          background: var(--select-bg, #fff);
          outline:none;
          /* Allow text to wrap */
          white-space: normal;
          word-wrap: break-word;
          max-width:100px;
        }

        @container (max-width: 300px) {
          select {
            font-size: 0.8rem;
          }
        }
      </style>
      <select>
        ${optionsHtml}
      </select>
    `
    }

    /**
     * Sets up event listeners for the layer selector.
     */
    addEventListeners() {
        const selectEl = this.shadowRoot.querySelector("select")
        selectEl.addEventListener("change", (e) => {
            const selectedURI = e.target.value
            const selectedLayer = this.layers.find((layer) => layer.URI === selectedURI)
            if (selectedLayer) {
                // Dispatch layer change event for transcription interfaces to consume
                eventDispatcher.dispatch("tpen-layer-changed", {
                    layer: selectedLayer,
                    layerURI: selectedLayer["@id"],
                })
                // Also update TPEN.activeLayer for backward compatibility
                TPEN.activeLayer = selectedLayer
            }
        })
    }
}

customElements.define("tpen-layer-selector", LayerSelector)
