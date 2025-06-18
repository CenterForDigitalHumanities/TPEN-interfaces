import TPEN from "../../api/TPEN.js"

class DeclineInvite extends HTMLElement {
    #user
    #email
    #project
    #projectTitle

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <h3> Loading... </h3>
        `
        this.load()
    }

    load() {
        this.#user = new URLSearchParams(window.location.search).get('user')
        this.#email = new URLSearchParams(window.location.search).get('email')
        this.#project = new URLSearchParams(window.location.search).get('project')
        this.#projectTitle = new URLSearchParams(window.location.search).get('projectTitle') ?? "TPEN3 Project"
        if(!(this.#user && this.#project)) {
            this.shadowRoot.innerHTML = `
                <h3> You must provide <code>user=</code> and <code>project=</code> as URL Parameters. </h3>
            `
            return
        }
        this.render()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                #declineBtn {
                    background-color: var(--primary-color);
                    padding: 10px 20px;
                    cursor: pointer;
                    color: white;
                    border: none;
                    font-size: 15pt;
                }

                #declineBtn:hover {
                    background-color: var(--accent);
                }

            </style>
            <h3>RE: ${this.#projectTitle}</h3>
            <h4> Invitee: <code> ${this.#email} </code> </h4>
            <p>
                Declining the invitation will remove you from project details and you will no longer appear in the project.
                Your E-mail address will not be stored and you will not be a TPEN3 User.  
                Once you decline you will have to be invited into the project again.
            </p>
            <button id="declineBtn">I Decline My Invitation</button>
        `
        this.attachEventListeners()
    }

    attachEventListeners() {
        const declineBtn = this.shadowRoot.getElementById("declineBtn")
        declineBtn.addEventListener('click', (ev) => this.declineInvitation(this.#user, this.#project))
    }

    async declineInvitation(collaboratorID, projectID) {
        if(!confirm("You are declining a chance to be a part of this TPEN3 project.")) return
        let redir = true
        const declineBtn = this.shadowRoot.getElementById("declineBtn")
        declineBtn.setAttribute("disabled", "disabled")
        declineBtn.setAttribute("value", "declining...")
        await fetch(`${TPEN.servicesURL}/project/${this.#project}/collaborator/${this.#user}/decline`)
        .then(resp => {
            if(resp.ok) return resp.text()
            redir = false
            return resp.json()
        })
        .then(message => {
            let userMessage = (typeof message === "string") ? message : message?.message
            if(redir) {
                this.shadowRoot.innerHTML = `
                    <h3> ${userMessage} </h3>
                `
                setTimeout(() => {
                  document.location.href = TPEN.TPEN3URL
                }, 3000)
                return
            }
            this.shadowRoot.innerHTML = `
                <h3> 
                    There was an error declining this the invitation.  The message below has more details.
                    Refresh the page to try again or contact the TPEN3 Administrators.  
                </h3>
                <code> ${userMessage} <code>
            `
        })
        .catch(err => {
             this.shadowRoot.innerHTML = `
                <h3> 
                    There was an error declining this the invitation.  Refresh the page to try again 
                    or contact the TPEN3 Administrators. 
                </h3>
            `
        })
    }
}

customElements.define('tpen-project-decline-invite', DeclineInvite)
