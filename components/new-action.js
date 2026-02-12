import TPEN from "../api/TPEN.js"
import { CleanupRegistry } from '../utilities/CleanupRegistry.js'

/**
 * NewAction - Displays quick action links for creating projects, importing manifests, etc.
 * @element tpen-new-action
 */
class NewAction extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        this.cleanup.run()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
            .new-action {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            padding: 10px;
            justify-items: center;
            align-items: center;
            }
            a {
            text-decoration: none;
            color: var(--dark);
            font-size: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            padding: 15px;
            border-radius: 5px;
            transition: background-color 0.3s ease, color 0.3s ease;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
            }
            a span.icon {
            font-size: 32px; /* Large icon */
            }
            a:hover {
            background-color: var(--light-gray);
            color: var(--primary-color);
            }
            </style>
            <div class="new-action">
            <a href="project/create" id="create-project">
                <span class="icon">📁</span>
                <span>Create a New Project</span>
            </a>
            <a href="project/import" id="import-manifest">
                <span class="icon">📤</span>
                <span>Import IIIF Manifest</span>
            </a>
            <a href="project/import-image" id="import-image">
                <span class="icon">📄</span>
                <span>Import Image</span>
            </a>
            <a id="link-tpen-2.8">
                <span class="icon">🔗</span>
                <span>Import a TPEN 2.8 Project</span>
            </a>
            <a href="/profile" id="profile-link">
                <span class="icon">👤</span>
                <span>Manage Profile</span>
            </a>
            </div>
        `
    }

    addEventListeners() {
        this.cleanup.onElement(this.shadowRoot.getElementById("link-tpen-2.8"), "click", this.TPEN2ImportHandler.bind(this))
    }

    TPEN2ImportHandler = async () => {
        const userToken = localStorage.getItem("userToken")
        let tokenDomain
        let isProdTPEN
    
        if (TPEN.TPEN28URL.includes("t-pen.org")) {
            tokenDomain = "t-pen.org"
            isProdTPEN = true
        }

        if (TPEN.TPEN28URL.includes("localhost")) {
            tokenDomain = "localhost"
        }
    
        let cookieString = `userToken=${userToken}; domain=${tokenDomain}; path=/; SameSite=Strict;`
    
        if (isProdTPEN) {
            cookieString += " Secure;"
        }
    
        document.cookie = cookieString
        await fetch(`${TPEN.servicesURL}/project/deletecookie`, {
            method: "GET",
            credentials: "include",
        })

        document.cookie = cookieString
        const redirectUri = encodeURIComponent(`${window.location.origin}/project/import28`)
        window.location.href = `${TPEN.TPEN28URL}/TPEN/login.jsp?redirect_uri=${redirectUri}`
    }
}

customElements.define('tpen-new-action', NewAction)
