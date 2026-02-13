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
        .modal-content {
            background: var(--color-white, white);
            padding: 24px;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        #modalTitle {
            margin: 0 0 20px 0;
            font-size: 1.5rem;
            color: var(--color-text, #333);
        }
        .role-toggles {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }
        .role-row {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .role-toggle-btn {
            min-width: 120px;
            padding: 10px 16px;
            border: 2px solid var(--border-color, #ddd);
            background: linear-gradient(to right, var(--primary-color, #1976d2) 50%, var(--color-white, white) 50%);
            background-size: 200% 100%;
            background-position: 100% 0;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            transition: background-position 0.3s ease, border-color 0.3s ease, color 0.3s ease;
            color: var(--color-text, #333);
        }
        .role-toggle-btn:hover {
            border-color: var(--primary-color, #1976d2);
        }
        .role-toggle-btn.active {
            background-position: 0 0;
            border-color: var(--primary-color, #1976d2);
            color: var(--color-white, white);
        }
        .role-help-text {
            flex: 1;
            font-size: 0.875rem;
            color: var(--color-text-secondary, #666);
        }
        .action-row {
            display: flex;
            gap: 8px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color, #e0e0e0);
            flex-wrap: nowrap;
        }
        .action-btn {
            padding: 8px 16px;
            border: 1px solid var(--border-color, #ccc);
            background: var(--color-white, white);
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            color: var(--color-text, #333);
            transition: all 0.2s;
        }
        .action-btn:hover {
            background: var(--gray-100, #f5f5f5);
        }
        .action-btn.readonly-btn {
            color: var(--warning-color, #f57c00);
        }
        .action-btn.readonly-btn:hover {
            background: var(--warning-light, #fff3e0);
        }
        .action-btn.destructive {
            color: var(--danger-color, #d32f2f);
        }
        .action-btn.destructive:hover {
            background: var(--danger-light, #ffebee);
        }
        .action-btn.icon-only {
            width: 36px;
            height: 36px;
            padding: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .action-btn.icon-only .tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
            padding: 6px 10px;
            background: var(--color-text, #333);
            color: var(--color-white, white);
            font-size: 0.8rem;
            white-space: nowrap;
            border-radius: 4px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 1001;
        }
        .action-btn.icon-only .tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-top-color: var(--color-text, #333);
        }
        .action-btn.icon-only:hover .tooltip {
            opacity: 1;
        }
        .action-btn.hidden {
            display: none;
        }
        .modal-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 20px;
        }
        .modal-actions button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        #modalSaveButton {
            background: var(--primary-color, #1976d2);
            color: var(--color-white, white);
        }
        #modalSaveButton:hover {
            background: var(--primary-dark, #1565c0);
        }
        #modalCancelButton {
            background: var(--gray-300, #e0e0e0);
            color: var(--color-text, #333);
        }
        #modalCancelButton:hover {
            background: var(--gray-400, #d0d0d0);
        }
        </style>
        <div part="role-modal-container" class="role-modal-container">
            <div id="roleModal" class="modal hidden">
                <div part="modal-content" class="modal-content">
                    <h2 id="modalTitle"></h2>
                    
                    <!-- Role Toggle Buttons -->
                    <div class="role-toggles">
                        <div class="role-row">
                            <button class="role-toggle-btn" id="leaderToggle" data-role="LEADER">Leader</button>
                            <span class="role-help-text">Manage materials and membership</span>
                        </div>
                        <div class="role-row">
                            <button class="role-toggle-btn" id="contributorToggle" data-role="CONTRIBUTOR">Contributor</button>
                            <span class="role-help-text">Describe and annotate</span>
                        </div>
                    </div>
                    
                    <!-- Action Buttons Row -->
                    <div class="action-row" id="actionRow">
                        <button class="action-btn readonly-btn" id="readonlyBtn">Set to Read-Only</button>
                        <button class="action-btn destructive icon-only" id="transferBtn" aria-label="Transfer Ownership">
                            <span class="icon">👑</span>
                            <span class="tooltip">Transfer Ownership</span>
                        </button>
                        <button class="action-btn destructive icon-only" id="removeBtn" aria-label="Remove Collaborator">
                            <span class="icon">✕</span>
                            <span class="tooltip">Remove Collaborator</span>
                        </button>
                    </div>
                    
                    <!-- Modal Buttons -->
                    <div part="modal-actions" class="modal-actions">
                        <button part="modal-buttons-cancel" id="modalCancelButton">Cancel</button>
                        <button part="modal-buttons-save" id="modalSaveButton">Save Changes</button>
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
        Array.from(groupMembersElement.children).forEach(child => {
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
            <button part="manage-button" class="manage-button" data-member-id="${collaboratorId}">
                Manage
            </button>
        `
        return memberElement
    }

    openManageModal(memberID) {
        if (!memberID) return
        const collaborator = TPEN.activeProject?.collaborators?.[memberID]
        if (!collaborator) return

        const memberName = collaborator.profile?.displayName ?? memberID
        this.currentMemberID = memberID
        this.currentMemberName = memberName
        this.originalRoles = [...collaborator.roles]
        
        this.openRoleModal(
            `Manage ${memberName}`,
            memberID
        )
    }

    async rolesHandler(event) {
        try {
            const button = event.target.closest("button")
            if (!button) return

            const { memberId } = button.dataset
            if (!memberId) return console.warn("Button does not have a valid member ID")

            switch (true) {
                case button.classList.contains("manage-button"):
                    this.openManageModal(memberId)
                    break
                default:
                    break
            }
        } catch (error) {
            console.error("Error handling button action:", error)
            alert("An error occurred. Please try again.")
        }
    }

    openRoleModal(title, memberID) {
        const modal = this.shadowRoot.querySelector("#roleModal")
        const modalTitle = this.shadowRoot.querySelector("#modalTitle")
        const leaderToggle = this.shadowRoot.querySelector("#leaderToggle")
        const contributorToggle = this.shadowRoot.querySelector("#contributorToggle")
        const readonlyBtn = this.shadowRoot.querySelector("#readonlyBtn")
        const transferBtn = this.shadowRoot.querySelector("#transferBtn")
        const removeBtn = this.shadowRoot.querySelector("#removeBtn")
        const saveButton = this.shadowRoot.querySelector("#modalSaveButton")
        const cancelButton = this.shadowRoot.querySelector("#modalCancelButton")

        const collaborator = TPEN.activeProject?.collaborators?.[memberID]
        if (!collaborator) return

        const currentUserID = this.getAttribute("tpen-user-id")
        const currentUserIsOwner = TPEN.activeProject.collaborators[currentUserID]?.roles.includes("OWNER")
        const hasDeleteAccess = CheckPermissions.checkDeleteAccess("member", "*")
        const isOwner = collaborator.roles.includes("OWNER")
        const memberName = collaborator.profile?.displayName ?? memberID

        modalTitle.textContent = title
        
        // Set initial toggle states
        const updateToggleStates = () => {
            const hasLeader = leaderToggle.classList.contains("active")
            const hasContributor = contributorToggle.classList.contains("active")
            
            // Show readonly button only if Leader or Contributor is active
            if (hasLeader || hasContributor) {
                readonlyBtn.classList.remove("hidden")
            } else {
                readonlyBtn.classList.add("hidden")
            }
        }

        // Initialize role toggles
        if (collaborator.roles.includes("LEADER")) leaderToggle.classList.add("active")
        if (collaborator.roles.includes("CONTRIBUTOR")) contributorToggle.classList.add("active")
        updateToggleStates()

        // Toggle handlers
        leaderToggle.onclick = () => {
            leaderToggle.classList.toggle("active")
            updateToggleStates()
        }

        contributorToggle.onclick = () => {
            contributorToggle.classList.toggle("active")
            updateToggleStates()
        }

        // Read-only button: remove Leader and Contributor
        readonlyBtn.onclick = () => {
            leaderToggle.classList.remove("active")
            contributorToggle.classList.remove("active")
            updateToggleStates()
        }

        // Transfer ownership button
        if (!isOwner && currentUserIsOwner) {
            transferBtn.classList.remove("hidden")
            transferBtn.onclick = async () => {
                await this.handleTransferOwnership(memberID, memberName)
            }
        } else {
            transferBtn.classList.add("hidden")
        }

        // Remove collaborator button
        if (hasDeleteAccess) {
            removeBtn.classList.remove("hidden")
            removeBtn.onclick = async () => {
                await this.handleRemoveMember(memberID, memberName)
            }
        } else {
            removeBtn.classList.add("hidden")
        }

        // Save button handler
        saveButton.onclick = async () => {
            await this.saveRoleChanges(memberID, leaderToggle, contributorToggle)
        }

        // Cancel button handler with unsaved changes check
        cancelButton.onclick = () => {
            this.handleModalClose(leaderToggle, contributorToggle)
        }

        modal.classList.remove("hidden")
    }

    async saveRoleChanges(memberID, leaderToggle, contributorToggle) {
        const selectedRoles = []
        
        if (leaderToggle.classList.contains("active")) selectedRoles.push("LEADER")
        if (contributorToggle.classList.contains("active")) selectedRoles.push("CONTRIBUTOR")
        
        // If no Leader or Contributor, they become VIEWER
        if (selectedRoles.length === 0) {
            selectedRoles.push("VIEWER")
        }
        
        try {
            const response = await TPEN.activeProject.cherryPickRoles(memberID, selectedRoles)
            if (response) {
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Roles updated successfully.', status: 'success' })
                this.closeRoleModal()
                this.refreshCollaborators()
            }
        } catch (error) {
            console.error("Error updating roles:", error)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error updating roles', status: 'error', dismissible: true })
        }
    }

    handleModalClose(leaderToggle, contributorToggle) {
        const currentRoles = []
        if (leaderToggle.classList.contains("active")) currentRoles.push("LEADER")
        if (contributorToggle.classList.contains("active")) currentRoles.push("CONTRIBUTOR")
        if (currentRoles.length === 0) currentRoles.push("VIEWER")
        
        const currentSelection = currentRoles.sort().join(",")
        const originalSelection = this.originalRoles.filter(r => ["LEADER", "CONTRIBUTOR", "VIEWER"].includes(r)).sort().join(",") || "VIEWER"
        
        if (currentSelection !== originalSelection) {
            if (confirm("You have unsaved changes. Discard changes and close?")) {
                this.closeRoleModal()
            }
        } else {
            this.closeRoleModal()
        }
    }

    async handleTransferOwnership(memberID, memberName) {
        const confirmMessage = `You are about to transfer ownership of this project to ${memberName}. This action is irreversible. Please confirm if you want to proceed.`
        if (window.confirm(confirmMessage)) {
            const response = await TPEN.activeProject.transferOwnership(memberID)
            if (response) {
                alert("Ownership transferred successfully.")
                location.reload()
            }
        }
    }

    async handleRemoveMember(memberID, memberName) {
        if (!confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)) return
        try {
            const data = await TPEN.activeProject.removeMember(memberID)
            if (data) {
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Member removed successfully', status: 'success' })
                this.closeRoleModal()
                this.refreshCollaborators()
            }
        } catch (error) {
            console.error("Error removing member:", error)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Error removing member', status: 'error', dismissible: true })
        }
    }

    closeRoleModal() {
        this.shadowRoot.querySelector("#roleModal").classList.add("hidden")
        this.currentMemberID = null
        this.currentMemberName = null
        this.originalRoles = []
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
