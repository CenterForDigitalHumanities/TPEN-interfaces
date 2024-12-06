import  User  from "../api/User.mjs"
import TPEN from "../api/TPEN.mjs"

document.addEventListener("DOMContentLoaded", async () => {
    const projectsList = document.getElementById("projects-container")
    TPEN.attachAuthentication(projectsList)
    const userId = projectsList.getAttribute("tpen-user-id")
    const user = new User(userId)
    user.renderProjects("projects-container")
})
