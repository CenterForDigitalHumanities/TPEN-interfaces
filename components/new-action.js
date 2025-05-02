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
                button {
                    margin: 5px;
                    border:none;
                    background-color: transparent;
                    color: black;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    &:hover {
                        font-weight: 600;
                    }
                }
            </style>
          <div class="new-action">
                <button id="create-project">Create a New Project</button>
                <button id="import-resource">Import a Resource</button>
                <button id="upgrade">Upgrade from TPEN 2.8</button>
                <button id="link-tpen-2.8">Link TPEN 2.8 Account</button>
                <a href="/profile" id="profile-link">Manage Profile</a>
            </div>
        `

        this.shadowRoot.getElementById('import-resource').addEventListener('click', () => {
            window.location.href = '/interfaces/import-project.html'
        })
        this.shadowRoot.getElementById('create-project').addEventListener('click', () => {
            window.location.href = '/interfaces/project/create'
        })
        this.shadowRoot.getElementById("link-tpen-2.8").addEventListener("click", () => {
            const userToken = localStorage.getItem("userToken")
            document.cookie = `userToken=${userToken}; path=/; domain=t-pen.org; secure; samesite=strict;`
            const redirectUri = encodeURIComponent(`${TPEN.servicesURL}/project/import28`)
            window.location.href = `https://dev.t-pen.org/TPEN/login.jsp?redirect_uri=${redirectUri}`
        })
    }
}

customElements.define('tpen-new-action', NewAction) 
