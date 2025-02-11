import TPEN from "../api/TPEN.mjs"

export async function rolesHandler(event) {
    try {
        const button = event.target.closest("button")
        if (!button) return

        const { memberId } = button.dataset
        const memberName = button.dataset.memberName
        console.log(button)
        if (!memberId) return console.warn("Button does not have a valid member ID")

        const actions = {
            "remove-button": () => removeMember(memberId, memberName),
            "set-role-button": () => handleSetRoleButton(memberId),
            "set-to-viewer-button": () => handleSetToViewerButton(memberId),
            "make-leader-button": () => handleMakeLeaderButton(memberId),
            "transfer-ownership-button": () => handleTransferOwnershipButton(memberId),
            "demote-leader-button": () => handleDemoteLeaderButton(memberId),
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

async function removeMember(memberID, memberName) {
    if (!confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)) return
    try {
        const data = await TPEN.activeProject.removeMember(memberID)
        if (data) {
            document.querySelector(`[data-member-id="${memberID}"]`)?.remove()
            alert('Member removed successfully')
        }
    } catch (error) {
        errorHTML.innerHTML = error.toString()
    }
}

async function handleSetRoleButton(memberID) {
    openRoleModal(
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

async function handleSetToViewerButton(memberID) {
    if (window.confirm(`Are you sure you want to remove all write access for ${memberID}? The user will become a VIEWER.`)) {
        const response = await TPEN.activeProject.setToViewer(memberID)
        if (response) alert("User role updated to VIEWER.")
    }
}

async function handleMakeLeaderButton(memberID) {
    if (window.confirm(`Are you sure you want to promote collaborator ${memberID} to LEADER?`)) {
        const response = await TPEN.activeProject.makeLeader(memberID)
        if (response) alert("User promoted to LEADER.")
    }
}

async function handleDemoteLeaderButton(memberID) {
    if (window.confirm(`Are you sure you want to demote collaborator ${memberID} from LEADER?`)) {
        const response = await TPEN.activeProject.demoteLeader(memberID)
        if (response) alert("User demoted from LEADER.")
    }
}

async function handleTransferOwnershipButton(memberID) {
    const confirmMessage = `You are about to transfer ownership of this project to ${TPEN.activeProject.collaborators[memberID]?.profile?.displayName ?? " contributor " + memberID}. This action is irreversible. Please confirm if you want to proceed.`
    if (window.confirm(confirmMessage)) {
        const response = await TPEN.activeProject.transferOwnership(memberID)
        if (response) {
            alert("Ownership transferred successfully.")
            location.reload()
        }
    }
}

function openRoleModal(title, description, confirmCallback) {
    const modal = document.getElementById("roleModal")
    const modalTitle = document.getElementById("modalTitle")
    const modalDescription = document.getElementById("modalDescription")
    const rolesListContainer = document.getElementById("rolesListContainer")
    const confirmButton = document.getElementById("modalConfirmButton")
    const cancelButton = document.getElementById("modalCancelButton")

    modalTitle.textContent = title
    modalDescription.textContent = description
    renderRolesList(TPEN.activeProject.roles, rolesListContainer)

    confirmButton.onclick = () => {
        const selectedRoles = Array.from(
            rolesListContainer.querySelectorAll("input[type=checkbox]:checked")
        ).map((checkbox) => checkbox.value)
        confirmCallback(selectedRoles)
        closeRoleModal()
    }

    cancelButton.onclick = closeRoleModal
    modal.classList.remove("hidden")
}

function renderRolesList(rolesObject, container) {
    container.innerHTML = ""
    Object.keys(rolesObject).forEach((role) => {
        if (role.toLowerCase() != "owner") {
            container.innerHTML += `<div class="role-checkbox"><label><input type="checkbox" value="${role}"/>${role}</label></div>`
        }
    })
}

function closeRoleModal() {
    document.getElementById("roleModal").classList.add("hidden")
}
