import TPEN from "../../api/TPEN.js"

class ProjectTools extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on('tpen-project-loaded', () => this.render())
    }

    render() {
        const tools = TPEN.activeProject.tools
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    gap: 10px;
                    padding: 15px;
                    font-size: 14px;
                }
                .tool-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                }
                .project-tools-title {
                    font-weight: bold;
                    font-size: 20px;
                    padding: 20px;
                    text-align: center;
                    color: var(--accent);
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
                    background: #007bff;
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
                    background: #ef4444;
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
                    background-color: #dc2626;
                }
                #open-modal-btn {
                    margin-left: 20px;
                    background: var(--accent);
                }
            </style>

            <div class="container">
                ${tools.map(tool => `
                    <div class="tool-card">
                        <input type="checkbox" name="tools" value="${tool.value}" ${tool.state ? "checked" : ""}>
                        <label>${tool.name}</label>
                    </div>
                `).join("")}
            </div>
            
            <div class="project-tools-title"><button class="tools-btn" id="open-modal-btn">Add iFrame Tool</button></div>

            <div class="modal" id="tool-modal">
                <div class="modal-content">
                    <button class="tools-btn close-btn" id="close-modal-btn">&times;</button>
                    <div class="project-tools-title">Add iFrame Tool</div>
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
        `
    
        const modal = this.shadowRoot.querySelector("#tool-modal")
        const manageTools = document.getElementById("manage-tools-btn")
        const openModalBtn = this.shadowRoot.querySelector("#open-modal-btn")
        const closeModalBtn = this.shadowRoot.querySelector("#close-modal-btn")
        const testBtn = this.shadowRoot.querySelector("#test-tool-btn")
        const addBtn = this.shadowRoot.querySelector("#add-tool-confirm-btn")
        const nameInput = this.shadowRoot.querySelector("#modal-tool-name")
        const urlInput = this.shadowRoot.querySelector("#modal-tool-url")
        const iframe = this.shadowRoot.querySelector("#tool-preview")

        function isValidURL(str) {
            try {
                new URL(str);
                return true;
            } catch (_) {
                return false;
            }
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
            const name = encodeURIComponent(nameInput.value.trim())
            const url = urlInput.value.trim()

            if(!url) 
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid URL' })

            if(!isValidURL(url))
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid URL' })

            iframe.src = encodeURI(url)
            iframe.style.display = "block"
        })

        addBtn.addEventListener("click", async() => {
            const name = encodeURIComponent(nameInput.value.trim())
            const url = urlInput.value.trim()
    
            if(!name || !url) 
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid tool name and URL' })

            if(!isValidURL(url))
                return TPEN.eventDispatcher.dispatch("tpen-toast", { status: "error", message: 'Please enter a valid URL' })
    
            const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/addtools`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${TPEN.getAuthorization()}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([{
                        name, 
                        value: name.toLowerCase().split(" ").join("-"), 
                        url: encodeURI(url), 
                        state: true
                }])
            })

            modal.style.display = "none"
            iframe.style.display = "none"
            nameInput.value = ""
            urlInput.value = ""
    
            if(!response.ok)
                return
    
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

            const response = await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/updatetools`, {
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
    }    
}

customElements.define("tpen-project-tools", ProjectTools)