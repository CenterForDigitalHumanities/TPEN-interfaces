class TPENCard extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })

        const style = document.createElement('style')
        style.textContent = `
            .card {
                background-color: var(--white);
                border: 1px solid var(--gray);
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                height          : 100%;
                min-height      : 10em;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .card-header, .card-body, .card-footer > * {
                display: block;
                padding: .5em;
            }
            .card-body {
                margin-bottom: 2em;
                flex-grow: 1;
                overflow: auto;
            }
            .card-header {
                color: var(--accent);
                border-bottom: 1px solid var(--gray);
                font-size: .8em;
            }
            .card-footer {
                display: flex;
                justify-content: flex-start;
                flex-direction: row-reverse;
                background-color: var(--gray);
                text-align: right;
                position: absolute;
                bottom: 0;
                width: 100%;
                gap: 5px;
            }
            .card-icon {
                display: flex;
                justify-content: center;
                align-items: center;
                padding-top: 0em;
                padding-bottom: 0em;
                font-size:2.5em;
            }
            ::slotted(a) {
                background-color: var(--primary-color);
                text-transform: capitalize;
                outline: var(--primary-light) 1px solid;
                outline-offset: -3.5px;
                color: var(--white) !important;
                border-radius: 5px;
                text-decoration: none;
                padding: 0.5em 1em !important;
                transition: all 0.3s;
            }
            ::slotted(a:hover) {
                background-color: var(--primary-light);
                outline: var(--primary-color) 1px solid;
                outline-offset: -1.5px;
            }
            ::slotted(button) {
                background-color: var(--primary-color) !important;
                text-transform: capitalize;
                outline: var(--primary-light) 1px solid;
                outline-offset: -3.5px;
                color: var(--white) !important;
                border-radius: 5px;
                transition: all 0.3s;
            }
            ::slotted(button:hover) {
                background-color: var(--primary-light) !important;
                text-transform: capitalize;
                outline: var(--primary-color) 1px solid;
                outline-offset: -1.5px;
            }
        `
        this.shadowRoot.appendChild(style)
        this.shadowRoot.innerHTML += `
            <div class="card">
                <slot name="header" class="card-header"></slot>
                <slot name="icon" class="card-icon" part="card-icon"></slot>
                <slot name="body" class="card-body" part="card-body"></slot>
                <slot name="footer" class="card-footer"></slot>
            </div>
        `
    }
}

customElements.define('tpen-card', TPENCard)
