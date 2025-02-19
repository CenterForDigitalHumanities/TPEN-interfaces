import User from "../../api/User.mjs"
import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

export default class ProjectNavigation extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-project', 'tpen-user-id']
    }
    activeProject = {}
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
        eventDispatcher.on("tpen-project-loaded", ev => this.activeProject = ev.detail)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            switch (name) {
                case 'tpen-project':
                    this.handleProjectChange(newValue)
                    break
                case 'tpen-user-id':
                    this.handleUserChange(newValue)
                    break
            }
        }
    }

    handleProjectChange(projectId) {
        console.log(`Project changed to: ${projectId}`)
    }

    handleUserChange(userId) {
        console.log(`User changed to: ${userId}`)
        console.log(TPEN.currentUser)
    }

    async connectedCallback() {
        TPEN.attachAuthentication(this)
        this.render()
    }

    render() {
        this.shadowRoot.innerHTML = `
       <style>
        *{
            padding: 0;
            margin: 0;
        }
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 10px;
            border: 1px solid grey;
            margin:5px 0px;
        }

        .labels {
            width: 40%;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .nav-icon {
            width: 20px;
            cursor: pointer;
        }

        .nav-icon img {
            width: 100%;
        }

        .line-indicator{
            border: 1px dashed;
        }
        .line-indicator, select{
            padding: 5px;
            border-radius: 5px;
        }

        .control-buttons{
            display: flex;
            align-items: center;
            gap: 20px;
        }
    </style>
    <nav>
        <section class="labels">
            <div class="project-title">Project Title</div>
            <div class="canvas-label"><Select>
                    <option value="">Canvas label</option>
                </Select></div>

        </section>

        <select name="" id="">
            <option value="">Layer 1 label</option>
        </select>
        <div class="line-indicator">Line indicator</div>

        <div class="control-buttons">
            <div class="nav-icon"><img draggable="false" src="../../assets/icons/home.png" alt=""></div>
            <div class="nav-icon"><img draggable="false" src="../../assets/icons/contact.png" alt=""></div>
            <div class="nav-icon"><img draggable="false" src="../../assets/icons/profile.png" alt=""></div>
        </div>
    </nav>
        `
    }


}

customElements.define('tpen-project-navigation', ProjectNavigation)
