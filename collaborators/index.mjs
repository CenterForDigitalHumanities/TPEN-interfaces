 import getActiveProject from "../utilities/getActiveProject.mjs"
 import renderRoles from "../utilities/renderRoles.mjs"

let groupTitle = document.querySelector(".project-title")
let groupMembersElement = document.querySelector(".group-members")
let submitButton = document.getElementById("submit")
let userEmail = document.getElementById("invitee-email")

const inviteForm = document.getElementById("invite-form")
let errorHTML = document.getElementById("errorHTML")

let isOwnerOrLeader = false
let project
 

document.addEventListener("DOMContentLoaded", async () => { 
    try {
        const { projectObj, projectData } = await getActiveProject()
         project = projectObj
        renderProjectContributors(projectData)

    } catch (error) {
        return errorHTML.innerHTML = error.status == 401 ? "Unauthorized request. Please log in to view this resource" : `Error ${error.status ?? ""}: ${error.statusText ?? error.toString()}`
    }

    removeMember()

})



inviteForm.addEventListener("submit", async (event) => {
    event.preventDefault()

    try {
        submitButton.textContent = "Inviting..."
        submitButton.disabled = true

        const data = await project.addMember(userEmail.value)

        submitButton.textContent = "Submit"
        submitButton.disabled = false
        renderProjectContributors(data)
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
        errorHTML.innerHTML = error.message
        submitButton.textContent = "Submit"
        submitButton.disabled = false
    }

})






async function renderProjectContributors(project) {
    const TPEN_USER = await checkUserAuthentication()
  
    const userId = TPEN_USER?._id
    groupMembersElement.innerHTML = ""

    if (project) {
        const contributors = project.contributors
        groupTitle.innerHTML = project.name

        for (const contributorId in contributors) {

            const memberData = contributors[contributorId]
            if (contributors[userId] && (contributors[userId].roles.includes("OWNER") || contributors[userId].roles.includes("LEADER"))) {
                isOwnerOrLeader = true
            };

            const memberHTML = `
                <li class="member" data-member-id=${contributorId}> 
                  ${memberData.displayName ? `<span class="role">${renderRoles(memberData.roles)}</span>` : `<span class="pending">Pending</span>`}
                  ${memberData.displayName || memberData.email}
 
                 <button class="remove-button allow-invite is-hidden" id="remove-btn" data-member-id=${contributorId} data-member-name=${memberData.displayName || memberData.email} >Remove</button>
 
                </li>
              `

            const memberElement = document.createElement("div")
            memberElement.innerHTML = memberHTML

            groupMembersElement.appendChild(memberElement)

        }

    }

    setPermissionBasedVisibility()

}


async function removeMember() {
    const removeButtons = document.querySelectorAll('.remove-button')

    removeButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const memberID = button.getAttribute("data-member-id")
            const memberName = button.getAttribute("data-member-name")

            const confirmed = confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)
            if (!confirmed) {
                return
            }
            try {
                const data = await project.removeMember(memberID)
                console.log('Member removed successfully:', data)
                const memberElements = document.querySelectorAll('.member')
                memberElements.forEach((element) => {
                    const elementMemberId = element.getAttribute('data-member-id')
                    if (elementMemberId === memberID) {
                        element.remove()
                        // renderProjectContributors(data) 
                        return
                    }
                })


            } catch (error) {
                errorHTML.innerHTML = error.toString()
            }
        })
    })
}

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



console.log(
    document.getElementById("project-owner")
  )