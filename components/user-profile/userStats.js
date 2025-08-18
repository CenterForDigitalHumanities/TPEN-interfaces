import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'

class UserStats extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.eventDispatcher.on('tpen-user-loaded', async ev => {
            await this.render(ev.detail, await TPEN.getUserProjects(TPEN.getAuthorization()))
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
        this.shadowRoot.querySelector('.public-profile-image').src = publicProfile.imageURL ?? '../../assets/icons/user.png'

        const profileMap = {
            nameText: publicProfile.displayName.toUpperCase(),
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

    getPublicProfile(profile) {
        return profile.profile
    }

    async render(profile,projects) {
        const linkedin = this.getPublicProfile(profile).linkedin || ''
        const twitter = this.getPublicProfile(profile).twitter || ''
        const instagram = this.getPublicProfile(profile).instagram || ''
        const facebook = this.getPublicProfile(profile).facebook || ''
        const github = this.getPublicProfile(profile).github || ''
        const homepage = this.getPublicProfile(profile).homepage || ''
        const uniqueCollaborators = new Set()
        projects.forEach(project => {
            if (project.collaborators) {
                Object.keys(project.collaborators).forEach(collaborator => {
                    if (collaborator !== TPEN.currentUser?._id) uniqueCollaborators.add(collaborator)
                })
            }
        })

        const collaborators = await Promise.all(
            Array.from(uniqueCollaborators).map(async collaborator => {
                const response = await fetch(
                    `${TPEN.servicesURL}/my/${collaborator}/public-profile`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${TPEN.getAuthorization()}`,
                            'Content-Type': 'application/json'
                        }
                    }
                ).then(res => res.json())
                return {
                    _id: response._id,
                    name: response.displayName,
                    img: response.imageURL || '../../assets/icons/user.png'
                }
            })
        )

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
                    justify-content: center;
                    width: 100%;
                    gap: 20px;
                    margin: 0 auto;
                }
                
                .stats {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid var(--gray);
                    background-color: var(--white);
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .stats-title {
                    padding: 0;
                    margin: 0;
                    font-size: 1.2rem;
                }

                .collaborators {
                    display: flex;
                    gap: 30px;
                    overflow-x: auto;
                    padding: 10px 0;
                    scrollbar-width: thin;
                    margin: 10px 0;
                }

                .collaborators::-webkit-scrollbar {
                    height: 6px;
                }

                .collaborators::-webkit-scrollbar-thumb {
                    background-color: rgba(0,0,0,0.2);
                    border-radius: 3px;
                }

                .collaborator {
                    flex: 0 0 auto;
                    text-align: center;
                }

                .collaborator img {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid #ccc;
                    box-shadow: 0 0 4px 4px rgba(0, 0, 0, 0.1);
                }

                .collaborator-name {
                    margin-top: 5px;
                    font-size: 16px;
                    font-weight: 500;
                    color: #333;
                }

                .report {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid var(--gray);
                    background-color: var(--white);
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .report h2 {
                    margin: 0 0 10px;
                    font-size: 1.2rem;
                }

                .report p {
                    margin: 5px 0;
                    font-size: 1rem;
                    color: #555;
                }

                .public-profile-card {
                    background-color: var(--primary-color);
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .public-profile-title {
                    font-size: 1.5rem;
                    margin-bottom: 10px;
                    color: var(--white);
                    text-align: center;
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

                .public-profile-image {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid orange;
                    margin-top: 20px;
                }

                .public-profile-image-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 20px;
                    margin: 0px;
                }
                
                .public-profile-bio {
                    padding: 10px;
                    font-size: 0.9rem;
                    color: var(--white);
                    border-radius: 5px;
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

                .bio-text em::after {
                    content: ":"
                }

                .flip-card {
                    background-color: transparent;
                    width: 60%;
                    height: 345px;
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
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--gray);
                }

                .flip-card-front {
                    background: #fff;
                }

                .flip-card-back {
                    background-color: #f4f4f4;
                    transform: rotateY(180deg);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                }

                .flip-card-back h2 {
                    margin: 0;
                    font-size: 1.2rem;
                    color: #333;
                }

                .social-icons {
                    display: flex;
                    gap: 15px;
                }

                .social-icons a {
                    text-decoration: none;
                    color: #0077ff;
                    font-weight: bold;
                }

                .public-profile-footer {
                    padding: 10px;
                    background-color: var(--white);
                    color: var(--white);
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

                .public-profile-header h2 {
                    position: absolute;
                    left: 20px;
                    font-size: 1.2rem;
                    color: var(--primary-color);
                }

                .social-icons {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    margin: 5px 0;
                }

                .social-icon {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                .social-icon img {
                    width: 24px;
                    height: 24px;
                    margin-bottom: 5px;
                }

                .social-icon p {
                    margin: 0;
                    font-size: 0.9rem;
                    color: var(--primary-color);
                    font-weight: 600;
                    margin-left: 10px;
                }
            </style>
            <div class="user-stats-container">
                <div class="flip-card">
                    <div class="flip-card-inner">
                        <div class="flip-card-front">
                            <div class="public-profile-card">
                                <header class="public-profile-header">
                                    <img src="../assets/logo/logo.png" alt="TPEN Logo" class="public-profile-logo">
                                </header>
                                <div class="public-profile-body">
                                    <div class="public-profile-image-container">
                                        <img src="" alt="User Image" class="public-profile-image" id="publicProfileImage">
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
                                <header class="public-profile-header" style="justify-content: flex-end;">
                                    <h2>Connect with Me</h2>
                                    <img src="../assets/logo/logo.png" alt="TPEN Logo" class="public-profile-logo" style="margin-left: 0px; margin-right: 20px;">
                                </header>
                                <div class="public-social-body">
                                    <div class="social-icons">
                                        ${linkedin ? `<div class="social-icon">
                                            <img src="../../assets/icons/linkedin.png" alt="LinkedIn" width="24" height="24">
                                            <p class="linkedinText">${linkedin}</p>
                                        </div>` : ''}
                                        ${github ? `<div class="social-icon">
                                            <img src="../../assets/icons/github.png" alt="GitHub" width="24" height="24">
                                            <p class="githubText">${github}</p>
                                        </div>` : ''}
                                        ${twitter ? `<div class="social-icon">
                                            <img src="../../assets/icons/twitter.png" alt="Twitter" width="24" height="24">
                                            <p class="twitterText">${twitter}</p>
                                        </div>` : ''}
                                        ${facebook ? `<div class="social-icon">
                                            <img src="../../assets/icons/facebook.png" alt="Facebook" width="24" height="24">
                                            <p class="facebookText">${facebook}</p>
                                        </div>` : ''}
                                        ${instagram ? `<div class="social-icon">
                                            <img src="../../assets/icons/instagram.png" alt="Instagram" width="24" height="24">
                                            <p class="instagramText">${instagram}</p>
                                        </div>` : ''}
                                        ${homepage ? `<div class="social-icon">
                                            <img src="../../assets/icons/home-button.png" alt="Homepage" width="24" height="24">
                                            <p class="homepageText">${homepage}</p>
                                        </div>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="stats">
                    <h2 class="stats-title">Collaborators you have worked with...</h2>
                    <div class="collaborators">
                        ${collaborators.map(c => `
                            <div class="collaborator">
                                <img src="${c.img}" alt="${c.name}" onclick="window.location.href='${TPEN.BASEURL}/public-profile?userId=${c._id}'">
                                <div class="collaborator-name">${c.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="report">
                    <h2 class="stats-title">Report...</h2>
                    <p>Number of Projects: ${projects.length}</p>
                    <p>Number of Collaborators: ${uniqueCollaborators.size}</p>
                </div>
            </div>
        `
    }
}

customElements.define('user-stats', UserStats)