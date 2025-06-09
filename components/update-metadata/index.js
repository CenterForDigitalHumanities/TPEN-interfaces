import TPEN from "../../api/TPEN.js"
import User from "../../api/User.js"
import { eventDispatcher } from "../../api/events.js"

class UpdateMetadata extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    static get observedAttributes() {
        return ['tpen-user-id']
    }

    async connectedCallback() {
        this.addEventListener()
        TPEN.attachAuthentication(this)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-user-id') {
            if (oldValue !== newValue) {
                const loadedUser = new User(newValue)
                loadedUser.authentication = TPEN.getAuthorization()
                loadedUser.getProfile()
            }
        }
    }

    addEventListener() { 
            eventDispatcher.on("tpen-project-loaded", () => this.openModal())
        document.getElementById("add-field-btn").addEventListener("click", () => {
            this.addMetadataField()
        })

        document.getElementById("save-metadata-btn").addEventListener("click", () => {
            this.updateMetadata()
        })
    }

    openModal() {
        const modal = document.getElementById("metadata-modal")
        const fieldsContainer = document.getElementById("metadata-fields")
        fieldsContainer.innerHTML = ""

        const project = TPEN.activeProject

        project.metadata.forEach((data, index) => {
            if (typeof data.label === "string" && typeof data.value === "string") {
                this.addMetadataField("none", data.label, data.value, index)
            }
            else if (typeof data.label === "object" && typeof data.value === "object") {
                const labelMap = data.label
                const valueMap = data.value

                Object.keys(labelMap).forEach((lang) => {
                    const label = decodeURIComponent(labelMap[lang]?.join(", ") || "")
                    const value = decodeURIComponent(valueMap[lang]?.join(", ") || "")
                    this.addMetadataField(lang, label, value, index)
                })
            }
        })

        modal.classList.remove("hidden")
    }

    addMetadataField(lang = "none", label = "", value = "", index = null) {
        const fieldsContainer = document.getElementById("metadata-fields")
        const fieldHTML = `
        <div class="metadata-field" data-index="${index !== null ? index : 'new'}">
            <select name="language">
            <option value="none" ${lang === "none" ? "selected" : ""}>None</option>
            <option value="en" ${lang === "en" ? "selected" : ""}>English</option>
            <option value="fr" ${lang === "fr" ? "selected" : ""}>French</option>
            <!-- Other lnguages to come later, maybe from an API -->
            </select>

            <input type="text" name="label" placeholder="Label" value="${label}" />
            <input type="text" name="value" placeholder="Value" value="${value}" />
            <button type="button" class="remove-field-btn">X</button>
        </div>
        `
        fieldsContainer.insertAdjacentHTML("beforeend", fieldHTML)
        fieldsContainer
            .querySelector(".metadata-field:last-child .remove-field-btn")
            .addEventListener("click", (e) => {
                e.target.parentElement.remove()
            })
    }

    async updateMetadata() {
        const fields = document.querySelectorAll(".metadata-field")
        const updatedMetadata = []

        fields.forEach((field) => {
            const lang = encodeURIComponent(field.querySelector("select[name='language']").value)
            const label = encodeURIComponent(field.querySelector("input[name='label']").value)
            const value = encodeURIComponent(field.querySelector("input[name='value']").value)

            updatedMetadata.push({
                label: { [lang]: [label] },
                value: { [lang]: [value] },
            })
        })

        try {
            await TPEN.activeProject.updateMetadata(updatedMetadata)
            alert("Metadata updated successfully!")
        } catch (error) {
            console.error(error)
            alert("An error occurred while updating metadata.")
        }
    }
}

customElements.define('update-metadata', UpdateMetadata)
