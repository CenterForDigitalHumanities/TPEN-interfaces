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
        <style>
            .group-members {
            list-style-type: none;
            padding: 0;
            width: 100%;
            margin: 0 auto;
        }
        </style>
        <ol class="group-members"></ol>
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
            <style>
                .member {
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                    margin-bottom: 10px;
                    padding: 15px;
                    border-radius: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .member-info {
                    font-size: 1rem;
                    color: #333;
                }

                .role {
                    font-weight: bold;
                    color: #555;
                }

                .role.leader {
                    color: #28a745;
                }

                .role.owner {
                    color: #007BFF;
                }

                .role.default {
                    color: #6c757d;
                }

                .actions .manage-roles-button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }

                .actions .manage-roles-button i {
                    margin-left: 8px;
                }

                .actions .manage-roles-button:hover {
                    background-color: #0056b3;
                }    
            </style>
            <li class="member" data-member-id=${collaboratorId}>
                <div class="member-info">
                    <span class="role">${this.renderRoles(memberData.roles)}</span>
                    ${memberData.profile?.displayName ?? collaboratorId}
                </div>
                <div class="actions">
                    <button class="manage-roles-button" data-member-id=${collaboratorId}>
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
                    return `<span class="role owner">Owner</span>`
                } else if (role === "LEADER") {
                    return `<span class="role leader">Leader</span>`
                } else if (defaultRoles.includes(role)) {
                    return `<span class="role default">${role.toLowerCase()}</span>`
                } else {
                    return `<span class="role custom">${role.toLowerCase().replaceAll("_", " ")}</span>`
                }
            })
            .join(", ")
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
            <div class="role-management-buttons">
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
            buttons.push(`<button class="transfer-ownership-button" data-member-id=${memberID}> Transfer Ownership</button>`)
        }

        if (!collaborator.roles.includes("LEADER")) {
            buttons.push(`<button class="make-leader-button" data-member-id=${memberID}>Promote to Leader</button>`)
        }

        if (collaborator.roles.includes("LEADER")) {
            buttons.push(`<button class="demote-leader-button" data-member-id=${memberID}>Demote from Leader</button>`)
        }

        if (!collaborator.roles.includes("VIEWER")) {
            buttons.push(`<button class="set-to-viewer-button" data-member-id=${memberID}>Revoke Write Access</button>`)
        }

        buttons.push(
            `<button class="set-role-button" data-member-id=${memberID}>Set Role</button>`,
            `<button class="remove-button" data-member-id=${memberID} data-member-name=${memberName}>Remove User</button>`
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
