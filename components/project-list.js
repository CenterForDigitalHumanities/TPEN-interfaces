class ProjectList extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        
        this.shadowRoot.innerHTML = `
            <style>
                /* Add styles for the project list */
                .project-list {
                    padding: 10px;
                }
            </style>
            <div class="project-list">
                <h3>Projects</h3>
                <ul>
                    <li>Project 1</li>
                    <li>Project 2</li>
                    <li>Project 3</li>
                </ul>
            </div>
        `
    }
}

customElements.define('project-list', ProjectList) 