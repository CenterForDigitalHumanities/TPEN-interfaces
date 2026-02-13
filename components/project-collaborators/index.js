import TPEN from "../../api/TPEN.js"
import CheckPermissions from '../../components/check-permissions/checkPermissions.js'
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * ProjectCollaborators - Displays project collaborators and their roles.
 * Requires MEMBER view access.
 * @element project-collaborators
 */
class ProjectCollaborators extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Removes component if user lacks MEMBER view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess("MEMBER", "*")) {
            this.remove()
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    render() {
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

    /**
     * Refreshes the collaborators display by re-rendering the collaborators list.
     * This is called when role changes occur to update the UI without a full page refresh.
     */
    refreshCollaborators() {
        this.renderProjectCollaborators()
    }
}

customElements.define('project-collaborators', ProjectCollaborators)
