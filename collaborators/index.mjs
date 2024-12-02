import renderRoles from "../utilities/renderRoles.mjs"
import TPEN from "../TPEN/index.mjs"
TPEN.getAuthorization() ?? TPEN.login()
import User from "../User/index.mjs"
window.TPEN_USER = User.fromToken(TPEN.getAuthorization())
import Project from "../Project/index.mjs"

let groupTitle = document.querySelector(".project-title")
let groupMembersElement = document.querySelector(".group-members")
let submitButton = document.getElementById("submit")
let userEmail = document.getElementById("invitee-email")

const inviteForm = document.getElementById("invite-form")
let errorHTML = document.getElementById("errorHTML")

let isOwnerOrLeader = false

const thisTPEN = new TPEN()
await (thisTPEN.activeProject = new Project(thisTPEN.activeProject?._id)).fetch()

renderProjectCollaborators()
inviteForm.addEventListener("submit", async (event) => {
    event.preventDefault()

    try {
        submitButton.textContent = "Inviting..."
        submitButton.disabled = true

        const response = await thisTPEN.activeProject.addMember(userEmail.value)
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

async function renderProjectCollaborators() {
    if (!thisTPEN.activeProject) {
        return errorHTML.innerHTML = "No project"
    }

    const userId = TPEN_USER?._id
    groupMembersElement.innerHTML = ""

    const collaborators = thisTPEN.activeProject.collaborators
    groupTitle.innerHTML = thisTPEN.activeProject.getLabel()

    // datafix to remove
    if (collaborators[userId]?.roles.roles) collaborators[userId].roles = collaborators[userId]?.roles.roles
    if (collaborators[userId]?.roles.includes("OWNER") || collaborators[userId]?.roles.includes("LEADER")) {
        isOwnerOrLeader = true
    }
    for (const collaboratorId in collaborators) {
        // datafix to remove
        if (collaborators[collaboratorId]?.roles.roles) collaborators[collaboratorId].roles = collaborators[collaboratorId]?.roles.roles

        const memberData = collaborators[collaboratorId]

        // const memberHTML = `
        //     <li class="member" data-member-id=${collaboratorId}> 
        //       <span class="role">${renderRoles(memberData.roles)}</span>
        //       ${memberData.profile?.displayName ?? collaboratorId}

        //      <button class="remove-button allow-invite is-hidden" id="remove-btn" data-member-id=${collaboratorId} data-member-name=${memberData.profile?.displayName ?? collaboratorId } >Remove</button>

        //     </li>
        //   `

        const memberHTML = `
    <li class="member" data-member-id=${collaboratorId}> 
        <span class="role">${renderRoles(memberData.roles)}</span>
        ${memberData.profile?.displayName ?? collaboratorId}
        
        <div class="actions">
       <button class="remove-button allow-invite " 
       id="remove-btn" data-member-id=${collaboratorId} 
       data-member-name=${memberData.profile?.displayName ?? collaboratorId} >Remove</button>

            <button class="add-role-button " data-member-id=${collaboratorId}>Add Role</button>
            <button class="set-role-button " data-member-id=${collaboratorId}>Set Role</button>
            <button class="remove-role-button " data-member-id=${collaboratorId}>Remove Role</button>
            <button class="make-owner-button " data-member-id=${collaboratorId}>Make Owner</button>
        </div>
    </li>
`


        const memberElement = document.createElement("div")
        memberElement.innerHTML = memberHTML

        groupMembersElement.appendChild(memberElement)

    }

    setPermissionBasedVisibility()

}

async function removeMember(memberID, memberName) {
    const confirmed = confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)
    if (!confirmed) {
        return
    }
    try {
        const data = await thisTPEN.activeProject.removeMember(memberID)
        if (!data) return
        const element = document.querySelector(`[data-member-id="${memberID}"]`)
        element.remove()
        alert('Member removed successfully')
    } catch (error) {
        errorHTML.innerHTML = error.toString()
    }
}

groupMembersElement.addEventListener("click", async (e) => {
    const button = e.target
    const memberID = button.dataset.memberId
    const memberName = button.dataset.memberName

    if (button.classList.contains('remove-button')) {
        removeMember(memberID, memberName)
    }
})

function setPermissionBasedVisibility() {
    const inviteElements = document.querySelectorAll('.allow-invite')

    inviteElements.forEach(element => {
        if (isOwnerOrLeader) {
            element.classList.remove('is-hidden')
        } else {
            element.classList.add('is-hidden')
        }
    })
}

groupMembersElement.addEventListener('click', async (e) => {
    const button = e.target
    const memberId = button.dataset.memberId

    if (!memberId) return

    if (button.classList.contains('add-role-button')) {

        openRoleModal(
            "Add Roles",
            `Add roles for collaborator ${memberId}`,
            async ({ defaultRoles, customRoles }) => {
                // Add default roles
                if (defaultRoles.length > 0) {
                    await handleAddDefaultRoles(memberId, defaultRoles)
                }

                // Add custom roles in one call
                if (Object.keys(customRoles).length > 0) {
                    await handleAddCustomRoles(memberId, customRoles)
                }

                await renderProjectCollaborators()
            }
        )
    } else if (button.classList.contains('remove-role-button')) {
        openRoleModal("Remove Roles", `Remove roles for collaborator ${memberId}`, async (roles) => {
            await handleRemoveRole(memberId, roles)
        })
    } else if (button.classList.contains('set-role-button')) {
        openRoleModal("Set Roles", `Set roles for collaborator ${memberId}`, async (roles) => {
            await handleSetRole(memberId, roles)
        })
    } else if (button.classList.contains('make-owner-button')) {
        const confirm = window.confirm(`Are you sure you want to make collaborator ${memberId} the owner?`)
        if (confirm) {
            await handleMakeOwner(memberId)
        }
    }
})

function openRoleModal(title, description, confirmCallback) {
    const modal = document.getElementById("roleModal")
    const modalTitle = document.getElementById("modalTitle")
    const modalDescription = document.getElementById("modalDescription")
    const defaultRolesSelect = document.getElementById("defaultRoles")
    const customRolesContainer = document.getElementById("customRolesContainer")
    const addCustomRoleButton = document.getElementById("addCustomRoleButton")
    const confirmButton = document.getElementById("modalConfirmButton")
    const cancelButton = document.getElementById("modalCancelButton")

    modalTitle.textContent = title
    modalDescription.textContent = description
    defaultRolesSelect.value = "" // Clear previous selections
    customRolesContainer.innerHTML = "" // Clear previous custom roles

    addCustomRoleButton.onclick = () => addCustomRoleField(customRolesContainer)

    const handleConfirm = () => {
        // Collect default roles
        const selectedDefaultRoles = Array.from(defaultRolesSelect.selectedOptions).map(option => option.value)

        // Collect custom roles and permissions
        const customRoles = {}
        const customRoleFields = customRolesContainer.querySelectorAll(".custom-role")
        customRoleFields.forEach((roleField) => {
            const roleName = roleField.querySelector(".role-name").value.trim()
            const permissions = roleField.querySelector(".role-permissions").value.split(",").map(p => p.trim())
            if (roleName) {
                customRoles[roleName] = permissions
            }
        })

        // Pass both defaultRoles and customRoles back
        confirmCallback({ defaultRoles: selectedDefaultRoles, customRoles })
        closeRoleModal()
    }


    confirmButton.onclick = handleConfirm
    cancelButton.onclick = closeRoleModal

    modal.classList.remove("hidden")
}

function addCustomRoleField(container) {
    const roleField = document.createElement("div")
    roleField.classList.add("custom-role")
    roleField.innerHTML = `
        <input type="text" class="role-name" placeholder="Role Name" />
        <input type="text" class="role-permissions" placeholder="Permissions (comma-separated)" />
        <button type="button" class="remove-role-button">Remove</button>
    `

    roleField.querySelector(".remove-role-button").onclick = () => {
        roleField.remove()
    }

    container.appendChild(roleField)
}


function closeRoleModal() {
    const modal = document.getElementById("roleModal")
    modal.classList.add("hidden")
}



async function handleAddDefaultRoles(memberId, roles) {
    try {
        const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborator/${memberId}/addroles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roles })
        })

        if (!response.ok) {
            throw new Error("Failed to add default roles")
        }
        return response
    } catch (error) {
        console.error("Error adding default roles:", error)
    }
}



