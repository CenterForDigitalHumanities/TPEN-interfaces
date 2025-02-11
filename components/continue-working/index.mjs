class ContinueWorking extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                .tpen-continue-working {
                    padding: 10px;
                    display: flex;
                    gap:10px
                }
                .section {
                    margin-bottom: 15px;
                    cursor:pointer;
                    transition:all 0.3s linear;
                    &:hover{
                    transform:scale(0.9)
                    }
                }
                .section img {
                    width: 100%;
                    height: auto;
                    border-radius: 4px;
                }
            </style>
            <div class="tpen-continue-working">
                <div class="section" id="last-open">
                    <h3>Last Open</h3>
                    <img src="../assets/images/manuscript_img.webp">
                </div>
                <div class="section" id="recent-changes">
                    <h3>Recent Changes</h3>
                    <img src="../assets/images/manuscript_img.webp">
                </div>
                <div class="section" id="newest-project">
                    <h3>Newest Project</h3>
                    <img src="../assets/images/manuscript_img.webp">
                </div>
            </div>
        `
    }
}

customElements.define('tpen-continue-working', ContinueWorking) 