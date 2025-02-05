class NewAction extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style> 
                .new-action {
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    // align-items: left;
                }
                button {
                    margin: 5px;
                    border:none;
                    background-color: transparent;
                    color: black;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    &:hover {
                        font-weight: 600;
                    }
                }
            </style>
            <div class="new-action">
                <button>Create a New Project</button>
                <button>Import a Resource</button>
                <button>Upgrade from TPEN 2.8</button>
            </div>
        `
    }
}

customElements.define('new-action', NewAction) 