async function handleAddCustomRoles(memberId, customRoles) {
    try {
        const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborators/${memberId}/custom-roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customRoles)
        })

        if (!response.ok) {
            throw new Error("Failed to add custom roles")
        }
    } catch (error) {
        console.error("Error adding custom roles:", error)
    }
}


















async function handleAddRole(memberId, roles) {
    const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborator/${memberId}/addRoles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles })
    })

    // if (response.ok) {
    //     alert("Roles added successfully!")
    //     await renderProjectCollaborators() 
    // } else {
    //     alert("Failed to add roles. Please try again.")
    // }
}

// async function handleAddRole(memberId) {
//     const newRoles = prompt("Enter roles to add, separated by commas (e.g., Contributor, Viewer):")
//     if (!newRoles) return

//     const rolesArray = newRoles.split(',').map(role => role.trim())

//     const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborators/${memberId}/roles`, {
//         method: 'POST', // Assuming the endpoint supports POST for adding roles
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ roles: rolesArray })
//     })

//     if (response.ok) {
//         alert("Roles added successfully!")
//         await renderProjectCollaborators() // Re-render the collaborators list
//     } else {
//         alert("Failed to add roles. Please try again.")
//     }
// }

async function handleSetRole(memberId) {
    const newRoles = prompt("Enter roles to set, replacing existing roles (e.g., Contributor, Viewer):")
    if (!newRoles) return

    const rolesArray = newRoles.split(',').map(role => role.trim())

    const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborators/${memberId}/roles`, {
        method: 'PUT', // Assuming PUT is used for replacing roles
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: rolesArray })
    })

    if (response.ok) {
        alert("Roles set successfully!")
        await renderProjectCollaborators() // Re-render the collaborators list
    } else {
        alert("Failed to set roles. Please try again.")
    }
}

async function handleRemoveRole(memberId) {
    const rolesToRemove = prompt("Enter roles to remove, separated by commas (e.g., Contributor, Viewer):")
    if (!rolesToRemove) return

    const rolesArray = rolesToRemove.split(',').map(role => role.trim())

    const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborators/${memberId}/roles`, {
        method: 'DELETE', // Assuming DELETE is used for removing roles
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: rolesArray })
    })

    if (response.ok) {
        alert("Roles removed successfully!")
        await renderProjectCollaborators() // Re-render the collaborators list
    } else {
        alert("Failed to remove roles. Please try again.")
    }
}

async function handleMakeOwner(memberId) {
    const response = await fetch(`/api/projects/${thisTPEN.activeProject._id}/collaborators/${memberId}/make-owner`, {
        method: 'POST', // Assuming POST is used for assigning ownership
    })

    if (response.ok) {
        alert("Collaborator is now the project owner!")
        await renderProjectCollaborators() // Re-render the collaborators list
    } else {
        alert("Failed to assign ownership. Please try again.")
    }
}

