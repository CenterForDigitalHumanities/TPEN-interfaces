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
        this._injectManageButtonStyles()
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    _injectManageButtonStyles() {
        // Check if styles are already injected
        if (document.getElementById('roles-handler-manage-button-styles')) return
        
        const styleEl = document.createElement('style')
        styleEl.id = 'roles-handler-manage-button-styles'
        styleEl.textContent = `
            project-collaborators::part(manage-button) {
                background: var(--primary-color, #1976d2);
                color: var(--white, white);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                font-size: 0.9rem;
                transition: all 0.2s ease;
                box-shadow: 0 2px 6px var(--interface-primary-shadow, rgba(25, 118, 210, 0.25));
            }
            project-collaborators::part(manage-button):hover {
                background: var(--primary-dark, #1565c0);
                box-shadow: 0 4px 10px var(--interface-primary-shadow, rgba(25, 118, 210, 0.4));
                transform: translateY(-1px);
            }
            project-collaborators::part(manage-button):active {
                transform: translateY(0);
                box-shadow: 0 2px 4px var(--interface-primary-shadow, rgba(25, 118, 210, 0.25));
            }
        `
        document.head.appendChild(styleEl)
        this.cleanup.add(() => {
            document.getElementById('roles-handler-manage-button-styles')?.remove()
        })
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
        #roleModal {
            padding: 50px 24px 24px 24px;
            border-radius: 8px;
            border: none;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            position: relative;
            overflow: visible;
        }
        #roleModal::backdrop {
            background: rgba(0, 0, 0, 0.5);
        }
        #roleModal[open] {
            display: flex;
            flex-direction: column;
        }
        #roleModal {
            color: var(--color-text, #333);
            background: var(--color-white, white);
        }
        #roleModal > :first-child {
            margin-top: 0;
        }
        #roleCloseButton {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--color-text, #333);
            cursor: pointer;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        #roleCloseButton:hover {
            color: var(--danger-color, #d32f2f);
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
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .role-toggle-btn::before {
            content: '☐';
            font-size: 1.1em;
            flex-shrink: 0;
        }
        .role-toggle-btn:hover {
            border-color: var(--primary-color, #1976d2);
        }
        .role-toggle-btn.active {
            background-position: 0 0;
            border-color: var(--primary-color, #1976d2);
            color: var(--color-white, white);
        }
        .role-toggle-btn.active::before {
            content: '☑';
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
            overflow: visible;
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
            color: var(--text-primary, #f57c00);
        }
        .action-btn.readonly-btn:hover {
            background: var(--warning-color, #fff3e0);
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
            z-index: 10000;
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
            padding: 12px 28px;
            font-size: 1rem;
            min-width: 140px;
            box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
            transition: all 0.2s ease;
        }
        #modalSaveButton:hover {
            background: var(--primary-dark, #1565c0);
            box-shadow: 0 4px 12px rgba(25, 118, 210, 0.5);
            transform: translateY(-1px);
        }
        #modalSaveButton:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
        }
        .custom-roles-section {
            margin: 20px 0;
            padding: 16px;
            border: 1px solid var(--border-color, #e0e0e0);
            border-radius: 6px;
            background: var(--gray-50, #fafafa);
        }
        .custom-roles-section h3 {
            margin: 0 0 12px 0;
            font-size: 1rem;
            color: var(--color-text, #333);
        }
        .custom-roles-toggles {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        .custom-role-toggle {
            min-width: 100px;
            padding: 6px 12px;
            border: 2px solid var(--border-color, #ddd);
            background: linear-gradient(to right, var(--primary-color, #1976d2) 50%, var(--color-white, white) 50%);
            background-size: 200% 100%;
            background-position: 100% 0;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 0.875rem;
            transition: background-position 0.3s ease, border-color 0.3s ease, color 0.3s ease;
            color: var(--color-text, #333);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .custom-role-toggle::before {
            content: '☐';
            font-size: 1.1em;
            flex-shrink: 0;
        }
        .custom-role-toggle:hover {
            border-color: var(--primary-color, #1976d2);
        }
        .custom-role-toggle.active {
            background-position: 0 0;
            border-color: var(--primary-color, #1976d2);
            color: var(--color-white, white);
        }
        .custom-role-toggle.active::before {
            content: '☑';
        }
        </style>
        <dialog id="roleModal" aria-labelledby="modalTitle">
            <button id="roleCloseButton" aria-label="Close dialog">✕</button>
            <h2 id="modalTitle"></h2>
            
            <!-- Role Toggle Buttons -->
            <div class="role-toggles">
                <div class="role-row">
                    <button class="role-toggle-btn" id="leaderToggle">Leader</button>
                    <span class="role-help-text">Manage materials and membership</span>
                </div>
                <div class="role-row">
                    <button class="role-toggle-btn" id="contributorToggle">Contributor</button>
                    <span class="role-help-text">Describe and annotate</span>
                </div>
            </div>
            
            <!-- Custom Roles Section -->
            <div class="custom-roles-section" id="customRolesSection" style="display: none;">
                <h3>Custom Roles</h3>
                <div class="custom-roles-toggles" id="customRolesToggles"></div>
            </div>
            
            <!-- Action Buttons Row -->
            <div class="action-row">
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
                <button part="modal-buttons-save" id="modalSaveButton">Save Changes</button>
            </div>
        </dialog>
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
        
        // Listen for member invitation events to refresh the collaborators list
        this.renderCleanup.onEvent(TPEN.eventDispatcher, 'tpen-member-invited', () => {
            this.refreshCollaborators()
        })
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
                    // Clear any previously injected manage buttons to prevent duplicates
                    groupMembersActionsElement.querySelectorAll(".manage-button").forEach(btn => {
                        btn.closest("div")?.remove()
                    })
                    
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

    /**
     * Helper to extract meaningful error message from error object
     * @param {Error|Object} error - The error object
     * @returns {string} - User-friendly error message
     */
    getErrorMessage(error) {
        // Check for HTTP status codes
        if (error?.response?.status) {
            const status = error.response.status
            const statusText = error.response.statusText || ''
            const message = error.response?.data?.message || error.response?.data?.error || ''
            
            if (message) {
                return `${status} ${statusText}: ${message}`.trim()
            }
            
            if (status === 403) return '403 Forbidden: You do not have permission to perform this action'
            if (status === 404) return '404 Not Found: The resource could not be found'
            if (status === 409) return '409 Conflict: This action conflicts with the current state'
            if (status >= 500) return `${status} Server Error: Please try again later`
            if (status >= 400) return `${status} ${statusText}`
        }
        
        // Check for message property
        if (error?.message) return error.message
        
        // Fallback
        return 'An unexpected error occurred'
    }

    async rolesHandler(event) {
        try {
            const button = event.target.closest("button")
            if (!button) return

            const { memberId } = button.dataset
            if (!memberId) return console.warn("Button does not have a valid member ID")

            if (button.classList.contains("manage-button")) {
                // Store trigger element for focus restoration
                this.triggerElement = button
                this.openManageModal(memberId)
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
        const closeButton = this.shadowRoot.querySelector("#roleCloseButton")

        const collaborator = TPEN.activeProject?.collaborators?.[memberID]
        if (!collaborator) return

        const currentUserID = this.getAttribute("tpen-user-id")
        const currentUserIsOwner = TPEN.activeProject.collaborators[currentUserID]?.roles.includes("OWNER")
        const hasDeleteAccess = CheckPermissions.checkDeleteAccess("member", "*")
        const isOwner = collaborator.roles.includes("OWNER")
        const memberName = collaborator.profile?.displayName ?? memberID

        modalTitle.textContent = title
        
        // Get custom roles from project.roles (anything not a default role)
        const defaultRoles = ['OWNER', 'LEADER', 'CONTRIBUTOR', 'VIEWER']
        const customRoleIds = Object.keys(TPEN.activeProject?.roles || {}).filter(roleId => 
            !defaultRoles.includes(roleId.toUpperCase())
        )
        
        // Render custom roles toggle buttons
        const customRolesSection = this.shadowRoot.querySelector("#customRolesSection")
        const customRolesToggles = this.shadowRoot.querySelector("#customRolesToggles")
        
        if (customRoleIds.length > 0) {
            customRolesSection.style.display = 'block'
            customRolesToggles.innerHTML = ''
            
            customRoleIds.forEach(roleId => {
                const isActive = collaborator.roles.some(r => r.toUpperCase() === roleId.toUpperCase())
                const button = document.createElement('button')
                button.className = `custom-role-toggle ${isActive ? 'active' : ''}`
                button.setAttribute('data-role-id', roleId.toUpperCase())
                button.setAttribute('aria-pressed', isActive)
                button.textContent = roleId
                
                this.renderCleanup.onElement(button, 'click', () => {
                    button.classList.toggle('active')
                    button.setAttribute('aria-pressed', button.classList.contains('active'))
                    updateSaveButtonState()
                })
                
                customRolesToggles.appendChild(button)
            })
        } else {
            customRolesSection.style.display = 'none'
        }
        
        // Helper to get current roles from modal state
        const getCurrentRoles = () => {
            const currentRoles = []
            if (leaderToggle.classList.contains("active")) currentRoles.push("LEADER")
            if (contributorToggle.classList.contains("active")) currentRoles.push("CONTRIBUTOR")
            
            // Collect custom roles from toggle buttons
            const customRoleToggles = this.shadowRoot.querySelectorAll(".custom-role-toggle.active")
            customRoleToggles.forEach(button => {
                const roleId = button.getAttribute('data-role-id')
                if (roleId) currentRoles.push(roleId)
            })
            
            // Add VIEWER if no Leader or Contributor
            if (!currentRoles.includes("LEADER") && !currentRoles.includes("CONTRIBUTOR")) {
                currentRoles.push("VIEWER")
            }
            
            return currentRoles
        }
        
        // Helper to check if there are unsaved changes
        const hasChanges = () => {
            const currentRoles = getCurrentRoles()
            const currentSelection = currentRoles.sort().join(",")
            const originalSelection = this.originalRoles.sort().join(",")
            return currentSelection !== originalSelection
        }
        
        // Helper to update Save button state
        const updateSaveButtonState = () => {
            saveButton.disabled = !hasChanges()
        }
        
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
            
            updateSaveButtonState()
        }

        // Initialize role toggles - clear first, then set based on current member
        leaderToggle.classList.remove("active")
        contributorToggle.classList.remove("active")
        leaderToggle.setAttribute("aria-pressed", "false")
        contributorToggle.setAttribute("aria-pressed", "false")
        if (collaborator.roles.includes("LEADER")) {
            leaderToggle.classList.add("active")
            leaderToggle.setAttribute("aria-pressed", "true")
        }
        if (collaborator.roles.includes("CONTRIBUTOR")) {
            contributorToggle.classList.add("active")
            contributorToggle.setAttribute("aria-pressed", "true")
        }
        updateToggleStates()

        // Toggle handlers
        this.renderCleanup.onElement(leaderToggle, 'click', () => {
            leaderToggle.classList.toggle("active")
            leaderToggle.setAttribute("aria-pressed", leaderToggle.classList.contains("active"))
            updateToggleStates()
        })

        this.renderCleanup.onElement(contributorToggle, 'click', () => {
            contributorToggle.classList.toggle("active")
            contributorToggle.setAttribute("aria-pressed", contributorToggle.classList.contains("active"))
            updateToggleStates()
        })

        // Read-only button: remove Leader and Contributor
        this.renderCleanup.onElement(readonlyBtn, 'click', () => {
            leaderToggle.classList.remove("active")
            contributorToggle.classList.remove("active")
            leaderToggle.setAttribute("aria-pressed", "false")
            contributorToggle.setAttribute("aria-pressed", "false")
            updateToggleStates()
        })

        // Transfer ownership button
        if (!isOwner && currentUserIsOwner) {
            transferBtn.classList.remove("hidden")
            this.renderCleanup.onElement(transferBtn, 'click', async () => {
                await this.handleTransferOwnership(memberID, memberName)
            })
        } else {
            transferBtn.classList.add("hidden")
        }

        // Remove collaborator button
        if (hasDeleteAccess) {
            removeBtn.classList.remove("hidden")
            this.renderCleanup.onElement(removeBtn, 'click', async () => {
                await this.handleRemoveMember(memberID, memberName)
            })
        } else {
            removeBtn.classList.add("hidden")
        }

        // Save button handler
        this.renderCleanup.onElement(saveButton, 'click', async () => {
            await this.saveRoleChanges(memberID, leaderToggle, contributorToggle)
        })

        // Cancel button handler with unsaved changes check
        this.renderCleanup.onElement(closeButton, 'click', (e) => {
            e.preventDefault()
            this.handleModalClose(leaderToggle, contributorToggle)
        })

        // Handle Escape key with unsaved changes check
        this.renderCleanup.onElement(modal, 'cancel', (e) => {
            e.preventDefault()
            this.handleModalClose(leaderToggle, contributorToggle)
        })

        modal.showModal()
    }

    async saveRoleChanges(memberID, leaderToggle, contributorToggle) {
        const saveButton = this.shadowRoot.querySelector("#modalSaveButton")
        const selectedRoles = []
        
        if (leaderToggle.classList.contains("active")) selectedRoles.push("LEADER")
        if (contributorToggle.classList.contains("active")) selectedRoles.push("CONTRIBUTOR")
        
        // Collect custom roles from toggle buttons
        const customRoleToggles = this.shadowRoot.querySelectorAll(".custom-role-toggle.active")
        customRoleToggles.forEach(button => {
            const roleId = button.getAttribute('data-role-id')
            if (roleId) selectedRoles.push(roleId)
        })
        
        // If no Leader or Contributor, they become VIEWER
        if (!selectedRoles.includes("LEADER") && !selectedRoles.includes("CONTRIBUTOR")) {
            selectedRoles.push("VIEWER")
        }
        
        // Disable button and show loading state
        saveButton.disabled = true
        saveButton.textContent = "Saving..."
        
        try {
            const response = await TPEN.activeProject.cherryPickRoles(memberID, selectedRoles)
            if (response) {
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Roles updated successfully.', status: 'success' })
                this.closeRoleModal()
                this.refreshCollaborators()
            }
        } catch (error) {
            console.error("Error updating roles:", error)
            const errorMessage = this.getErrorMessage(error)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: errorMessage, status: 'error', dismissible: true })
        } finally {
            // Re-enable button and restore text
            saveButton.disabled = false
            saveButton.textContent = "Save Changes"
        }
    }

    handleModalClose(leaderToggle, contributorToggle) {
        const currentRoles = []
        if (leaderToggle.classList.contains("active")) currentRoles.push("LEADER")
        if (contributorToggle.classList.contains("active")) currentRoles.push("CONTRIBUTOR")
        
        // Collect custom roles from toggle buttons
        const customRoleToggles = this.shadowRoot.querySelectorAll(".custom-role-toggle.active")
        customRoleToggles.forEach(button => {
            const roleId = button.getAttribute('data-role-id')
            if (roleId) currentRoles.push(roleId)
        })
        
        if (!currentRoles.includes("LEADER") && !currentRoles.includes("CONTRIBUTOR")) {
            currentRoles.push("VIEWER")
        }
        
        const currentSelection = currentRoles.sort().join(",")
        const originalSelection = this.originalRoles.sort().join(",")
        
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
        if (!window.confirm(confirmMessage)) return
        
        try {
            const response = await TPEN.activeProject.transferOwnership(memberID)
            if (response) {
                TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Ownership transferred successfully.', status: 'success' })
                location.reload()
            }
        } catch (error) {
            console.error("Error transferring ownership:", error)
            const errorMessage = this.getErrorMessage(error)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: errorMessage, status: 'error', dismissible: true })
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
            const errorMessage = this.getErrorMessage(error)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: errorMessage, status: 'error', dismissible: true })
        }
    }

    closeRoleModal() {
        const modal = this.shadowRoot.querySelector("#roleModal")
        modal.close()
        this.currentMemberID = null
        this.currentMemberName = null
        this.originalRoles = []
        
        // Restore focus to the trigger element
        if (this.triggerElement) {
            this.triggerElement.focus()
            this.triggerElement = null
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
