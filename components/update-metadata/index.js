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
        fieldsContainer.insertAdjacentHTML("beforeend", 
            `
            <style>
                .metadata-field-header {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 10px;
                    width: 92%;
                }

                .metadata-field-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                    color: black;
                    text-align: center;
                    padding: 10px;
                }
                .header-label {
                    width: 30%;
                }
                .header-value {
                    width: 70%;
                }

                @media (max-width: 968px) {
                    .metadata-field-header {
                        gap: 20px;
                        width: 90%;
                    }
                    .metadata-field-header h3 {
                        font-size: 14px;
                        padding: 8px;
                        width: 50%;
                    }
                }
            </style>
            <div class='metadata-field-header'>
                <h3 class="header-label">Label</h3>
                <h3 class="header-value">Value</h3>
            </div>`
        )

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
        <style>
            .metadata-field {
                display: flex;
                gap: 20px;
                margin-bottom: 10px;
                width: 100%;
            }

            .metadata-field input[type="text"]{
                padding: 10px 15px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
            }

            .metadata-field .input-label {
                width: 30%;
                padding-left: 50px;
                font-weight: bold;
            }

            .metadata-field .input-value {
                width: 70%;
            }

            .metadata-field button {
                background-color: #ff4d4d;
                color: white;
                border: none;
                cursor: pointer;
                border-radius: 4px;
                display: flex !important;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 8px 10px;
            }

            .metadata-field button:hover {
                background-color: #ff1a1a;
            }

            .metadata-field .icon {
                width: 18px;
            }

            @media (max-width: 968px) {
                .metadata-field .input-value, .metadata-field .input-label {
                    width: 50%;
                    font-size: 12px;
                }
            }
        </style>
        <div class="metadata-field" data-index="${index !== null ? index : 'new'}">
            <input class="input-label" type="text" name="label" placeholder="Label" value="${label}" />
            <input class="input-value" type="text" name="value" placeholder="Value" value="${value}" />
            <button type="button" class="remove-field-btn"><img class="icon" src="../../assets/icons/delete.png" alt="Remove" /></button>
        </div>
        `
        fieldsContainer.insertAdjacentHTML("beforeend", fieldHTML)
        fieldsContainer
            .querySelector(".metadata-field:last-child .remove-field-btn .icon, .metadata-field:last-child .remove-field-btn")
            .addEventListener("click", (e) => {
                e.target.closest(".metadata-field").remove()
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

        const response = await TPEN.activeProject.updateMetadata(updatedMetadata)
        return TPEN.eventDispatcher.dispatch("tpen-toast", 
        response.ok ? 
            { status: "info", message: 'Successfully Added Metadata' } : 
            { status: "error", message: 'Error Adding Metadata' }
        ) 
    }
}

customElements.define('update-metadata', UpdateMetadata)
