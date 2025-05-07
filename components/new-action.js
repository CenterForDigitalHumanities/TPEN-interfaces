import TPEN from "../api/TPEN.js"

class NewAction extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
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
            <a href="/interfaces/project/create" id="create-project">
                <span class="icon">📁</span>
                <span>Create a New Project</span>
            </a>
            <a href="/interfaces/project/import" id="import-resource">
                <span class="icon">📤</span>
                <span>Import a Resource</span>
            </a>
            <a id="upgrade" href="#">
                <span class="icon">⬆️</span>
                <span>Upgrade from TPEN 2.8</span>
            </a>
            <a id="link-tpen-2.8" href="#">
                <span class="icon">🔗</span>
                <span>Link TPEN 2.8 Account</span>
            </a>
            <a href="/profile" id="profile-link">
                <span class="icon">👤</span>
                <span>Manage Profile</span>
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
