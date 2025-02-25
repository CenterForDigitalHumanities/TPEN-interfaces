import TPEN from "../../api/TPEN.mjs";
import { eventDispatcher } from "../../api/events.mjs";

class ProjectPermissions extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({mode:"open"})
        TPEN.attachAuthentication(this)
        eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    static get observedAttributes() {
        return ["tpen-user-id"]
    }

    connectedCallback() {
        this.render()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                #msg {
                    max-height: 180px;
                    overflow-y: auto;
                    margin: 0 auto;
                    padding: 20px 10px;
                }
                #msg li {
                    font-size: 0.875rem;
                    display: flex;
                    justify-content: flex-start;
                    align-items: start;
                    padding: 5px 0px;
                    border-bottom: 1px solid #ccc;
                }
                #msg li:last-child {
                    border-bottom: none;
                }  
                #msg li #roleID {
                    text-align: left;
                    width: 30%;
                    font-weight: bold;
                    padding: 5px 0px;
                }
                #msg li span .name-ol {
                    gap: 5px;
                    list-style-type: disc;
                    text-align: left;
                }
                #msg li span .name-ol .name-li {
                    padding: 5px 0px;
                    font-size: 0.875rem;
                    display: list-item;
                    border-bottom: none;
                }
            </style>
            <ol id="msg"></ol>
        `
        this.fetchProjectData()
    }   

    async fetchProjectData() {
        const msg = this.shadowRoot.getElementById("msg")
        if (!TPEN.activeProject) {
            return this.innerHTML = "No project"
        }
        else {
            const token = TPEN.getAuthorization();
            await fetch(`${TPEN.servicesURL}/project/${TPEN.activeProject._id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => {
                const roles = Object.entries(data.roles || {}).map(([key, value]) => ({
                    id: key,
                    name: value
                }));  
                roles.forEach(role => {
                    const names = role.name
                    msg.innerHTML += `
                        <li>
                            <span id="roleID">${role.id}</span>
                            <span><ol class="name-ol">${names.map(name => `<li class="name-li">${name.toLowerCase()}</li>`).join("")}</ol></span>
                        </li>
                    `
                })          
                
            })
        }
    }
}

customElements.define("tpen-project-permissions", ProjectPermissions)