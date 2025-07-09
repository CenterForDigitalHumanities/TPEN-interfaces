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
            <a href="project/create" id="create-project">
                <span class="icon">📁</span>
                <span>Create a New Project</span>
            </a>
            <a href="project/import" id="import-resource">
                <span class="icon">📤</span>
                <span>Import IIIF Manifest</span>
            </a>
            <a id="link-tpen-2.8" href="#">
                <span class="icon">🔗</span>
                <span>Import a TPEN 2.8 Project</span>
            </a>
            <a href="/profile" id="profile-link">
                <span class="icon">👤</span>
                <span>Manage Profile</span>
            </a>
            </div>
        `

        this.shadowRoot.getElementById("link-tpen-2.8").addEventListener("click", this.TPEN2ImportHandler.bind(this))
    }

    TPEN2ImportHandler = (event) => {
        event.preventDefault()
        const userToken = localStorage.getItem("userToken")
        let tokenDomain

        if (TPEN.TPEN28URL.includes("t-pen.org")) {
            tokenDomain = "t-pen.org"
        }

        if (TPEN.TPEN28URL.includes("localhost")) {
            tokenDomain = "localhost"
        }
        
        document.cookie = `userToken=${userToken}; path=/; domain=${tokenDomain}; secure; samesite=strict;`;    
        const redirectUri = encodeURIComponent(`${window.location.origin}/project/import28`)
        window.location.href = `${TPEN.TPEN28URL}/TPEN/login.jsp?redirect_uri=${redirectUri}`
    }
}

customElements.define('tpen-new-action', NewAction)
