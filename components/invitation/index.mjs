import TPEN from "../../api/TPEN.mjs"
import { renderProjectCollaborators } from "../project-collaborators/index.mjs"

let submitButton = document.getElementById("submit")
let userEmail = document.getElementById("invitee-email")
let errorHTML = document.getElementById("errorHTML")

export async function Invitation (event) {
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
}