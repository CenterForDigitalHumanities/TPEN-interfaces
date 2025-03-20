export default class TranscriptionInterface extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.state = {
            isSplitscreenActive: true,
        }
    }

    connectedCallback() {
        this.render()
        this.addEventListeners()
    }

    addEventListeners() {
        this.shadowRoot.addEventListener('splitscreen-toggle', () => this.toggleSplitscreen())
    }

    toggleSplitscreen() {
        this.state.isSplitscreenActive = !this.state.isSplitscreenActive
        this.render()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .transcription-interface {
                    display: flex;
                    height: 90vh;
                    align-items: flex-start;
                    gap: 5px;
                }
                .transcription-section {
                    width: ${this.state.isSplitscreenActive ? '60%' : '100%'}; /* Adjust width based on state */
                }
                .transcription-block {
                    border: 1px solid;
                    margin: 10px 0px;
                    padding: 10px;
                }
                .transcription-block input {
                    padding: 10px;
                    width: 90%;
                    border: none;
                    outline: none;
                }
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
                .splitscreen-tool-container {
                    border: 1px dashed;
                    width: 40%;
                    height: 100%;
                    display: ${this.state.isSplitscreenActive ? 'flex' : 'none'};  
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 600;
                    border-radius: 10px;
                }
                .flex-center {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
            <tpen-project-navigation></tpen-project-navigation>
            <div class="transcription-interface">
                <section class="transcription-section">
                    
                    <tpen-transcription-block></tpen-transcription-block>
                    <tpen-workspace-tools></tpen-workspace-tools>
                </section>
                <section class="splitscreen-tool-container">
                    <center>Splitscreen tool container (adjustable)</center>
                </section>
            </div>
        `
    }
}

customElements.define('tpen-transcription-interface', TranscriptionInterface)