import TPEN from "../../api/TPEN.mjs"

class InviteMemberElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        this.render();
        this.addEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <div class="owner-leader-action is-hidden " id="invite-section-container">
                <h4 class="title">Add a new group member</h4>
                <p>
                    If you add an email that is not a current TPEN user, we will invite them to join TPEN and your
                    project
                </p>
                <form id="invite-form">
                    <label for="invitee-email">Invitee's Email</label>
                    <input type="email" name="invitee-email" id="invitee-email" required>
                    <button type="submit" id="submit" class="submit-btn">Submit</button>
                    <p id="error" class="error-message"></p>
                </form>
            </div>
            <div id="errorHTML" class="error"></div>

        `;
    }

    addEventListeners() {
        const inviteForm = this.shadowRoot.querySelector("#invite-form");
        inviteForm.addEventListener("submit", this.inviteUser.bind(this));
    }

    async inviteUser(event) {
        event.preventDefault();

        try {
            this.shadowRoot.querySelector('#submit').textContent = "Inviting...";
            this.shadowRoot.querySelector('#submit').disabled = true;

            const response = await TPEN.activeProject.addMember(this.shadowRoot.querySelector('#invitee-email').value);
            if (!response) throw new Error("Invitation failed");
            
            this.shadowRoot.querySelector('#submit').textContent = "Submit";
            this.shadowRoot.querySelector('#submit').disabled = false;
            this.shadowRoot.querySelector('#invitee-email').value = "";

            const successMessage = document.createElement("p");
            successMessage.textContent = "Invitation sent successfully!";
            successMessage.classList.add("success-message");
            this.shadowRoot.querySelector('#invite-form').appendChild(successMessage);

            setTimeout(() => {
                successMessage.remove();
            }, 3000);
        } catch (error) {
            setTimeout(() => {
                this.shadowRoot.querySelector('#errorHTML').innerHTML = '';
            }, 3000);
            this.shadowRoot.querySelector('#errorHTML').innerHTML = error.message;
            this.shadowRoot.querySelector('#submit').textContent = "Submit";
            this.shadowRoot.querySelector('#submit').disabled = false;
        }
    }
}

customElements.define('invite-member', InviteMemberElement);
