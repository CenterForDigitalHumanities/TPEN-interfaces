import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"
import CheckPermissions from "../../utilities/checkPermissions.js"

class RolesHandler extends HTMLElement {
    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.render()
        this.addEventListeners()
    }

    observedAttributes() {
        return ["tpen-user-id"]
    }

    attributeChangedCallback(userID, oldValue, newValue) {
        console.log(`Attribute ${userID} changed from ${oldValue} to ${newValue}`);
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
        #rolesListContainer {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 10px;
            width: 80%;
            margin: 0 auto;
        }
        .role-modal-container .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .role-modal-container .modal.hidden {
            display: none;
        }
        .modal.hidden {
            display: none;
        }
        </style>
        <div part="role-modal-container" class="role-modal-container">
            <div id="roleModal" class="modal hidden">
                <div part="modal-content" class="modal-content">
                    <h2 id="modalTitle"></h2>
                    <p id="modalDescription"></p>
                    <!-- Roles List -->
                    <div id="rolesListContainer" class="defaultRoles"></div>
                    <!-- Modal Buttons -->
                    <div part="modal-actions" class="modal-actions">
                        <button part="modal-buttons-confirm" id="modalConfirmButton">Confirm</button>
                        <button part="modal-buttons-cancel" id="modalCancelButton">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
        `
    }

    addEventListeners() {
        eventDispatcher.on('tpen-project-loaded', async () => await this.renderProjectCollaborators())
        const groupMembersElement = document.querySelector("project-collaborators").shadowRoot.querySelector(".group-members")
        groupMembersElement.addEventListener('click', this.rolesHandler.bind(this));
    }

    async renderProjectCollaborators() {
        if (!TPEN.activeProject) {
            return this.errorHTML.innerHTML = "No project"
        }
        
        const userId = this.getAttribute('tpen-user-id')
        const collaborators = TPEN.activeProject.collaborators
        let isOwnerOrLeader = ["OWNER", "LEADER"].some(role => collaborators[userId]?.roles.includes(role))
        const hadEditAccess = CheckPermissions.checkEditAccess("member")

        const groupMembersElement = document.querySelector("project-collaborators").shadowRoot.querySelector(".group-members") 

        Array.from(groupMembersElement.children).filter(child => {
            const groupMembersActionsElement = child.querySelector(".actions")
            for (const collaboratorId in collaborators) {
                if (groupMembersActionsElement.getAttribute("data-member-id") == collaboratorId && hadEditAccess) {
                    const memberHTML = this.createMemberHTML(collaboratorId)
                    groupMembersActionsElement.appendChild(memberHTML)
                }  
            }
        })        

        this.manageRoleButtons(isOwnerOrLeader)
    }

    createMemberHTML(collaboratorId) {
        const memberElement = document.createElement("div")
        memberElement.innerHTML = `
            <button part="manage-roles-button" class="manage-roles-button" data-member-id=${collaboratorId}>
                Manage Roles <i class="fas fa-caret-down"></i>
            </button>
        `
        return memberElement
    }


    manageRoleButtons(isOwnerOrLeader) {
        document.querySelector("project-collaborators").shadowRoot.querySelector('.group-members').addEventListener("click", (e) => {
            const button = e.target
            if (button.classList.contains("manage-roles-button")) {
                this.toggleRoleManagementButtons(button)
            }
        })

        this.setPermissionBasedVisibility(isOwnerOrLeader)
    }

    async toggleRoleManagementButtons(button) {
        const memberID = button.dataset.memberId
        const actionsDiv = button.closest(".member").querySelector(".actions")

        if (actionsDiv.querySelector(".role-management-buttons")) {
            actionsDiv.querySelector(".role-management-buttons").remove()
            return
        }

        const collaborator = TPEN.activeProject.collaborators[memberID]
        const buttons = await this.generateRoleManagementButtons(collaborator, button.dataset)

        const roleManagementButtonsHTML = `
            <div part="role-management-buttons" class="role-management-buttons">
                ${buttons.join("")}
            </div>
        `

        const roleManagementDiv = document.createElement("div")
        roleManagementDiv.innerHTML = roleManagementButtonsHTML
        actionsDiv.appendChild(roleManagementDiv)
    }

    async generateRoleManagementButtons(collaborator, button) {
        const currentUserID = this.getAttribute("tpen-user-id")
        const currentUserIsOwner = TPEN.activeProject.collaborators[currentUserID]?.roles.includes("OWNER")

        const memberID = button.memberId
        const memberName = collaborator.profile?.displayName
        const hasDeleteAccess = await CheckPermissions.checkDeleteAccess("MEMBER")

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

        buttons.push(`<button part="set-role-button" class="set-role-button" data-member-id=${memberID}>Set Role</button>`)

        if (hasDeleteAccess) {
            buttons.push(`<button part="remove-button" class="remove-button" data-member-id=${memberID} data-member-name=${memberName}>Remove User</button>`)
        }

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

    async rolesHandler(event) {
        try {
            const button = event.target.closest("button")
            if (!button) return

            const { memberId } = button.dataset
            const memberName = button.dataset.memberName
            if (!memberId) return console.warn("Button does not have a valid member ID")

            const actions = {
                "remove-button": () => this.removeMember(memberId, memberName),
                "set-role-button": () => this.handleSetRoleButton(memberId),
                "set-to-viewer-button": () => this.handleSetToViewerButton(memberId),
                "make-leader-button": () => this.handleMakeLeaderButton(memberId),
                "transfer-ownership-button": () => this.handleTransferOwnershipButton(memberId),
                "demote-leader-button": () => this.handleDemoteLeaderButton(memberId),
            }

            for (const [className, action] of Object.entries(actions)) {
                if (button.classList.contains(className)) {
                    await action()
                    break
                }
            }
        } catch (error) {
            console.error("Error handling button action:", error)
            alert("An error occurred. Please try again.")
        }
    }

    async removeMember(memberID, memberName) {
        if (!confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)) return
        try {
            const data = await TPEN.activeProject.removeMember(memberID)
            if (data) {
                document.querySelector(`[data-member-id="${memberID}"]`)?.remove()
                alert('Member removed successfully')
            }
        } catch (error) {
            console.error("Error removing member:", error)
        }
    }

    async handleSetRoleButton(memberID) {
        this.openRoleModal(
            "Manage Roles",
            `Add or remove roles for ${TPEN.activeProject.collaborators[memberID]?.profile?.displayName ?? " contributor " + memberID}`,
            async (selectedRoles) => {
                if (selectedRoles.length > 0) {
                    const response = await TPEN.activeProject.cherryPickRoles(memberID, selectedRoles)
                    if (response) alert("Roles updated successfully.")
                }
            }
        )
    }

    async handleSetToViewerButton(memberID) {
        if (window.confirm(`Are you sure you want to remove all write access for ${memberID}? The user will become a VIEWER.`)) {
            const response = await TPEN.activeProject.setToViewer(memberID)
            if (response) alert("User role updated to VIEWER.")
        }
    }

    async handleMakeLeaderButton(memberID) {
        if (window.confirm(`Are you sure you want to promote collaborator ${memberID} to LEADER?`)) {
            const response = await TPEN.activeProject.makeLeader(memberID)
            if (response) alert("User promoted to LEADER.")
        }
    }

    async handleDemoteLeaderButton(memberID) {
        if (window.confirm(`Are you sure you want to demote collaborator ${memberID} from LEADER?`)) {
            const response = await TPEN.activeProject.demoteLeader(memberID)
            if (response) alert("User demoted from LEADER.")
        }
    }

    async handleTransferOwnershipButton(memberID) {
        const confirmMessage = `You are about to transfer ownership of this project to ${TPEN.activeProject.collaborators[memberID]?.profile?.displayName ?? " contributor " + memberID}. This action is irreversible. Please confirm if you want to proceed.`
        if (window.confirm(confirmMessage)) {
            const response = await TPEN.activeProject.transferOwnership(memberID)
            if (response) {
                alert("Ownership transferred successfully.")
                location.reload()
            }
        }
    }

    openRoleModal(title, description, confirmCallback) {
        const modal = this.shadowRoot.querySelector("#roleModal")
        const modalTitle = this.shadowRoot.querySelector("#modalTitle")
        const modalDescription = this.shadowRoot.querySelector("#modalDescription")
        const rolesListContainer = this.shadowRoot.querySelector("#rolesListContainer")
        const confirmButton = this.shadowRoot.querySelector("#modalConfirmButton")
        const cancelButton = this.shadowRoot.querySelector("#modalCancelButton")

        modalTitle.textContent = title
        modalDescription.textContent = description
        this.renderRolesList(TPEN.activeProject.roles, rolesListContainer)

        confirmButton.onclick = () => {
            const selectedRoles = Array.from(
                rolesListContainer.querySelectorAll("input[type=checkbox]:checked")
            ).map((checkbox) => checkbox.value)
            confirmCallback(selectedRoles)
            this.closeRoleModal()
        }

        cancelButton.onclick = this.closeRoleModal.bind(this)
        modal.classList.remove("hidden")
    }

    renderRolesList(rolesObject, container) {
        container.innerHTML = ""
        Object.keys(rolesObject).forEach((role) => {
            if (role.toLowerCase() !== "owner") {
                container.innerHTML += `
                <style>
                .role-checkbox {
                    display: flex;
                    align-items: center;
                }
                .role-checkbox label {
                    display: flex;
                    align-items: center;
                }
                .role-checkbox input[type="checkbox"] {
                    margin-right: 5px;
                }
                </style>
                <div class="role-checkbox">
                    <label>
                        <input type="checkbox" value="${role}"/>${role}
                    </label>
                </div>`
            }
        })
    }

    closeRoleModal() {
        this.shadowRoot.querySelector("#roleModal").classList.add("hidden")
    }
}

customElements.define("roles-handler", RolesHandler)
