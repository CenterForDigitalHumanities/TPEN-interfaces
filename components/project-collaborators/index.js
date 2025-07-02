import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"
import CheckPermissions from '../../components/check-permissions/checkPermissions.js'

class ProjectCollaborators extends HTMLElement {
    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        eventDispatcher.on('tpen-project-loaded', () => this.render())
    }

    render() {
        const permitted = CheckPermissions.checkViewAccess("member", "*")
        if(!permitted) {
            this.shadowRoot.innerHTML = "<div>You do not have permissions to see group members.</div>"
            return
        }
        this.shadowRoot.innerHTML = `
            <div part="group-title" class="group-title">
                <h1 part="project-title-h1">Project: <span part="project-title" class="project-title"></span></h1>
            </div>
            <h4 part="group-members-title" class="title">Existing group members</h4>
            <ol part="group-members" class="group-members"></ol>
        `
        this.renderProjectCollaborators()
    }

    renderProjectCollaborators() {
        if (!TPEN.activeProject) {
            return this.errorHTML.innerHTML = "No project"
        }
        
        const groupMembersElement = this.shadowRoot.querySelector('.group-members')
        groupMembersElement.innerHTML = ""

        const groupTitle = this.shadowRoot.querySelector('.project-title')
        groupTitle.innerText = TPEN.activeProject.label
        
        const collaborators = TPEN.activeProject.collaborators

        for (const collaboratorId in collaborators) {
            const memberData = collaborators[collaboratorId]
            const memberHTML = this.createMemberHTML(collaboratorId, memberData)
            groupMembersElement.appendChild(memberHTML)
        }
    }

    createMemberHTML(collaboratorId, memberData) {
        const memberElement = document.createElement("div")
        memberElement.innerHTML = `
            <li part="member" id="member" class="member" data-member-id="${collaboratorId}">
                <div part="member-info" class="member-info">
                    <p part="member-name">${memberData.profile?.displayName ?? collaboratorId}</p>
                    <span part="role" class="role">${this.renderRoles(memberData.roles)}</span>
                </div>
                <div part="actions" class="actions" data-member-id="${collaboratorId}">
                </div>
            </li>
        `
        return memberElement
    }

    renderRoles(roles) {
        const defaultRoles = ["OWNER", "LEADER", "CONTRIBUTOR", "VIEWER"]
        return roles
            .map(role => {
                if (role === "OWNER") {
                    return `<span part="owner" class="role owner">Owner</span>`
                } else if (role === "LEADER") {
                    return `<span part="leader" class="role leader">Leader</span>`
                } else if (defaultRoles.includes(role)) {
                    return `<span part="default-roles" class="role default">${role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}</span>`
                } else {
                    return `<span part="custom-role" class="role custom">${(role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()).replaceAll("_", " ")}</span>`
                }
            })
            .join(" ")
    }
}

customElements.define('project-collaborators', ProjectCollaborators)
