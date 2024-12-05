import { fetchProjectData } from '../../TPEN/fetchData.mjs';

class ClassroomGroup extends HTMLElement {
    //  Call the parent class constructor to initialize this web component ClassroomGroup
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        console.log('ClassroomGroup component initialized.');
    }

    // This method watches for changes in the project-id attribute
    static get observedAttributes() {
        console.log('Observed attributes set to: project-id');
        return ['project-id'];
    }

    // This method runs when the project-id attribute changes and triggers the fetching of project data
    async attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'project-id' && newValue) {
            if (!this.TPEN) {
                console.error("TPEN instance not available. Ensure TPEN is set before using this component.");
                return;
            }

            try {
                // Fetch project data directly using fetchProjectData from fetchData.mjs
                const token = this.TPEN.getAuthorization();
                const projectData = await fetchProjectData(newValue, token);

                // Render data if fetchProjectData succeeds
                this.renderProjectData(projectData);
            } catch (error) {
                console.error('Error fetching project data:', error);
                this.shadowRoot.innerHTML = `<p>Error fetching project data: ${error.message}</p>`;
            }
        }
    }

    // This method renders the project data inside the component
    renderProjectData(projectData) {
        this.shadowRoot.innerHTML = `
            <div>
                <h2>Project Name: ${projectData.name}</h2>
                <p>Project Creator: ${projectData.creator}</p>
                <ul>
                    ${projectData.contributors.map(contributor => `<li>${contributor.name}</li>`).join('')}
                </ul>
            </div>
        `;
        console.log('Project data rendered successfully.');
    }
}

// Define the custom element
customElements.define('classroom-group', ClassroomGroup);