class ContinueWorking extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                /* Add styles for the continue working component */
                .continue-working {
                    padding: 10px;
                    display: flex;
                }
                .section {
                    margin-bottom: 15px;
                }
                .section img {
                    width: 100%;
                    height: auto;
                    border-radius: 4px;
                }
            </style>
            <div class="continue-working">
                <div class="section" id="last-open">
                    <h3>Last Open</h3>
                    <img src="path/to/last-open-thumbnail.jpg" alt="Last Open Thumbnail">
                </div>
                <div class="section" id="recent-changes">
                    <h3>Recent Changes</h3>
                    <img src="path/to/recent-changes-thumbnail.jpg" alt="Recent Changes Thumbnail">
                </div>
                <div class="section" id="newest-project">
                    <h3>Newest Project</h3>
                    <img src="path/to/newest-project-thumbnail.jpg" alt="Newest Project Thumbnail">
                </div>
            </div>
        `
    }
}

customElements.define('continue-working', ContinueWorking) 