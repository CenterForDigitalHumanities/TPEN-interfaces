import TPEN from "../api/TPEN.mjs"

let groupTitle = document.querySelector(".project-title")
let groupMembersElement = document.querySelector(".group-members")
let errorHTML = document.getElementById("errorHTML")
let isOwnerOrLeader = false

export function renderProjectCollaborators() {
    
    if (!TPEN.activeProject) {
        return errorHTML.innerHTML = "No project"
    }

    const userId = content.getAttribute('tpen-user-id')
    groupMembersElement.innerHTML = ""
    groupTitle.innerHTML = TPEN.activeProject.getLabel()

    const collaborators = TPEN.activeProject.collaborators
    isOwnerOrLeader = ["OWNER", "LEADER"].some(role => collaborators[userId]?.roles.includes(role))


    for (const collaboratorId in collaborators) {
        const memberData = collaborators[collaboratorId]
        const memberHTML = createMemberHTML(collaboratorId, memberData)
        groupMembersElement.appendChild(memberHTML)
    }

    manageRoleButtons(isOwnerOrLeader)
  
}

function createMemberHTML(collaboratorId, memberData) {
    const memberElement = document.createElement("div")
    memberElement.innerHTML = `
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
    return memberElement
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

function manageRoleButtons(isOwnerOrLeader) {
    groupMembersElement.addEventListener("click", (e) => {
        const button = e.target
        if (button.classList.contains("manage-roles-button")) {
            toggleRoleManagementButtons(button)
        }
    })

    setPermissionBasedVisibility(isOwnerOrLeader)
}

function toggleRoleManagementButtons(button) {
    const memberID = button.dataset.memberId
    const actionsDiv = button.closest(".member").querySelector(".actions")

    if (actionsDiv.querySelector(".role-management-buttons")) {
        actionsDiv.querySelector(".role-management-buttons").remove()
        return
    }

    const collaborator = TPEN.activeProject.collaborators[memberID]
    const buttons = generateRoleManagementButtons(collaborator, button.dataset)

    const roleManagementButtonsHTML = `
        <div class="role-management-buttons">
            ${buttons.join("")}
        </div>
    `

    const roleManagementDiv = document.createElement("div")
    roleManagementDiv.innerHTML = roleManagementButtonsHTML
    actionsDiv.appendChild(roleManagementDiv)
}

function generateRoleManagementButtons(collaborator, button) {
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

function setPermissionBasedVisibility(isOwnerOrLeader) {
    const ownerLeaderActions = document.querySelectorAll('.owner-leader-action')
    
    ownerLeaderActions.forEach(element => {
        if (isOwnerOrLeader) {
            element.classList.remove('is-hidden')
        } else {
            element.classList.add('is-hidden')
        }
    })
}