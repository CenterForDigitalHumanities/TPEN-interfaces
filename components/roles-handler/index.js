import TPEN from "../../api/TPEN.mjs"

class RolesHandler extends HTMLElement {
    constructor() {
        super()
        TPEN.attachAuthentication(this)
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.render()
        this.addEventListeners()
        TPEN.attachAuthentication(content)
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>

            .modal-content {
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                width: 400px;
            }

            .modal-actions {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }

            .modal-actions button {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .modal-actions button#modalConfirmButton {
                background-color: #28a745;
                color: white;
            }

            .modal-actions button#modalCancelButton {
                background-color: #dc3545;
                color: white;
            }

            .modal.hidden {
                display: none;
            }
        </style>
        <div class="role-modal-container">
            <div id="roleModal" class="modal hidden">
                <div class="modal-content">
                    <h2 id="modalTitle"></h2>
                    <p id="modalDescription"></p>
                    <!-- Roles List -->
                    <div id="rolesListContainer" class="defaultRoles"></div>
                    <!-- Modal Buttons -->
                    <div class="modal-actions">
                        <button id="modalConfirmButton">Confirm</button>
                        <button id="modalCancelButton">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
        `
    }

    addEventListeners() {
        const groupMembersElement = document.querySelector("project-collaborators").shadowRoot.querySelector(".group-members")
        groupMembersElement.addEventListener('click', this.rolesHandler.bind(this));
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
                container.innerHTML += `<div class="role-checkbox"><label><input type="checkbox" value="${role}"/>${role}</label></div>`
            }
        })
    }

    closeRoleModal() {
        this.shadowRoot.querySelector("#roleModal").classList.add("hidden")
    }
}

customElements.define("roles-handler", RolesHandler)
