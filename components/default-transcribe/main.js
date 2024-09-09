// custom element named 'tpen-transcription' with a custom template built from the querystring 'projectID' parameter
class TpenTranscriptionElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const projectID = new URLSearchParams(window.location.search).get('projectID');
        if (projectID) {
            this.fetchProject(projectID);
        }
    }

    fetchProject(projectID) {
        fetch(`/transcriptions/${projectID}`)
            .then(response => response.json())
    }
}

