import { User } from "../User/index.mjs"
import checkUserAuthentication from "../utilities/checkUserAuthentication.mjs"
import getHash from "../utilities/getHash.mjs"


document.addEventListener("DOMContentLoaded", async () => {
    const TPEN_USER = await checkUserAuthentication()
    let token = TPEN_USER?.authorization
    let userID = getHash(TPEN_USER.agent)
    const userObj = new User(userID)
    userObj.authentication = token

    userObj.renderProjects("projects-container")
})