import TPEN from "../../api/TPEN.js"

class DeclineInvite extends HTMLElement {
    #user
    #email
    #project
    #projectTitle
    #servicesURL = "http://localhost:3012"

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
        // Since we don't want to do anything that involves auth we can only use the information passed in.
        // We can't use new User(userId) and new Project(projectId) or even TPEN in here.  They require authentication.
        this.#user = new URLSearchParams(window.location.search).get('user')
        this.#email = new URLSearchParams(window.location.search).get('email')
        this.#project = new URLSearchParams(window.location.search).get('project')
        this.#projectTitle = new URLSearchParams(window.location.search).get('title') ?? "TPEN3 Project"
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

            </style>
            <h3>RE: ${this.#projectTitle}</h3>
            <h4> Invitee: <code> ${this.#email} </code> </h4>
            <p>
                Declining this invitation will remove you from project details and you will no longer appear in the project.
                Your E-mail address will not be stored and you will not be a TPEN3 User.  
                Once you decline you will have to be invited into the project again.
            </p>
            <p>
                You can sign up to be a TPEN3 user without accepting the invitation 
                <a href="https://three.t-pen.org/login?returnTo=https://app.t-pen.org">by clicking here</a>.
            </p>
            <input id="declineBtn" type="button" value="I Decline My Invitation" />
        `
        this.attachEventListeners()
    }

    attachEventListeners() {
        const declineBtn = this.shadowRoot.getElementById("declineBtn")
        declineBtn.addEventListener('click', (ev) => this.declineInvitation(this.#user, this.#project))
    }

    async declineInvitation(collaboratorID, projectID) {
        console.log(`/project/${this.#project}/collaborator/${this.#user}/decline`)
        await fetch(`${TPEN.servicesURL}/project/${this.#project}/collaborator/${this.#user}/decline`)
        .then(resp => {
            if(resp.ok) return resp.text()
            return resp.json()
        })
        .then(message => {
            let userMessage = (typeof message === "string") ? message : message?.message
            this.shadowRoot.innerHTML = `
                <h3> ${userMessage} </h3>
            `
        })
        .catch(err => {
             this.shadowRoot.innerHTML = `
                <h3> 
                    There was an error declining this the invitation.  Refresh the page to try again.  
                    Contact the TPEN3 Administrators if you must. 
                </h3>
            `
        })
        // const replacer = location.pathname + 
        // location.search
        // .replace(/[\?&]userID=[^&]+/, '')
        // .replace(/[\?&]projectID=[^&]+/, '')
        // history.replaceState(null, "", replacer)
    }
}

customElements.define('tpen-project-decline-invite', DeclineInvite)
