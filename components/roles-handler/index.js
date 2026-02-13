import TPEN from "../../api/TPEN.js"
import CheckPermissions from '../../components/check-permissions/checkPermissions.js'
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from "../../utilities/CleanupRegistry.js"

/**
 * RolesHandler - Manages role assignment UI for project collaborators.
 * Requires MEMBER view access.
 * @element roles-handler
 */
class RolesHandler extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
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
     * Shows permission message if user lacks MEMBER view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess("MEMBER", "*")) {
            this.shadowRoot.innerHTML = "<div>You do not have permissions to see group member roles.</div>"
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.renderCleanup.run()
        this.cleanup.run()
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
        this.addEventListeners()
        this.renderProjectCollaborators()
    }

    addEventListeners() {
        // Clear previous render-specific listeners
        this.renderCleanup.run()

        const groupMembersElement = document.querySelector("project-collaborators")?.shadowRoot?.querySelector(".group-members")
        if(!groupMembersElement) return
        this.renderCleanup.onElement(groupMembersElement, 'click', this.rolesHandler.bind(this))
    }

    renderProjectCollaborators() {
        if (!TPEN.activeProject) {
            return this.errorHTML.innerHTML = "No project"
        }
        const collaborators = TPEN.activeProject.collaborators
        const userHasEditAccess = CheckPermissions.checkEditAccess("member", "*")
        const groupMembersElement = document.querySelector("project-collaborators")?.shadowRoot?.querySelector(".group-members") 
        if(!groupMembersElement) return
        Array.from(groupMembersElement.children).filter(child => {
            const groupMembersActionsElement = child.querySelector(".actions")
            for (const collaboratorId in collaborators) {
                if (groupMembersActionsElement?.getAttribute("data-member-id") == collaboratorId) {
                    let memberHTML
                    if(userHasEditAccess){
                        memberHTML = this.createMemberHTML(collaboratorId)
                    }
                    else{
                        memberHTML = document.createElement("div")
                        memberHTML.innerHTML = "You do not have permission to edit member roles"
                    }
                    groupMembersActionsElement.appendChild(memberHTML)
                }  
            }
        })        
    }

    createMemberHTML(collaboratorId) {
        const memberElement = document.createElement("div")
        memberElement.innerHTML = `
            <button part="manage-roles-button" class="manage-roles-button" data-member-id="${collaboratorId}" aria-expanded="false" data-role-management-open="false">
                Manage Roles <i class="fas fa-caret-down"></i>
            </button>
        `
        return memberElement
    }

    toggleRoleManagementButtons(button) {
        if (!button) return

        const memberID = button.dataset?.memberId
        const actionsDiv = button.closest(".member")?.querySelector(".actions")
        if (!memberID || !actionsDiv) return

        const isOpen = button.getAttribute("aria-expanded") === "true"
        if (isOpen) {
            actionsDiv.querySelector(".role-management-buttons")?.remove()
            button.hidden = false
            button.setAttribute("aria-expanded", "false")
            button.dataset.roleManagementOpen = "false"
            return
        }

        const collaborator = TPEN.activeProject?.collaborators?.[memberID]
        if (!collaborator) return

        const buttons = this.generateRoleManagementButtons(collaborator, button.dataset ?? {})

        const roleManagementButtonsHTML = `
            <div part="role-management-buttons" class="role-management-buttons">
                ${buttons.join("")}
            </div>
        `

        const roleManagementDiv = document.createElement("div")
        roleManagementDiv.innerHTML = roleManagementButtonsHTML
        actionsDiv.appendChild(roleManagementDiv)
        button.hidden = true
        button.setAttribute("aria-expanded", "true")
        button.dataset.roleManagementOpen = "true"
    }

    generateRoleManagementButtons(collaborator, button) {
        const currentUserID = this.getAttribute("tpen-user-id")
        const currentUserIsOwner = TPEN.activeProject.collaborators[currentUserID]?.roles.includes("OWNER")

        const memberID = button.memberId
        const memberName = collaborator.profile?.displayName
        const hasDeleteAccess = CheckPermissions.checkDeleteAccess("member", "*")

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

        buttons.push(`<button part="close-role-management-button" class="close-role-management-button" data-member-id=${memberID}>Close</button>`)

        return buttons
    }

    async rolesHandler(event) {
        try {
            const button = event.target.closest("button")
            if (!button) return

            const { memberId } = button.dataset
            const memberName = button.dataset.memberName
            if (!memberId) return console.warn("Button does not have a valid member ID")

            switch (true) {
                case button.classList.contains("manage-roles-button"):
                    this.toggleRoleManagementButtons(button)
                    break
                case button.classList.contains("remove-button"):
                    await this.removeMember(memberId, memberName)
                    break
                case button.classList.contains("set-role-button"):
                    await this.handleSetRoleButton(memberId)
                    break
                case button.classList.contains("set-to-viewer-button"):
                    await this.handleSetToViewerButton(memberId)
                    break
                case button.classList.contains("make-leader-button"):
                    await this.handleMakeLeaderButton(memberId)
                    break
                case button.classList.contains("transfer-ownership-button"):
                    await this.handleTransferOwnershipButton(memberId)
                    break
                case button.classList.contains("demote-leader-button"):
                    await this.handleDemoteLeaderButton(memberId)
                    break
                case button.classList.contains("close-role-management-button"):
                    this.closeRoleManagement(memberId)
                    break
                default:
                    break
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
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Member removed successfully', status: 'success' })
            }
        } catch (error) {
            console.error("Error removing member:", error)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error removing member', status: 'error', dismissible: true })
        }
    }

    async handleSetRoleButton(memberID) {
        this.openRoleModal(
            "Manage Roles",
            `Add or remove roles for ${TPEN.activeProject.collaborators[memberID]?.profile?.displayName ?? " contributor " + memberID}`,
            async (selectedRoles) => {
                if (selectedRoles.length > 0) {
                    try {
                        const response = await TPEN.activeProject.cherryPickRoles(memberID, selectedRoles)
                        if (response) {
                            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Roles updated successfully.', status: 'success' })
                            this.refreshCollaborators()
                        }
                    } catch (error) {
                        console.error("Error updating roles:", error)
                        TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error updating roles', status: 'error', dismissible: true })
                    }
                }
            }
        )
    }

    async handleSetToViewerButton(memberID) {
        if (window.confirm(`Are you sure you want to remove all write access for ${memberID}? The user will become a VIEWER.`)) {
            try {
                const response = await TPEN.activeProject.setToViewer(memberID)
                if (response) {
                    TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'User role updated to VIEWER.', status: 'success' })
                    this.refreshCollaborators()
                }
            } catch (error) {
                console.error("Error updating user role:", error)
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error updating user role', status: 'error', dismissible: true })
            }
        }
    }

    async handleMakeLeaderButton(memberID) {
        if (window.confirm(`Are you sure you want to promote collaborator ${memberID} to LEADER?`)) {
            try {
                const response = await TPEN.activeProject.makeLeader(memberID)
                if (response) {
                    TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'User promoted to LEADER.', status: 'success' })
                    this.refreshCollaborators()
                }
            } catch (error) {
                console.error("Error promoting user:", error)
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error promoting user', status: 'error', dismissible: true })
            }
        }
    }

    async handleDemoteLeaderButton(memberID) {
        if (window.confirm(`Are you sure you want to demote collaborator ${memberID} from LEADER?`)) {
            try {
                const response = await TPEN.activeProject.demoteLeader(memberID)
                if (response) {
                    TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'User demoted from LEADER.', status: 'success' })
                    this.refreshCollaborators()
                }
            } catch (error) {
                console.error("Error demoting user:", error)
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error demoting user', status: 'error', dismissible: true })
            }
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

    closeRoleManagement(memberID) {
        const memberElement = document.querySelector("project-collaborators")?.shadowRoot?.querySelector(`[data-member-id="${memberID}"]`)
        const actionsDiv = memberElement?.querySelector(".actions")
        if (!actionsDiv) return
        actionsDiv.querySelector(".role-management-buttons")?.remove()
        const manageButton = actionsDiv.querySelector(".manage-roles-button")
        if (manageButton) {
            manageButton.hidden = false
            manageButton.setAttribute("aria-expanded", "false")
        }
    }

    /**
     * Refreshes the project collaborators display by calling the refresh method
     * on the project-collaborators component.
     */
    refreshCollaborators() {
        const collaboratorsComponent = document.querySelector("project-collaborators")
        if (collaboratorsComponent?.refreshCollaborators) {
            collaboratorsComponent.refreshCollaborators()
        }
        requestAnimationFrame(() => {
            this.addEventListeners()
            this.renderProjectCollaborators()
        })
    }
}

customElements.define("roles-handler", RolesHandler)
