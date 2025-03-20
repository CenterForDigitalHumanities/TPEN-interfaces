export default class WorkspaceTools extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        this.render()
        this.addEventListeners()
    }

    addEventListeners() {
        const splitscreenTool = this.shadowRoot.querySelector('.splitscreen-tool')
        if (splitscreenTool) {
            splitscreenTool.addEventListener('click', () => {
                // Dispatch a custom event when the splitscreen tool is clicked
                this.dispatchEvent(new CustomEvent('splitscreen-toggle', {
                    bubbles: true,
                    composed: true,
                }))
            })
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .workspace-tools {
                    border: 1px solid red;
                    height: 50px;
                    margin: 10px 0px;
                    padding: 10px;
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    align-items: center;
                }
                .splitscreen-tool {
                    cursor: pointer;
                }
            </style>
            <div class="workspace-tools">
                <div class="splitscreen-tool">Splitscreen Tools</div>
                <div>Page Tools</div>
                <div>Hotkeys</div>
            </div>
        `
    }
}

customElements.define('tpen-workspace-tools', WorkspaceTools)