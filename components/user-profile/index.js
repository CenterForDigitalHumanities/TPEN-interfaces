import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class UserProfile extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }
    user = TPEN.currentUser

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        TPEN.eventDispatcher.on('tpen-user-loaded', ev => {
            this.updateProfile(ev.detail)
            this.user = ev.detail
        })
    }

    connectedCallback() {
        this.render()
        TPEN.attachAuthentication(this)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-user-id') {
            if (oldValue !== newValue) {
                const currVal = this?.user?._id
                if (newValue === currVal) return
                const loadedUser = new User(newValue)
                loadedUser.authentication = TPEN.getAuthorization()
                loadedUser.getProfile()
            }
        }
    }

    updateProfile(profile) {
        this.shadowRoot.querySelector('#nameText').textContent = profile.displayName
        this.shadowRoot.querySelector('#emailText').textContent = profile.email
        this.shadowRoot.querySelector('#profile').textContent = JSON.stringify(this.getPublicProfile(profile), null, 2).replace(/^\s*[{]\s*|^\s*[}]\s*$|^\s*[\r\n]+/gm, '')

        const metadata = this.shadowRoot.querySelector('#metadata')
        metadata && (metadata.textContent = JSON.stringify(this.getMetadata(profile), null, 2).replace(/^\s*[{]\s*|^\s*[}]\s*$|^\s*[\r\n]+/gm, ''))
    }

    getMetadata(userData) {
        const { baseURL, profile, displayName, '@type': type, ...metadata } = userData
        return metadata
    }

    getPublicProfile(profile) {
        return profile.profile
    }

    async render() {
        const showMetadata = this.hasAttribute('show-metadata') && this.getAttribute('show-metadata') !== 'false'
        this.shadowRoot.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

                .user-name, .user-email, .user-public-profile, .user-metadata {
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1rem;
                }

                .user-em {
                    min-width: 200px;
                    font-style: normal;
                    font-weight: 600;
                    color: #444;
                }

                .user-name-text, .user-email-text {
                    font-weight: 500;
                    color: #333;
                }

                .user-name-input, .user-email-input {
                    padding: 0.4rem 0.6rem;
                    font-size: 0.95rem;
                    font-family: inherit;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    transition: border-color 0.2s ease-in-out;
                    flex: 1;
                    background-color: #f9f9f9;
                }

                .user-name-input:focus, .user-email-input:focus {
                    border-color: #0077ff;
                    background-color: #fff;
                    outline: none;
                }

                .default-btn {
                    margin-top: 0.5rem;
                    margin-right: 0.5rem;
                    padding: 0.45rem 1.1rem;
                    font-size: 0.92rem;
                    font-weight: 500;
                    font-family: inherit;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background-color 0.2s ease-in-out, transform 0.1s;
                }

                #editBtn {
                    background-color: #007bff;
                    color: white;
                }

                #saveBtn {
                    background-color: #28a745;
                    color: white;
                }

                #cancelBtn {
                    background-color: #dc3545;
                    color: white;
                }

                .default-btn:hover {
                    opacity: 0.9;
                    transform: scale(1.02);
                }

                .btn-container {
                    display: flex;
                    justify-content: center;
                }

                .user-pre {
                    background: #f4f4f4;
                    padding: 0.75rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    white-space: pre-wrap;
                    word-break: break-word;
                    color: #333;
                    font-family: 'Courier New', Courier, monospace;
                }
            </style>

    
            <div class="user-profile-div">
                <p class="user-name"><em class="user-em">Display Name:</em> 
                    <span class="user-name-text" id="nameText">loading...</span>
                    <input type="text" class="user-name-input" name="displayName" id="nameInput" style="display: none;" required />
                </p>
                <p class="user-email"><em class="user-em">Email:</em> 
                    <span class="user-email-text" id="emailText">loading...</span>
                </p>
                <p class="user-public-profile"><em class="user-em">Public Profile:</em><pre class="user-pre" id="profile">loading...</pre></p>
                ${showMetadata ? `<p class="user-metadata"><em class="user-em">Metadata:</em><pre class="user-pre" id="metadata">loading...</pre></p>` : ''}
                <div class="btn-container">
                    <button class="default-btn" id="editBtn">Update Profile</button>
                    <button class="default-btn" id="saveBtn" style="display: none;">Save</button>
                    <button class="default-btn" id="cancelBtn" style="display: none;">Cancel</button>
                </div>
            </div>
        `
    
        const nameText = this.shadowRoot.querySelector('#nameText')
        const emailText = this.shadowRoot.querySelector('#emailText')
        const nameInput = this.shadowRoot.querySelector('#nameInput')
        const editBtn = this.shadowRoot.querySelector('#editBtn')
        const saveBtn = this.shadowRoot.querySelector('#saveBtn')
        const cancelBtn = this.shadowRoot.querySelector('#cancelBtn')
        const divBtn = this.shadowRoot.querySelector('.btn-container')
        const profile = this.shadowRoot.querySelector('#profile')
    
        editBtn.addEventListener('click', () => {
            nameInput.value = nameText.textContent
            nameText.style.display = 'none'
            nameInput.style.display = 'inline-block'
            divBtn.style.justifyContent = 'flex-end'
            editBtn.style.display = 'none'
            saveBtn.style.display = 'inline-block'
            cancelBtn.style.display = 'inline-block'
        })
    
        cancelBtn.addEventListener('click', () => {
            return TPEN.eventDispatcher.dispatch('tpen-toast', 
                { message: 'Clicked Cancel Button', status: "error", type: "notice" }
            )
            nameInput.style.display = 'none'
            nameText.style.display = 'inline'
            emailText.style.display = 'inline'
            editBtn.style.display = 'inline-block'
            saveBtn.style.display = 'none'
            cancelBtn.style.display = 'none'
        })
    
        saveBtn.addEventListener('click', async () => {

            return TPEN.eventDispatcher.dispatch('tpen-toast', 
                { message: 'Clicked Save Button', status: "info", type: "alert" }
            )

            const newName = nameInput.value.trim()
    
            if (!/^[a-zA-Z0-9\s._'-@#]+$/.test(newName)) {
                return TPEN.eventDispatcher.dispatch('tpen-toast', 
                    { message: 'Please enter a valid name', status: "error" }
                )
            }

            if (!newName) {
                return TPEN.eventDispatcher.dispatch('tpen-toast',
                    { message: 'Please enter a valid name', status: "error" }
                )
            }

            const response = await fetch(`${TPEN.servicesURL}/my/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TPEN.getAuthorization()}`
                },
                body: JSON.stringify({ displayName: newName })
            })

            if (!response.ok) {
                const errorData = await response.json()
                return TPEN.eventDispatcher.dispatch('tpen-toast', 
                  { message: errorData.message, status: "error" }
                )
            }
            else {
                TPEN.eventDispatcher.dispatch('tpen-toast', 
                    { message: "Profile updated!", status: "info" }
                )
            }
    
            nameText.textContent = newName
            profile.textContent = `"displayName": "${newName}"`
            nameInput.style.display = 'none'
            nameText.style.display = 'inline'
            emailText.style.display = 'inline'
            editBtn.style.display = 'inline-block'
            saveBtn.style.display = 'none'
            cancelBtn.style.display = 'none'
        })
    }
}

customElements.define('tpen-user-profile', UserProfile)
