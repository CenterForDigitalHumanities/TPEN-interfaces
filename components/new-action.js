import TPEN from "../api/TPEN.js"

class NewAction extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style> 
            .new-action {
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            }
            a {
            margin: 5px;
            text-decoration: none;
            color: var(--dark);
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            border-radius: 5px;
            transition: background-color 0.3s ease, color 0.3s ease;
            }
            a:hover {
            background-color: var(--light-gray);
            color: var(--primary-color);
            }
            </style>
            <div class="new-action">
            <a href="/interfaces/project/create" id="create-project">
            <span>📁</span> Create a New Project
            </a>
            <a href="/interfaces/import-project" id="import-resource">
            <span>📤</span> Import a Resource
            </a>
            <a id="upgrade" href="#">
            <span>⬆️</span> Upgrade from TPEN 2.8
            </a>
            <a id="link-tpen-2.8" href="#">
            <span>🔗</span> Link TPEN 2.8 Account
            </a>
            <a href="/profile" id="profile-link">
            <span>👤</span> Manage Profile
            </a>
            </div>
        `

        const TPEN2ImportHandler = (event) => {
            event.preventDefault()
            const userToken = localStorage.getItem("userToken")
            document.cookie = `userToken=${userToken}; path=/; domain=t-pen.org; secure; samesite=strict;`
            const redirectUri = encodeURIComponent(`${TPEN.servicesURL}/project/import28`)
            window.location.href = `https://dev.t-pen.org/TPEN/login.jsp?redirect_uri=${redirectUri}`
        }

        this.shadowRoot.getElementById("link-tpen-2.8").addEventListener("click", TPEN2ImportHandler)
    }
}

customElements.define('tpen-new-action', NewAction)
