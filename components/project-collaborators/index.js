import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"

class ProjectCollaborators extends HTMLElement {
    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
    }

    async connectedCallback() {
        this.render()
        this.addEventListeners()
        TPEN.attachAuthentication(content)
    }

    render() {
        this.shadowRoot.innerHTML = `
        <ol part="group-members" class="group-members"></ol>
        `
    }

    addEventListeners() {
        eventDispatcher.on('tpen-project-loaded', () => this.renderProjectCollaborators())
    }

    renderProjectCollaborators() {
        if (!TPEN.activeProject) {
            return this.errorHTML.innerHTML = "No project"
        }

        const groupTitle = document.querySelector('.project-title')
        const groupMembersElement = this.shadowRoot.querySelector('.group-members')
        const userId = content.getAttribute('tpen-user-id')

        groupMembersElement.innerHTML = ""
        groupTitle.innerHTML = TPEN.activeProject.getLabel()

        const collaborators = TPEN.activeProject.collaborators
        let isOwnerOrLeader = ["OWNER", "LEADER"].some(role => collaborators[userId]?.roles.includes(role))

        for (const collaboratorId in collaborators) {
            const memberData = collaborators[collaboratorId]
            const memberHTML = this.createMemberHTML(collaboratorId, memberData)
            groupMembersElement.appendChild(memberHTML)
        }

        this.manageRoleButtons(isOwnerOrLeader)
    }

    createMemberHTML(collaboratorId, memberData) {
        const memberElement = document.createElement("div")
        memberElement.innerHTML = `
            <li part="member" class="member" data-member-id=${collaboratorId}>
                <div part="member-info" class="member-info">
                    <p style="font-weight: bold;">${memberData.profile?.displayName ?? collaboratorId}</p>
                    <span part="role" class="role">${this.renderRoles(memberData.roles)}</span>
                </div>
                <div part="actions" class="actions">
                    <button part="manage-roles-button" class="manage-roles-button" data-member-id=${collaboratorId}>
                        Manage Roles <i class="fas fa-caret-down"></i>
                    </button>
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
                    return `<span part="custom-role" class="role custom">${role.toLowerCase().replaceAll("_", " ")}</span>`
                }
            })
            .join(" ")
    }

    manageRoleButtons(isOwnerOrLeader) {
        this.shadowRoot.querySelector('.group-members').addEventListener("click", (e) => {
            const button = e.target
            if (button.classList.contains("manage-roles-button")) {
                this.toggleRoleManagementButtons(button)
            }
        })

        this.setPermissionBasedVisibility(isOwnerOrLeader)
    }

    toggleRoleManagementButtons(button) {
        const memberID = button.dataset.memberId
        const actionsDiv = button.closest(".member").querySelector(".actions")

        if (actionsDiv.querySelector(".role-management-buttons")) {
            actionsDiv.querySelector(".role-management-buttons").remove()
            return
        }

        const collaborator = TPEN.activeProject.collaborators[memberID]
        const buttons = this.generateRoleManagementButtons(collaborator, button.dataset)

        const roleManagementButtonsHTML = `
            <div part="role-management-buttons" class="role-management-buttons">
                ${buttons.join("")}
            </div>
        `

        const roleManagementDiv = document.createElement("div")
        roleManagementDiv.innerHTML = roleManagementButtonsHTML
        actionsDiv.appendChild(roleManagementDiv)
    }

    generateRoleManagementButtons(collaborator, button) {
        const currentUserID = content.getAttribute("tpen-user-id")
        const currentUserIsOwner = TPEN.activeProject.collaborators[currentUserID]?.roles.includes("OWNER")

        const memberID = button.memberId
        const memberName = collaborator.profile?.displayName

        const buttons = []

        if (!collaborator.roles.includes("OWNER") && currentUserIsOwner) {
            buttons.push(`<button part="transfer-ownership-button" class="transfer-ownership-button" data-member-id=${memberID}> Transfer Ownership</button>`)
        }

        if (!collaborator.roles.includes("LEADER")) {
            buttons.push(`<button part="make-leader-button" class="make-leader-button" data-member-id=${memberID}>Promote to Leader</button>`)
        }

        if (collaborator.roles.includes("LEADER")) {
            buttons.push(`<button part="demote-leader-button" class="demote-leader-button" data-member-id=${memberID}>Demote from Leader</button>`)
        }

        if (!collaborator.roles.includes("VIEWER")) {
            buttons.push(`<button part="set-to-viewer-button" class="set-to-viewer-button" data-member-id=${memberID}>Revoke Write Access</button>`)
        }

        buttons.push(
            `<button part="set-role-button" class="set-role-button" data-member-id=${memberID}>Set Role</button>`,
            `<button part="remove-button" class="remove-button" data-member-id=${memberID} data-member-name=${memberName}>Remove User</button>`
        )

        return buttons
    }

    setPermissionBasedVisibility(isOwnerOrLeader) {
        const ownerLeaderActions = this.querySelectorAll('.owner-leader-action')

        ownerLeaderActions.forEach(element => {
            if (isOwnerOrLeader) {
                element.classList.remove('is-hidden')
            } else {
                element.classList.add('is-hidden')
            }
        })
    }
}

customElements.define('project-collaborators', ProjectCollaborators)
