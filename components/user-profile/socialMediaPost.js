import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class SocialMediaPost extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.eventDispatcher.on('tpen-user-loaded', ev => {
            this.render()
            this.updateProfile(ev.detail)
        })
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
        const publicProfile = this.getPublicProfile(profile)
        if(publicProfile.imageURL) {
            this.shadowRoot.querySelector('.avatar img').src = publicProfile.imageURL === '' ? '../../assets/icons/user.png' : publicProfile.imageURL
        }

        this.shadowRoot.getElementById('username').textContent = profile.displayName || 'Anonymous'
    }

    getPublicProfile(profile) {
        return profile.profile
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    margin: 0;
                    padding: 0;
                    color: var(--accent);
                    font-family: 'Inter', sans-serif;
                }

                .post-card {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid var(--gray);
                    background-color: var(--white);
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);   
                }

                .post-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-weight: bold;
                    margin-right: 10px;
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .post-header span {
                    font-weight: bold;
                    font-size: 16px;
                }

                .post-card textarea {
                    width: 100%;
                    border: none;
                    resize: none;
                    font-size: 15px;
                    outline: none;
                    min-height: 80px;
                    margin-bottom: 12px;
                }

                .post-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                    margin-top: 10px;
                }

                .left-options {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .left-options label {
                    cursor: pointer;
                    font-size: 14px;
                    color: #007bff;
                }

                .left-options input[type="file"] {
                    display: none;
                }

                .platform-select {
                    padding: 6px 10px;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    background: #f9f9f9;
                }

                .post-btn {
                    padding: 8px 18px;
                    background: var(--primary-color);
                    color: #fff;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: 0.2s;
                }

                .post-btn:hover {
                    background: #0056b3;
                }

                .status {
                    font-size: 14px;
                    margin-top: 10px;
                    color: #28a745;
                }
            </style>
             <div class="post-card">
                <div class="post-header">
                <div class="avatar">
                    <img src="../../assets/icons/user.png" alt="User Avatar">
                </div>
                <span class="username" id="username"></span>
                </div>
                <textarea id="content" rows="3" placeholder="Share your Accomplishments..."></textarea>
                <div class="post-options">
                <div class="left-options">
                    <label for="file">📎 Add File</label>
                    <input type="file" id="file">
                    <select id="platform" class="platform-select">
                    <option value="twitter">Twitter/X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    </select>
                </div>
                <button class="post-btn" onclick="submitPost()">Post</button>
                </div>

                <div class="status" id="status"></div>
            </div>
        `
    }
}

customElements.define('social-media-post', SocialMediaPost)