import TPEN from "../api/TPEN.mjs"
import { eventDispatcher } from "../api/events.mjs"

let groupTitle = document.querySelector(".project-title")
let groupMembersElement = document.querySelector(".group-members")
let submitButton = document.getElementById("submit")
let userEmail = document.getElementById("invitee-email")
const inviteForm = document.getElementById("invite-form")
let errorHTML = document.getElementById("errorHTML")
let isOwnerOrLeader = false

eventDispatcher.on('tpen-project-loaded', renderProjectCollaborators)
TPEN.attachAuthentication(content)

inviteForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    try {
        submitButton.textContent = "Inviting..."
        submitButton.disabled = true

        const response = await TPEN.activeProject.addMember(userEmail.value)
        if (!response) throw new Error("Invitation failed")
        submitButton.textContent = "Submit"
        submitButton.disabled = false
        renderProjectCollaborators()
        userEmail.value = ""

        // Display a success message
        const successMessage = document.createElement("p")
        successMessage.textContent = "Invitation sent successfully!"
        successMessage.classList.add("success-message")
        document.getElementById("invite-section-container").appendChild(successMessage)

        // Remove the success message after a 3 seconds delay
        setTimeout(() => {
            successMessage.remove()
        }, 3000)
    } catch (error) {
        setTimeout(() => {
            errorHTML.remove()
        }, 3000)
        errorHTML.innerHTML = error.message
        submitButton.textContent = "Submit"
        submitButton.disabled = false
    }
})

groupMembersElement.addEventListener("click", async (e) => {
    try {
        const button = e.target.closest("button") // Ensure the clicked element is a button
        if (!button) return // Ignore clicks outside buttons

        const memberID = button.dataset.memberId
        const memberName = button.dataset.memberName

        if (!memberID) {
            console.warn("Button does not have a valid member ID")
            return
        }

        switch (true) {
            case button.classList.contains("remove-button"):
                await removeMember(memberID, memberName)
                break

            case button.classList.contains("set-role-button"):
                await handleSetRoleButton(memberID)
                break

            case button.classList.contains("set-to-viewer-button"):
                await handleSetToViewerButton(memberID)
                break

            case button.classList.contains("make-leader-button"):
                await handleMakeLeaderButton(memberID)
                break

            case button.classList.contains("transfer-ownership-button"):
                await handleTransferOwnershipButton(memberID)
                break

            case button.classList.contains("demote-leader-button"):
                await handleDemoteLeaderButton(memberID)
                break

            default:
                console.warn("Unhandled button action")
        }
    } catch (error) {
        console.error("Error handling button action:", error)
        alert("An error occurred. Please try again.")
    }
})

async function renderProjectCollaborators() {
    if (!TPEN.activeProject) {
        return errorHTML.innerHTML = "No project"
    }

    const userId = content.getAttribute('tpen-user-id')
    groupMembersElement.innerHTML = ""

    const collaborators = TPEN.activeProject.collaborators
    groupTitle.innerHTML = TPEN.activeProject.getLabel()
    if (collaborators[userId]?.roles.includes("OWNER") || collaborators[userId]?.roles.includes("LEADER")) {
        isOwnerOrLeader = true
    }
    for (const collaboratorId in collaborators) {
        const memberData = collaborators[collaboratorId]
        const memberHTML = `
<li class="member" data-member-id=${collaboratorId}>
  <div class="member-info">
    <span class="role">${renderRoles(memberData.roles)}</span>
    ${memberData.profile?.displayName ?? collaboratorId}
  </div>

  <div class="actions">
    <button class="manage-roles-button" data-member-id=${collaboratorId}>
      Manage Roles <i class="fas fa-caret-down"></i>
    </button>
  </div>
</li>

        `

        const memberElement = document.createElement("div")
        memberElement.innerHTML = memberHTML

        groupMembersElement.appendChild(memberElement)
    }

    // Add event listener for "Manage Roles" button
    groupMembersElement.addEventListener("click", (e) => {
        const button = e.target
        const memberID = button.dataset.memberId

        if (button.classList.contains("manage-roles-button")) {
            toggleRoleManagementButtons(button, memberID)
        }
    })

    setPermissionBasedVisibility()
}

