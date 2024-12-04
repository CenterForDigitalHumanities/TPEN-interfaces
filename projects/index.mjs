import  User  from "../api/User.mjs"
import checkUserAuthentication from "../utilities/checkUserAuthentication.mjs"
import getHash from "../utilities/getHash.mjs"

document.addEventListener("DOMContentLoaded", async () => {
    const TPEN_USER =  await checkUserAuthentication()
    let token = TPEN_USER?.authentication
    let userID = getHash(TPEN_USER.agent)
    const userObj = new User(userID)
    userObj.authentication = token
    userObj.renderProjects("projects-container")
})
