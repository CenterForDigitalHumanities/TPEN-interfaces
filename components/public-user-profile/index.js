import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class PublicUserProfile extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    async connectedCallback() {
        await this.render()
        await this.updateProfile()
        TPEN.attachAuthentication(this)
    }

    async getProfile() {
        const urlParams = new URLSearchParams(window.location.search)
        const userId = urlParams.get('userId')
        return fetch(`${TPEN.servicesURL}/my/${userId}/public-profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }).then(response => response.json())
    }

    async updateProfile() {
        const publicProfile = await this.getProfile()
        this.shadowRoot.querySelector('.public-profile-image').src =
            publicProfile.imageURL ?? '../../assets/icons/user.png'

        const profileMap = {
            nameText: publicProfile.displayName?.toUpperCase(),
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
            const el = this.shadowRoot.querySelector(`.${id}`)
            if (el) el.textContent = value || ''
        }
    }

    async render() {
        const profile = await this.getProfile()
        const { linkedin = '', twitter = '', instagram = '', facebook = '', github = '', homepage = '' } = profile
        const displayName = profile.displayName || 'Anonymous'

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    margin: 0;
                    padding: 0;
                    color: var(--accent);
                    font-family: 'Inter', sans-serif;
                }
                .user-stats-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    width: 100%;
                }
                .public-profile-card {
                    background-color: var(--primary-color);
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                    width: 100%;
                    height: 100%;
                }
                .public-profile-title {
                    font-size: 1.5rem;
                    margin-bottom: 10px;
                    color: var(--white);
                }
                .public-profile-header {
                    display: flex;
                    justify-content: flex-start;
                    align-items: center;
                    border-radius: 10px 10px 0 0;
                    background-color: var(--white);
                    width: 100%;
                }
                .public-profile-header img {
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                    margin-left: 20px;
                }
                .public-profile-image-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .public-profile-image {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid orange;
                    margin-top: 20px;
                }
                .public-profile-bio {
                    padding: 10px;
                    font-size: 0.9rem;
                    color: var(--white);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    margin-left: 40px;
                }
                .public-profile-body {
                    padding: 20px;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-evenly;
                    gap: 20px;
                }
                .bio-text {
                    margin: 5px 0;
                    font-size: 0.9rem;
                    color: var(--white);
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                }
                .bio-text em {
                    font-style: normal;
                    font-weight: 600;
                    color: white;
                    font-size: 1rem;
                    margin-right: 10px;
                    width: 120px;
                    text-align: right;
                }
                .bio-text em::after { content: ":" }
                .flip-card {
                    background-color: transparent;
                    width: 45%;
                    height: 310px;
                    perspective: 1000px;
                }
                .flip-card-inner {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    text-align: center;
                    transition: transform 0.6s;
                    transform-style: preserve-3d;
                }
                .flip-card:hover .flip-card-inner {
                    transform: rotateY(180deg);
                }
                .flip-card-front,
                .flip-card-back {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    border: 1px solid var(--gray);
                }
                .flip-card-front { background: #fff; }
                .flip-card-back {
                    background-color: #f4f4f4;
                    transform: rotateY(180deg);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                }
                .public-profile-footer {
                    padding: 10px;
                    background-color: var(--white);
                    border-radius: 0 0 10px 10px;
                    font-size: 0.9rem;
                    width: 100%;
                    text-align: right;
                }
                .public-profile-footer-text {
                    margin: 0 20px 0 0;
                    color: var(--primary-color);
                    font-style: italic;
                    font-weight: 700;
                }
                .public-social-body {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    height: 100%;
                }
                .social-icons {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .social-icon {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }
                .social-icon img {
                    width: 24px;
                    height: 24px;
                }
                .social-icon p {
                    margin: 0;
                    font-size: 0.9rem;
                    color: var(--primary-color);
                    font-weight: 600;
                    margin-left: 10px;
                }
                .main-title {
                    font-size: 1.6rem;
                    color: var(--primary-color);
                    margin: 0 0 20px 0;
                    text-align: center;
                }
            </style>
            <h2 class="main-title">${displayName}'s Profile</h2>
            <div class="user-stats-container">
                <div class="flip-card">
                    <div class="flip-card-inner">
                        <div class="flip-card-front">
                            <div class="public-profile-card">
                                <header class="public-profile-header">
                                    <img src="../assets/logo/logo.png" alt="TPEN Logo">
                                </header>
                                <div class="public-profile-body">
                                    <div class="public-profile-image-container">
                                        <img src="" alt="User Image" class="public-profile-image">
                                        <h1 class="public-profile-title nameText">PRIYAL</h1>
                                    </div>
                                    <div class="public-profile-bio">
                                        <p class="bio-text"><em>Orchid ID</em> <span class="orchidIdText"></span></p>
                                        <p class="bio-text"><em>NSF ID</em> <span class="nsfIdText"></span></p>
                                        <p class="bio-text"><em>Institutional ID</em> <span class="institutionalIdText"></span></p>
                                    </div>
                                </div>
                                <div class="public-profile-footer">
                                    <p class="public-profile-footer-text">XYZ contributions</p>
                                </div>
                            </div>
                        </div>
                        <div class="flip-card-back">
                            <div class="public-profile-card" style="background-color: var(--white);">
                                <header class="public-profile-header" style="justify-content: space-between; padding: 0 20px;">
                                    <h2 style="margin:0;font-size:1.2rem;color:var(--primary-color);padding-left: 5px;">Connect with Me</h2>
                                    <img src="../assets/logo/logo.png" alt="TPEN Logo" style="margin:0 40px 0 0;">
                                </header>
                                <div class="public-social-body">
                                    <div class="social-icons">
                                        ${linkedin ? `<div class="social-icon">
                                            <img src="../../assets/icons/linkedin.png" alt="LinkedIn">
                                            <p class="linkedinText">${linkedin}</p>
                                        </div>` : ''}
                                        ${github ? `<div class="social-icon">
                                            <img src="../../assets/icons/github.png" alt="GitHub">
                                            <p class="githubText">${github}</p>
                                        </div>` : ''}
                                        ${twitter ? `<div class="social-icon">
                                            <img src="../../assets/icons/twitter.png" alt="Twitter">
                                            <p class="twitterText">${twitter}</p>
                                        </div>` : ''}
                                        ${facebook ? `<div class="social-icon">
                                            <img src="../../assets/icons/facebook.png" alt="Facebook">
                                            <p class="facebookText">${facebook}</p>
                                        </div>` : ''}
                                        ${instagram ? `<div class="social-icon">
                                            <img src="../../assets/icons/instagram.png" alt="Instagram">
                                            <p class="instagramText">${instagram}</p>
                                        </div>` : ''}
                                        ${homepage ? `<div class="social-icon">
                                            <img src="../../assets/icons/home-button.png" alt="Homepage">
                                            <p class="homepageText">${homepage}</p>
                                        </div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}

customElements.define('tpen-public-user-profile', PublicUserProfile)