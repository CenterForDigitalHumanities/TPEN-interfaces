import TPEN from "../../api/TPEN.js"
import { decodeUserToken } from '../iiif-tools/index.js'

class LeaveProject extends HTMLElement {

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.shadowRoot.innerHTML = `
            <h3>Loading...</h3>
        `
        if (TPEN.activeProject?._id) this.render.bind(this)
        TPEN.eventDispatcher.on('tpen-project-loaded', this.render.bind(this))
        TPEN.eventDispatcher.on('tpen-project-load-failed', (err) => {
            this.shadowRoot.innerHTML = `
                <h3>Project Error</h3>
                <p>Could not load project.  The project may not exist at all.</p>
            `
        })
    }

    render() {
        const agent = decodeUserToken(this.userToken)['http://store.rerum.io/agent']
        let collaboratorIdList = []
        let leaderCount = 0
        for (const key in TPEN.activeProject.collaborators) {
            collaboratorIdList.push(key)
            if (TPEN.activeProject.collaborators[key].roles.includes("LEADER")) leaderCount++
        }
        if (!agent || !collaboratorIdList.includes(agent.split("/").pop())) {
            this.shadowRoot.innerHTML = `
                <h3>User Error</h3>
                <p>The user agent could not be detected or does not have access to this page.</p>
            `
            return
        }
        if (TPEN.activeProject.collaborators[agent.split("/").pop()].roles.includes("OWNER")) {
            this.shadowRoot.innerHTML = `
                <h3>User Error</h3>
                <p>You are the owner for this project.  You must transfer ownership before you leave.</p>
            `
            return
        }
        if (TPEN.activeProject.collaborators[agent.split("/").pop()].roles.includes("LEADER") && leaderCount === 1) {
            this.shadowRoot.innerHTML = `
                <h3>User Error</h3>
                <p>You are the last remaining leader.  You must appoint another leader before you leave.</p>
            `
            return
        }
        this.shadowRoot.innerHTML = `
            <style>
                #leaveBtn {
                    background-color: var(--primary-color);
                    padding: 10px 20px;
                    cursor: pointer;
                    color: white;
                    border: none;
                    font-size: 15pt;
                    margin-top: 1em;
                }

                #leaveBtn:hover {
                    background-color: var(--accent);
                }

                h2 {
                    color: var(--accent);
                }

            </style>
            <h2>Leave ${TPEN.activeProject.label}</h2>
            <p>
                When you leave a project you lose any access to it you have and may no 
                longer be able to see some content, even content you created. You will no 
                longer appear as a collaborator and the project will not appear in your projects 
                list.  To restore access you will have to be invited into the project again.
            </p>
            <button id="leaveBtn">I Am Ready To Leave This Project</button>
        `
        this.attachEventListeners()
    }

    attachEventListeners() {
        const leaveBtn = this.shadowRoot.getElementById("leaveBtn")
        leaveBtn.addEventListener('click', (ev) => this.leaveProject())
    }

    leaveProject() {
        if (!confirm("You are leaving this TPEN3 project.")) return
        let redir = true
        const leaveBtn = this.shadowRoot.getElementById("leaveBtn")
        leaveBtn.setAttribute("disabled", "disabled")
        leaveBtn.setAttribute("value", "leaving...")

        fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TPEN.getAuthorization()}`
            }
        })
        .then(resp => {
            if (resp.ok) return resp.text()
            redir = false
            return resp.json()
        })
        .then(message => {
            let userMessage = (typeof message === "string") ? message : message?.message
            if (redir) {
                this.shadowRoot.innerHTML = `
                    <h3>Now you are not a project member.  Goodbye 👋</h3>
                `
                setTimeout(() => {
                  document.location.href = TPEN.BASEURL
                }, 3000)
                return
            }
            this.shadowRoot.innerHTML = `
                <h3>There was an error leaving the project.</h3>
                <p>
                    The message below has more details.
                    Refresh the page to try again or contact the TPEN3 Administrators.  
                </p>
                <code>${userMessage}<code>
            `
        })
        .catch(err => {
             this.shadowRoot.innerHTML = `
                <h3> 
                    There was an error leaving the project.  Refresh the page to try again 
                    or contact the TPEN3 Administrators. 
                </h3>
            `
        })
    }
}

customElements.define('tpen-project-leave', LeaveProject)
