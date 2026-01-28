import TPEN from "../../api/TPEN.js"
import CheckPermissions from '../../components/check-permissions/checkPermissions.js'
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * InviteMemberElement - Provides a form to invite new members to a project.
 * Requires MEMBER create access.
 * @element invite-member
 */
class InviteMemberElement extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Removes component if user lacks MEMBER create access.
     */
    authgate() {
        if (!CheckPermissions.checkCreateAccess("MEMBER", "*")) {
            this.remove()
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
            .success-message {
                color: green;
                background-color: #e6ffe6;
                padding: 10px;
                border: 1px solid #c3e6c3;
                border-radius: 5px;
                margin: 0 auto;
                margin-bottom: 10px;
                text-align: center;
                width: 100%;
            }
            .error-padding {
                padding: 10px;
                border: 1px solid #f87563;
            }
            </style>
            <div part="invite-section-container" class="owner-leader-action is-hidden" id="invite-section-container">
                <h4 part="title" class="title">Add a new group member</h4>
                <p part="description">
                    If you add an email that is not a current TPEN user, we will invite them to join TPEN and your
                    project
                </p>
                <form part="invite-form" id="invite-form">
                    <label part="email-label" for="invitee-email">Invitee's Email</label>
                    <input part="email-input" type="email" name="invitee-email" id="invitee-email" required>
                    <button part="submit-button" type="submit" id="submit" class="submit-btn">Submit</button>
                    <p part="error-message" id="error" class="error-message"></p>
                </form>
            </div>
            <div part="error" id="errorHTML" class="error"></div>

        `
        this.addEventListeners()
    }

    addEventListeners() {
        const inviteForm = this.shadowRoot.querySelector("#invite-form")
        inviteForm.addEventListener("submit", this.inviteUser.bind(this))
    }

    async inviteUser(event) {
        event.preventDefault()
        try {
            const emailInput = this.shadowRoot.querySelector('#invitee-email');
            let email = emailInput.value.trim();

            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                throw new Error("Please enter a valid email address.");
            }

            const sqlInjectionRegex = /['";\-\-]/;
            if (sqlInjectionRegex.test(email)) {
                throw new Error("Invalid characters detected in the email address.");
            }

            if (!email) {
                throw new Error("Email address cannot be empty.");
            }

            this.shadowRoot.querySelector('#submit').textContent = "Inviting..."
            this.shadowRoot.querySelector('#submit').disabled = true

            const response = await TPEN.activeProject.addMember(this.shadowRoot.querySelector('#invitee-email').value)
            if (!response) throw new Error("Invitation failed")
            
            this.shadowRoot.querySelector('#submit').textContent = "Submit"
            this.shadowRoot.querySelector('#submit').disabled = false
            this.shadowRoot.querySelector('#invitee-email').value = ""

            const successMessage = document.createElement("p")
            successMessage.textContent = "Invitation sent successfully!"
            successMessage.classList.add("success-message")
            this.shadowRoot.querySelector('#invite-form').appendChild(successMessage)

            setTimeout(() => {
                successMessage.remove()
            }, 3000)
        } catch (error) {
            setTimeout(() => {
                this.shadowRoot.querySelector('#errorHTML').innerHTML = ''
            }, 3000)
            this.shadowRoot.querySelector('#errorHTML').classList.add("error-padding")
            this.shadowRoot.querySelector('#errorHTML').innerHTML = error.message
            this.shadowRoot.querySelector('#submit').textContent = "Submit"
            this.shadowRoot.querySelector('#submit').disabled = false
        }
    }
}

customElements.define('invite-member', InviteMemberElement)
