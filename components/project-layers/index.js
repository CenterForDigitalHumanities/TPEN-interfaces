import TPEN from "../../api/TPEN.js"

class ProjectLayers extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        TPEN.eventDispatcher.on('tpen-project-loaded', () => this.render())
    }

    render() {
        const layers = TPEN.activeProject.layers
        this.shadowRoot.innerHTML = `
            <style>
            .container {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .layer-card {
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
                user-select: text;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .info-list {
                display: flex;
                flex-direction: column;
                list-style: none;
                padding: 0;
                margin: 0;
                flex: 1;
            }

            .info-item {
                display: flex;
                padding: 8px 20px;
                border-radius: 4px;
            }

            .info-item span {
                display: inline-block;
                overflow-wrap: break-word;
                word-break: break-word;
                line-height: 1.5;
            }

            .info-label {
                font-weight: bold;
                width: 20%;
                font-size: 0.9em;
                vertical-align: top;
                color: var(--primary-color, #007bff);
                user-select: text;
            }

            .info-value {
                width: 80%;
                font-size: 0.9em;
                margin-left: auto;
                user-select: text;
            }

            .footer {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                padding: 4px 16px 4px 8px;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                background-color: var(--light-color);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
            }

            .footer-label {
                border-radius: 4px;
                color: var(--primary-color);
                user-select: text;
                letter-spacing: 0.5px;
            }

            @media (max-width: 1080px) {
                .info-list {
                height: 18em;
                }
            }
            </style>

            <div class="container">
            ${layers.map((layer, index) => `
                <div class="layer-card">
                <ul class="info-list">
                    <li class="info-item">
                    <span class="info-label">Layer ${index + 1}</span>
                    <span class="info-value">${layer["@id"] ?? layer.id}</span>
                    </li>
                </ul>
                <div class="footer">
                    <span class="footer-label">Pages Count: ${layer.pages.flat().length}</span>
                </div>
                </div>
            `).join("")}
            </div>
        `
    }
}

customElements.define("tpen-project-layers", ProjectLayers)