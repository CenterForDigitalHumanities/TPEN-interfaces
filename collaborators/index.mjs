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
await (thisTPEN.activeProject=new Project(thisTPEN.activeProject?._id)).fetch()

renderProjectContributors()
   
inviteForm.addEventListener("submit", async (event) => {
    event.preventDefault()

    try {
        submitButton.textContent = "Inviting..."
        submitButton.disabled = true

        await thisTPEN.activeProject.addMember(userEmail.value)

        submitButton.textContent = "Submit"
        submitButton.disabled = false
        renderProjectContributors()
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

async function renderProjectContributors() {
    if(!thisTPEN.activeProject) {
        return errorHTML.innerHTML = "No project"
    }
  
    const userId = TPEN_USER?._id
    groupMembersElement.innerHTML = ""

       const contributors = thisTPEN.activeProject.contributors
        groupTitle.innerHTML = thisTPEN.activeProject.getLabel()
        
        // datafix to remove
        if (contributors[userId]?.roles.roles) contributors[userId].roles = contributors[userId]?.roles.roles
        if (contributors[userId]?.roles.includes("OWNER") || contributors[userId]?.roles.includes("LEADER")) {
            isOwnerOrLeader = true
        };
        for (const contributorId in contributors) {
            // datafix to remove
            if (contributors[contributorId]?.roles.roles) contributors[contributorId].roles = contributors[contributorId]?.roles.roles
            
            const memberData = contributors[contributorId]

            const memberHTML = `
                <li class="member" data-member-id=${contributorId}> 
                  <span class="role">${renderRoles(memberData.roles)}</span>
                  ${memberData.profile.displayName }
 
                 <button class="remove-button allow-invite is-hidden" id="remove-btn" data-member-id=${contributorId} data-member-name=${memberData.profile.displayName } >Remove</button>
 
                </li>
              `

            const memberElement = document.createElement("div")
            memberElement.innerHTML = memberHTML

            groupMembersElement.appendChild(memberElement)

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
                const data = await thisTPEN.activeProject.removeMember(memberID)
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