async function toggleRoleManagementButtons(button, memberID) {
    const parentElement = button.closest(".member")
    const actionsDiv = parentElement.querySelector(".actions")

    // Get the roles of the collaborator
    const collaborator = TPEN.activeProject.collaborators[memberID]
    const collaboratorRoles = collaborator.roles

    // Check if the current user is the owner
    const currentUserID = content.getAttribute("tpen-user-id")
    const currentUserIsOwner = TPEN.activeProject.collaborators[currentUserID]?.roles.includes("OWNER")

    // Clear existing management buttons if they exist
    if (actionsDiv.querySelector(".role-management-buttons")) {
        actionsDiv.querySelector(".role-management-buttons").remove()
        return // Toggle off
    }

    // Determine which buttons to render
    const buttons = []

    if (!collaboratorRoles.includes("OWNER")) {
        // "Make Owner" button appears only for the current owner and under users who aren't owners
        if (currentUserIsOwner) {
            buttons.push(`<button class="transfer-ownership-button" data-member-id=${memberID}> Transfer Ownership</button>`)
        }
    }

    if (!collaboratorRoles.includes("LEADER")) {
        buttons.push(`<button class="make-leader-button" data-member-id=${memberID}>Promote to Leader</button>`)
    }

    if (collaboratorRoles.includes("LEADER")) {
        buttons.push(`<button class="demote-leader-button" data-member-id=${memberID}>Demote from Leader</button>`)
    }

    if (!collaboratorRoles.includes("VIEWER")) {
        buttons.push(`<button class="set-to-viewer-button" data-member-id=${memberID}>Revoke Write Access</button>`)
    }

    // "Set Role" and "Remove" buttons are always available
    buttons.push(
        `<button class="set-role-button" data-member-id=${memberID}>Set Role</button>`,
        `<button class="remove-button" data-member-id=${memberID}>Remove User</button>`
    )

    // Render management buttons
    const roleManagementButtonsHTML = `
        <div class="role-management-buttons">
            ${buttons.join("")}
        </div>
    `

    const roleManagementDiv = document.createElement("div")
    roleManagementDiv.innerHTML = roleManagementButtonsHTML

    actionsDiv.appendChild(roleManagementDiv)
}

function renderRoles(roles) {
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

function renderRolesList(rolesObject, container) {
    container.innerHTML = ""
    Object.keys(rolesObject).forEach((role) => {
        if (role.toLowerCase() != "owner") {
            const roleCheckbox = document.createElement("div")
            roleCheckbox.classList.add("role-checkbox")
            roleCheckbox.innerHTML = `
            <label>
                <input type="checkbox" value="${role}" />
                ${role}
            </label>
        `
            container.appendChild(roleCheckbox)
        }
    })
}

async function removeMember(memberID, memberName) {
    const confirmed = confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)
    if (!confirmed) {
        return
    }
    try {
        const data = await TPEN.activeProject.removeMember(memberID)
        if (!data) return
        const element = document.querySelector(`[data-member-id="${memberID}"]`)
        element.remove()
        alert('Member removed successfully')
    } catch (error) {
        errorHTML.innerHTML = error.toString()
    }
}

function setPermissionBasedVisibility() {
    const ownerLeaderActions = document.querySelectorAll('.owner-leader-action')

    ownerLeaderActions.forEach(element => {
        if (isOwnerOrLeader) {
            element.classList.remove('is-hidden')
        } else {
            element.classList.add('is-hidden')
        }
    })
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

    // Render roles dynamically
    renderRolesList(TPEN.activeProject.roles, rolesListContainer)

    const handleConfirm = () => {
        // Collect selected roles
        const selectedRoles = Array.from(
            rolesListContainer.querySelectorAll("input[type=checkbox]:checked")
        ).map((checkbox) => checkbox.value)

        confirmCallback(selectedRoles)
        closeRoleModal()
    }

    confirmButton.onclick = handleConfirm
    cancelButton.onclick = closeRoleModal

    modal.classList.remove("hidden")
}

function closeRoleModal() {
    const modal = document.getElementById("roleModal")
    modal.classList.add("hidden")
}

async function handleSetRoleButton(memberID) {
    openRoleModal(
        "Manage Roles",
        `Add or remove roles for ${TPEN.activeProject.collaborators[memberID]?.profile?.displayName ?? " contributor " + memberID}`,
        async (selectedRoles) => {
            if (selectedRoles.length > 0) {
                const response = await TPEN.activeProject.cherryPickRoles(memberID, selectedRoles)
                if (response) {
                    alert("Roles updated successfully.")
                }
            }
        }
    )
}

async function handleSetToViewerButton(memberID) {
    const confirm = window.confirm(
        `Are you sure you want to remove all write access for ${memberID}? The user will become a VIEWER.`
    )
    if (confirm) {
        const response = await TPEN.activeProject.setToViewer(memberID)
        if (response) {
            alert("User role updated to VIEWER.")
        }
    }
}

async function handleMakeLeaderButton(memberID) {
    const confirm = window.confirm(`Are you sure you want to promote collaborator ${memberID} to LEADER?`)
    if (confirm) {
        const response = await TPEN.activeProject.makeLeader(memberID)
        if (response) {
            alert("User promoted to LEADER.")
        }
    }
}

async function handleDemoteLeaderButton(memberID) {
    const confirm = window.confirm(`Are you sure you want to demote collaborator ${memberID} from LEADER?`)
    if (confirm) {
        const response = await TPEN.activeProject.demoteLeader(memberID)
        if (response) {
            alert("User demoted from LEADER.")
        }
    }
}

async function handleTransferOwnershipButton(memberID) {
    const confirm = window.confirm(`You are about to transfer ownership of this project to ${TPEN.activeProject.collaborators[memberID]?.profile?.displayName ?? " contributor " + memberID}. This action is irreversible. Please confirm if you want to proceed.`)
    if (confirm) {
        const response = await TPEN.activeProject.transferOwnership(memberID)
        if (response) {
            alert("Ownership transferred successfully.")
            location.reload()
        }
    }
}
