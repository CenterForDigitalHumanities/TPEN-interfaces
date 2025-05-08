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
        this.shadowRoot.innerHTML = `
            <style>
                .container, .project-tools {
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
                .tool-card, .project-tool {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                }
                .project-tools-title {
                    font-weight: bold;
                    font-size: 16px;
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
                    max-width: 800px;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    position: relative;
                }
                .modal-inputs {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .modal-inputs input {
                    flex: 1;
                    padding: 6px;
                }
                iframe {
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
                button {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    background: #007bff;
                    color: #fff;
                }
                button.secondary {
                    background: #6c757d;
                }
                .close-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #dc3545;
                    color: #fff;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                #open-modal-btn {
                    margin-left: 20px;
                    background: var(--accent);
                }
            </style>

            <div class="project-tools-title">User Tools</div>
            <div class="container">
                ${[
                    "Compare Pages",
                    "Parsing Adjustment",
                    "Preview Tool",
                    "History Tool",
                    "Linebreaking Tool",
                    "View Full Page",
                    "XML Tags",
                    "Special Characters",
                    "Inspect",
                    "Page Tools",
                    "RTL mode"
                ].map(tool => `
                    <div class="tool-card">
                        <input type="checkbox" name="tools" value="${tool}">
                        <label>${tool}</label>
                    </div>
                `).join("")}
            </div>
            <div class="project-tools-title">Project Tools <button id="open-modal-btn">Add iFrame Tool</button></div>
            <div class="project-tools">
                ${[
                    "Cappelli's Abbreviations",
                    "Latin Vulgate Search",
                    "Latin Dictionary",
                    "Middle English Dictionary",
                    "French Dictionary",
                    "Dictionary of Old English"
                ].map(tool => `
                    <div class="project-tool">
                        <input type="checkbox" name="tools" value="${tool}">
                        <label>${tool}</label>
                    </div>
                `).join("")}
            </div>
            <div class="project-tools-title"></div>

            <div class="modal" id="tool-modal">
                <div class="modal-content">
                    <button class="close-btn" id="close-modal-btn">Close</button>
                    <div class="modal-inputs">
                        <input type="text" id="modal-tool-name" placeholder="Tool Name" />
                        <input type="url" id="modal-tool-url" placeholder="Tool URL" />
                    </div>
                    <div class="modal-buttons">
                        <button id="test-tool-btn" class="secondary">Test</button>
                        <button id="add-tool-confirm-btn">Add</button>
                    </div>
                    <iframe id="tool-preview" style="display: none;"></iframe>
                </div>
            </div>
        `;
    
        // Setup listeners AFTER DOM insertion
        const modal = this.shadowRoot.querySelector("#tool-modal");
        const manageTools = document.querySelector("#manage-tools-btn");
        const openModalBtn = this.shadowRoot.querySelector("#open-modal-btn");
        const closeModalBtn = this.shadowRoot.querySelector("#close-modal-btn");
        const testBtn = this.shadowRoot.querySelector("#test-tool-btn");
        const addBtn = this.shadowRoot.querySelector("#add-tool-confirm-btn");
        const nameInput = this.shadowRoot.querySelector("#modal-tool-name");
        const urlInput = this.shadowRoot.querySelector("#modal-tool-url");
        const iframe = this.shadowRoot.querySelector("#tool-preview");
        const toolsContainer = this.shadowRoot.querySelector("#project-tools");
    
        openModalBtn.addEventListener("click", () => {
            modal.style.display = "flex";
            iframe.style.display = "none";
            nameInput.value = "";
            urlInput.value = "";
        });
    
        closeModalBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    
        testBtn.addEventListener("click", () => {
            const url = urlInput.value.trim();
            if (url) {
                iframe.src = url;
                iframe.style.display = "block";
            }
        });
    
        addBtn.addEventListener("click", () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if (name && url) {
                const div = document.createElement("div");
                div.className = "project-tool";
                div.innerHTML = `<a href="${url}" target="_blank" class="tool-button" contenteditable="true">${name}</a>`;
                toolsContainer.appendChild(div);
                modal.style.display = "none";
            }
        });
    }    
}

customElements.define("tpen-project-tools", ProjectTools)