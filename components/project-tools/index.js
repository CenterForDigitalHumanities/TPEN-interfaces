import TPEN from "../../api/TPEN.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import CheckPermissions from "../../utilities/checkPermissions.js"

class ProjectTools extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.render)
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    async render() {
        const tools = TPEN.activeProject.tools
        const isToolsEditAccess = await CheckPermissions.checkEditAccess("TOOL")
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                    gap: 10px;
                    padding: 5px;
                    margin: 10px auto;
                    font-size: 14px;
                    width: 90%;
                    margin-top: 0px;
                }
                .tool-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    padding: 2px 0px;
                    width: 100%;
                }
                .project-tools-title {
                    font-weight: bold;
                    font-size: 20px;
                    padding: 20px;
                    text-align: center;
                    color: var(--primary-color);
                }
                .tool-button {
                    background-color: #f0f0f0;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    user-select: none;
                }
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.5);
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 80%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    position: relative;
                }
                .modal-inputs {
                    width: 80%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 10px;
                    align-items: center;
                }
                .modal-inputs input {
                    padding: 6px;
                    width: 100%;
                }
                #tool-preview {
                    width: 100%;
                    height: 300px;
                    border: 1px solid #ccc;
                    margin-top: 10px;
                }
                .modal-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    margin-top: 10px;
                }
                .tools-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: var(--primary-color);
                    color: #fff;
                }
                .secondary {
                    background: #6c757d;
                }
                .close-btn {
                    position: absolute;
                    top: -12px;
                    right: -12px;
                    width: 32px;
                    height: 32px;
                    background: #ff4d4d;
                    color: #fff;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s ease;
                }

                .close-btn:hover {
                    background-color: #ff1a1a;
                }
                #add-iframe-tools {
                    margin-left: 20px;
                }

                .remove-field-btn {
                    background-color: #ff4d4d;
                    color: white;
                    border: none;
                    cursor: pointer;
                    border-radius: 4px;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 4px;
                }

                .remove-field-btn:hover {
                    background-color: #ff1a1a;
                }

                .icon {
                    width: 14px;
                    height: 14px;
                }
            </style>
            <div class="tools-body">
                ${tools.map(tool => `
                    <div class="container">
                        <div class="tool-card">
                            <div>
                                ${isToolsEditAccess ? `<input type="checkbox" name="tools" value="${tool.value}" ${tool.state ? "checked" : ""}>` : ""}
                                <label>${tool.name}</label>
                            </div>
                            <button type="button" class="remove-field-btn">
                                <!-- Icon source: https://www.flaticon.com/free-icons/delete by Freepik -->
                                <img class="icon" src="../../assets/icons/delete.png" alt="Remove" />
                            </button>
                        </div>
                    </div>
                `).join("")}

                <div class="modal" id="tool-modal">
                    <div class="modal-content">
                        <button class="tools-btn close-btn" id="close-modal-btn">&times;</button>
                        <div class="project-tools-title">ADD IFRAME TOOL</div>
                        <div class="modal-inputs">
                            <input type="text" id="modal-tool-name" placeholder="Tool Name" />
                            <input type="url" id="modal-tool-url" placeholder="Tool URL" />
                        </div>
                        <div class="modal-buttons">
                            <button id="test-tool-btn" class="tools-btn secondary">Test</button>
                            <button class="tools-btn" id="add-tool-confirm-btn">Add</button>
                        </div>
                        <iframe id="tool-preview" style="display: none;"></iframe>
                    </div>
                </div>
            </div>
        `
    
        const modal = this.shadowRoot.querySelector("#tool-modal")
        const manageTools = document.getElementById("manage-tools-btn")
        const openModalBtn = document.querySelector("tpen-page").querySelector('tpen-card[tpen-entity="tools"] #add-iframe-tools')
        const closeModalBtn = this.shadowRoot.querySelector("#close-modal-btn")
        const testBtn = this.shadowRoot.querySelector("#test-tool-btn")
        const addBtn = this.shadowRoot.querySelector("#add-tool-confirm-btn")
        const nameInput = this.shadowRoot.querySelector("#modal-tool-name")
        const urlInput = this.shadowRoot.querySelector("#modal-tool-url")
        const iframe = this.shadowRoot.querySelector("#tool-preview")
        const deleteButtons = this.shadowRoot.querySelectorAll(".remove-field-btn")

        function isValidURL(str) {
            try {
                new URL(str)
                if(!str.startsWith("http://") && !str.startsWith("https://"))
                    return false
                return true
            } catch (_) {
                return false
            }
        }

        function checkTools(name, url) {
            for (let tool of tools) {
                if (tool.name === name || tool.url === url) {
                    return true
                }
            }
            return false
        }

        function checkForCode(str) {
            const code = /[<>{}()[\];'"`]|script|on\w+=|javascript:/i
            return code.test(str)
        }
    
        openModalBtn.addEventListener("click", () => {
            modal.style.display = "flex"
            iframe.style.display = "none"
            nameInput.value = ""
            urlInput.value = ""
        })
    
        closeModalBtn.addEventListener("click", () => {
            modal.style.display = "none"
        })
    
        testBtn.addEventListener("click", () => {
            const name = nameInput.value.trim()
            const url = urlInput.value.trim()

            if(!url) 
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid URL' })

            if(checkForCode(name))
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid tool name' })

            if(!isValidURL(url))
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid URL' })

            iframe.src = url
            iframe.style.display = "block"
        })

        addBtn.addEventListener("click", async() => {
            const name = nameInput.value.trim()
            const url = urlInput.value.trim()
    
            if(!name || !url) 
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid tool name and URL' })

            if(checkForCode(name))
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid tool name' })

            if(!isValidURL(url))
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid URL' })

            if(checkTools(name, url)) {
                modal.style.display = "none"
                iframe.style.display = "none"
                nameInput.value = ""
                urlInput.value = ""
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "info", message: 'This tool already exists' })
            }
    
            const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/tools`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${TPEN.getAuthorization()}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([{
                    name, 
                    value: name.toLowerCase().split(" ").join("-"), 
                    url: url, 
                    state: true
                }])
            })

            modal.style.display = "none"
            iframe.style.display = "none"
            nameInput.value = ""
            urlInput.value = ""

            if (response.ok) {
                this.render()
                TPEN.activeProject.tools.push({
                    name: name,
                    value: name.toLowerCase().split(" ").join("-"),
                    url: url,
                    state: true
                })
            }
    
            return TPEN.eventDispatcher.dispatch("tpen-toast", 
                response.ok ? 
                    { status: "info", message: 'Successfully Added Tool' } : 
                    { status: "error", message: 'Error Adding Tool' }
            )
        })
    
        manageTools.addEventListener("click", async() => {
            const allInputs = this.shadowRoot.querySelectorAll('input[type="checkbox"][name="tools"]');
            const selectedTools = Array.from(allInputs).map(input => ({
                value: input.value,
                state: input.checked
            }))

            const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/tools`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${TPEN.getAuthorization()}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(selectedTools)
            })
                
            modal.style.display = "none"
            iframe.style.display = "none"
            nameInput.value = ""
            urlInput.value = ""
    
            return TPEN.eventDispatcher.dispatch("tpen-toast", 
            response.ok ? 
                { status: "info", message: 'Successfully Updated Tools' } : 
                { status: "error", message: 'Error Updating Tools' }
            )
        })

        deleteButtons.forEach(button => {
            button.addEventListener("click", async (e) => {
                const toolName = e.target.closest(".tool-card").querySelector("label").textContent.trim()
                const toolValue = e.target.closest(".tool-card").querySelector("input[type='checkbox']").value
                const container = e.target.closest(".container")

                if (!toolValue) {
                    TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: `Tool value not found for ${toolName}` })
                    return
                }

                const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/tools`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${TPEN.getAuthorization()}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ tool: toolValue })
                })

                if (response.ok) {
                    container.remove()
                    TPEN.activeProject.tools = TPEN.activeProject.tools.filter(tool => tool.value !== toolValue)
                    TPEN.eventDispatcher.dispatch("tpen-toast", { status: "info", message: `Successfully removed ${toolName}` })
                    this.render()
                } else {
                    TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: `Error removing ${toolName}` })
                }
            })
        })
    }    
}

customElements.define("tpen-project-tools", ProjectTools)
