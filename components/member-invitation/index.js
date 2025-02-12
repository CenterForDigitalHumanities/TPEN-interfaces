import TPEN from "../../api/TPEN.mjs"

class InviteMemberElement extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }
    
    connectedCallback() {
        this.render()
        this.addEventListeners()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                #invite-section-container {
                    padding: 20px;
                    background-color: #ffebb9;
                    border-radius: 5px;
                    // box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }

                .title {
                    font-size: 20px;
                    margin: 10px 0 20px;
                    font-weight: 500;
                    color : #b14628;
                }

                p {
                    font-size: 0.875rem;
                    color: #333;
                }

                #invite-form {
                    display: flex;
                    justify-content: flex-start;
                    align-items: center;
                    gap: 10px;
                }

                label {
                    font-size: 0.9rem;
                    color: black;
                }

                input[type="email"] {
                    padding: 8px;
                    font-size: 1rem;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    width: 30%;
                }

                .submit-btn {
                    padding: 10px 15px;
                    font-size: 1rem;
                    background-color: #69acc9;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .submit-btn:hover {
                    background-color: #0056b3;
                }

                .error-message {
                    color: red;
                    font-size: 0.875rem;
                    display: none; /* Initially hidden */
                }

                .error {
                    color: red;
                    font-size: 0.875rem;
                }
            </style>
            <div class="owner-leader-action is-hidden" id="invite-section-container">
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

        `
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
            this.shadowRoot.querySelector('#errorHTML').innerHTML = error.message
            this.shadowRoot.querySelector('#submit').textContent = "Submit"
            this.shadowRoot.querySelector('#submit').disabled = false
        }
    }
}

customElements.define('invite-member', InviteMemberElement)
