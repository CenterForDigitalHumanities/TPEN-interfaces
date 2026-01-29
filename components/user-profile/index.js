import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * UserProfile - Displays and allows editing of user profile information.
 * @element tpen-user-profile
 */
class UserProfile extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }
    user = TPEN.currentUser
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-user-loaded', ev => {
            this.render(ev.detail)
            this.updateProfile(ev.detail)
            this.user = ev.detail
        })
    }

    disconnectedCallback() {
        this.renderCleanup.run()
        this.cleanup.run()
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
        const publicProfile = this.getPublicProfile(profile)
        if (publicProfile.imageURL) {
            this.shadowRoot.querySelector('.user-image').src = publicProfile.imageURL === '' ? '../../assets/icons/user.png' : publicProfile.imageURL
            this.shadowRoot.querySelector('#userImageInput').value = publicProfile.imageURL ?? ''
        }

        const profileMap = {
            nameText: publicProfile.displayName.toUpperCase(),
            emailText: profile.email,
            orchidIdText: publicProfile.orchidId,
            nsfIdText: publicProfile.nsfId,
            institutionalIdText: publicProfile.institutionalId,
            linkedinText: publicProfile.linkedin,
            twitterText: publicProfile.twitter,
            instagramText: publicProfile.instagram,
            facebookText: publicProfile.facebook,
            githubText: publicProfile.github,
            homepageText: publicProfile.homepage
        }

        for (const [id, value] of Object.entries(profileMap)) {
            const el = this.shadowRoot.querySelector(`#${id}`)
            if (el) el.textContent = value || ''
        }

        const profileEl = this.shadowRoot.querySelector('#profile')
        if (profileEl) {
            profileEl.textContent = JSON.stringify(publicProfile, null, 2)
                .replace(/^\s*[{]\s*|^\s*[}]\s*$|^\s*[\r\n]+/gm, '')
        }

        const metadataEl = this.shadowRoot.querySelector('#metadata')
        if (metadataEl) {
            metadataEl.textContent = JSON.stringify(this.getMetadata(profile), null, 2)
                .replace(/^\s*[{]\s*|^\s*[}]\s*$|^\s*[\r\n]+/gm, '')
        }
    }

    getMetadata(userData) {
        const { baseURL, profile, displayName, '@type': type, ...metadata } = userData
        return metadata
    }

    getPublicProfile(profile) {
        return profile.profile
    }

    render(profile) {
        // Clear previous render-specific listeners before re-rendering
        this.renderCleanup.run()
        const showMetadata = this.hasAttribute('show-metadata') && this.getAttribute('show-metadata') !== 'false'
        const linkedin = this.getPublicProfile(profile).linkedin || ''
        const twitter = this.getPublicProfile(profile).twitter || ''
        const instagram = this.getPublicProfile(profile).instagram || ''
        const facebook = this.getPublicProfile(profile).facebook || ''
        const github = this.getPublicProfile(profile).github || ''
        const homepage = this.getPublicProfile(profile).homepage || ''
        this.shadowRoot.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

                :host {
                    font-family: 'Inter', sans-serif;
                }

                .user-name, .user-email, .user-public-profile, .user-metadata, .user-links, .user-ids {
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1rem;
                    padding: 0.3rem 0.5rem;
                    color: #333;
                }

                .user-em {
                    min-width: 150px;
                    font-style: normal;
                    font-weight: 600;
                    color: var(--primary-color);
                }

                .user-name-text, .user-email-text, .user-ids-text, .user-links-text {
                    font-weight: 500;
                    color: #333;
                    font-style: italic;
                    font-size: 0.9rem;
                }

                .user-name-input, .user-ids-input, .user-links-input {
                    padding: 0.4rem 0.6rem;
                    font-size: 0.95rem;
                    font-family: inherit;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    transition: border-color 0.2s ease-in-out;
                    flex: 1;
                    width: 100%;
                }

                .user-name-input:focus, .user-ids-input:focus, .user-links-input:focus {
                    border-color: #0077ff;
                    background-color: #fff;
                    outline: none;
                }

                .default-btn {
                    margin-top: 1rem;
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
                    background-color: var(--primary-color);
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
                    justify-content: flex-end;
                    gap: 0.6rem;
                    margin-right: 25px;
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

                .user-profile-image {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                }

                .user-profile-image-div {
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 0.5rem;
                    padding: 2px;
                    border: 3px solid orange;
                    box-shadow: 0 0 5px 5px hsla(186, 84%, 40%, 0.8);
                }

                .user-image {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                }

                #userImageInput {
                    margin-top: 0.75rem;
                    width: 80%;
                    margin-bottom: 1rem;
                    padding: 0.4rem 0.6rem;
                    font-size: 0.95rem;
                    font-family: inherit;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    transition: border-color 0.2s ease-in-out;
                }

                .user-profile-div {
                    width: 100%;
                }

                .user-profile-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.5rem;
                }

                .icons-list {
                    display: flex;
                    gap: 0.5rem;
                    margin: 2rem auto;
                    width: 100%;
                    justify-content: space-evenly;
                    align-items: center;
                }

                .icon {
                    width: 30px;
                    height: 30px;
                    margin-right: 0.5rem;
                    vertical-align: middle;
                }
            </style>
    
            <div class="user-profile-div">
                <div class="user-profile-image">
                    <div class="user-profile-image-div">
                        <img src="../../assets/icons/user.png" alt="User Profile Image" class="user-image">
                    </div>
                    <p class="user-profile-name" style="display: none;">
                        <em class="user-em">Profile Image URL</em>
                    </p>
                    <input type="text" id="userImageInput" placeholder="Enter Gravatar URL" class="user-image-input" style="display: none;" />
                </div>
                <p class="user-name">
                    <em class="user-em">Display Name</em> 
                    <span class="user-name-text" id="nameText">loading...</span>
                    <input type="text" class="user-name-input" id="nameInput" style="display: none;" required />
                </p>
                <p class="user-email">
                    <em class="user-em">Email</em> 
                    <span class="user-email-text" id="emailText">loading...</span>
                </p>
                <p class="user-ids">
                    <em class="user-em">Orchid ID</em>
                    <span class="user-ids-text" id="orchidIdText">loading...</span>
                    <input type="text" class="user-ids-input" id="orchidIdInput" style="display: none;" />
                </p>
                <p class="user-ids">
                    <em class="user-em">NSF ID</em>
                    <span class="user-ids-text" id="nsfIdText">loading...</span>
                    <input type="text" class="user-ids-input" id="nsfIdInput" style="display: none;" />
                </p>
                <p class="user-ids">
                    <em class="user-em">Institutional ID</em>
                    <span class="user-ids-text" id="institutionalIdText">loading...</span>
                    <input type="text" class="user-ids-input" id="institutionalIdInput" style="display: none;" />
                </p>
                <div class="icons-list">
                    <!-- Icon source: https://www.flaticon.com/free-icons/linkedin by Freepik -->
                    ${linkedin ? `<img class="icon" src="../../assets/icons/linkedin.png" alt="Linkedin" onclick="window.open('${linkedin}')" />` : ''}
                    <!-- Icon source: https://www.flaticon.com/free-icons/twitter by Freepik -->
                    ${twitter ? `<img class="icon" src="../../assets/icons/twitter.png" alt="Twitter" onclick="window.open('${twitter}')" />` : ''}
                    <!-- Icon source: https://www.flaticon.com/free-icons/facebook by Freepik -->
                    ${facebook ? `<img class="icon" src="../../assets/icons/facebook.png" alt="Facebook" onclick="window.open('${facebook}')" />` : ''}
                    <!-- Icon source: https://www.flaticon.com/free-icons/instagram by Freepik -->
                    ${instagram ? `<img class="icon" src="../../assets/icons/instagram.png" alt="Instagram" onclick="window.open('${instagram}')" />` : ''}
                    <!-- Icon source: https://www.flaticon.com/free-icons/github by Freepik -->
                    ${github ? `<img class="icon" src="../../assets/icons/github.png" alt="GitHub" onclick="window.open('${github}')" />` : ''}
                    <!-- Icon source: https://www.flaticon.com/free-icons/homepage by Freepik -->
                    ${homepage ? `<img class="icon" src="../../assets/icons/home-button.png" alt="HomePage" onclick="window.open('${homepage}')" />` : ''}
                </div>
                <div class="user-links-container" style="display: none;">
                    <p class="user-links">
                        <em class="user-em">LinkedIn</em>
                        <span class="user-links-text" id="linkedinText">loading...</span>
                        <input type="url" class="user-links-input" id="linkedinInput" style="display: none;" />
                    </p>
                    <p class="user-links">
                        <em class="user-em">Twitter</em>
                        <span class="user-links-text" id="twitterText">loading...</span>
                        <input type="url" class="user-links-input" id="twitterInput" style="display: none;" />
                    </p>
                    <p class="user-links">
                        <em class="user-em">Instagram</em>
                        <span class="user-links-text" id="instagramText">loading...</span>
                        <input type="url" class="user-links-input" id="instagramInput" style="display: none;" />
                    </p>
                    <p class="user-links">
                        <em class="user-em">Facebook</em>
                        <span class="user-links-text" id="facebookText">loading...</span>
                        <input type="url" class="user-links-input" id="facebookInput" style="display: none;" />
                    </p>
                    <p class="user-links">
                        <em class="user-em">GitHub</em>
                        <span class="user-links-text" id="githubText">loading...</span>
                        <input type="url" class="user-links-input" id="githubInput" style="display: none;" />
                    </p>
                    <p class="user-links">
                        <em class="user-em">Homepage</em>
                        <span class="user-links-text" id="homepageText">loading...</span>
                        <input type="url" class="user-links-input" id="homepageInput" style="display: none;" />
                    </p>
                </div>
                <div class="btn-container">
                    <button class="default-btn" id="editBtn">Update Profile</button>
                    <button class="default-btn" id="saveBtn" style="display: none;">Save</button>
                    <button class="default-btn" id="cancelBtn" style="display: none;">Cancel</button>
                </div>
            </div>
        `
    
        const inputs = {
            name: this.shadowRoot.querySelector('#nameInput'),
            orchidId: this.shadowRoot.querySelector('#orchidIdInput'),
            nsfId: this.shadowRoot.querySelector('#nsfIdInput'),
            institutionalId: this.shadowRoot.querySelector('#institutionalIdInput'),
            linkedin: this.shadowRoot.querySelector('#linkedinInput'),
            twitter: this.shadowRoot.querySelector('#twitterInput'),
            instagram: this.shadowRoot.querySelector('#instagramInput'),
            facebook: this.shadowRoot.querySelector('#facebookInput'),
            github: this.shadowRoot.querySelector('#githubInput'),
            homepage: this.shadowRoot.querySelector('#homepageInput')
        }

        const texts = {
            name: this.shadowRoot.querySelector('#nameText'),
            orchidId: this.shadowRoot.querySelector('#orchidIdText'),
            nsfId: this.shadowRoot.querySelector('#nsfIdText'),
            institutionalId: this.shadowRoot.querySelector('#institutionalIdText'),
            linkedin: this.shadowRoot.querySelector('#linkedinText'),
            twitter: this.shadowRoot.querySelector('#twitterText'),
            instagram: this.shadowRoot.querySelector('#instagramText'),
            facebook: this.shadowRoot.querySelector('#facebookText'),
            github: this.shadowRoot.querySelector('#githubText'),
            homepage: this.shadowRoot.querySelector('#homepageText')
        }

        const editBtn = this.shadowRoot.querySelector('#editBtn')
        const saveBtn = this.shadowRoot.querySelector('#saveBtn')
        const cancelBtn = this.shadowRoot.querySelector('#cancelBtn')
        const userImageInput = this.shadowRoot.querySelector('#userImageInput')
        const profileText = this.shadowRoot.querySelector('.user-profile-name')
        const iconsList = this.shadowRoot.querySelector('.icons-list')
        const linksContainer = this.shadowRoot.querySelector('.user-links-container')

        const toggleEditMode = (editing) => {
            profileText.style.display = editing ? 'block' : 'none'
            Object.values(inputs).forEach(inp => inp.style.display = editing ? 'inline-block' : 'none')
            Object.values(texts).forEach(txt => txt.style.display = editing ? 'none' : 'inline')
            editBtn.style.display = editing ? 'none' : 'inline-block'
            saveBtn.style.display = editing ? 'inline-block' : 'none'
            cancelBtn.style.display = editing ? 'inline-block' : 'none'
            userImageInput.style.display = editing ? 'inline-block' : 'none'
            iconsList.style.display = editing ? 'none' : 'flex'
            linksContainer.style.display = editing ? 'block' : 'none'
        }

        const imgElement = this.shadowRoot.querySelector('.user-image')
        userImageInput.value = imgElement.src || ''
        this.renderCleanup.onElement(userImageInput, 'input', (e) => {
            const url = e.target.value.trim()
            if (url) {
                imgElement.src = url
            }
        })

        this.renderCleanup.onElement(editBtn, 'click', () => {
            for (const key in inputs) {
                inputs[key].value = texts[key].textContent
            }
            toggleEditMode(true)
        })

        this.renderCleanup.onElement(cancelBtn, 'click', () => toggleEditMode(false))

        this.renderCleanup.onElement(saveBtn, 'click', async () => {
            const newName = inputs.name.value.trim()
            if (!newName || !/^[a-zA-Z0-9\s._'-@#]+$/.test(newName)) {
                return TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Please enter a valid name', status: 'error' })
            }

            const response = await fetch(`${TPEN.servicesURL}/my/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TPEN.getAuthorization()}`
                },
                body: JSON.stringify({ imageURL: userImageInput.value.trim(), displayName: newName, ...Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value.trim()]))})
            })

            if (!response.ok) {
                const errorData = await response.json()
                return TPEN.eventDispatcher.dispatch('tpen-toast', { message: errorData.message, status: 'error' })
            }

            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Profile updated!', status: 'info' })
            await this.updateProfile(await TPEN.currentUser.getProfile())
            toggleEditMode(false)
        })
    }
}

customElements.define('tpen-user-profile', UserProfile)
