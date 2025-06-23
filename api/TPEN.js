/**
 * The TPEN class is the main class for accessing the TPEN services API.
 * It is used to initialize the TPEN module and to make calls to the API.
 * @module TPEN
 * @class
 * @example https://centerfordigitalhumanities.github.io/TPEN-interfaces/classes/TPEN
 * @param {String} tinyThingsURL - The URL of the TinyThings API. Defaults to "https://dev.tiny.t-pen.org"
 * @imports { EventDispatcher }
 */

import { decodeUserToken, getUserFromToken, checkExpired } from '../components/iiif-tools/index.js'
import { eventDispatcher } from './events.js'

import "../components/gui/toast/ToastContainer.js"

class Tpen {
    #actionQueue = []
    #currentUser
    #activeLine
    #activeProject
    #activePage
    #activeCollection
    #userMetrics
    #userProjects

    eventDispatcher = eventDispatcher

    screen = {
        projectInQuery: new URLSearchParams(window.location.search).get('projectID'),
        collectionInQuery: new URLSearchParams(window.location.search).get('collectionID'),
        pageInQuery: new URLSearchParams(window.location.search).get('pageID'),
        lineInQuery: new URLSearchParams(window.location.search).get('lineID'),
        userInQuery: new URLSearchParams(window.location.search).get('userID'),
        action: { label: "Action", link: "#" },
        title: document.title
    }

    constructor(tinyThingsURL = "https://dev.tiny.t-pen.org") {
        this.tinyThingsURL = tinyThingsURL
        this.servicesURL = "https://dev.api.t-pen.org"
        this.TPEN28URL = "https://t-pen.org"
        this.TPEN3URL = "https://three.t-pen.org"
        this.RERUMURL = "https://devstore.rerum.io/v1"
        this.BASEURL = "https://app.t-pen.org"
        this.currentUser
        this.activeProject

        eventDispatcher.on("tpen-user-loaded", ev => this.currentUser = ev.detail)
        eventDispatcher.on("tpen-project-loaded", ev => this.activeProject = ev.detail)

        if (this.screen.projectInQuery) {
            try {
                import('./Project.js').then(module => {
                    new module.default(this.screen.projectInQuery).fetch()
                })
            } catch (error) {
                console.error(error)
            }
        }
    }

    async reset(force = false) {
        return new Promise((resolve, reject) => {
            // Logic to reset the TPEN object
            if (force) {
                resolve(this.#actionQueue)
            } else {
                reject(this.#actionQueue)
            }
        })
    }

    get currentUser() {
        return this.#currentUser
    }

    set currentUser(user) {
        // confirm user is a User object
        if (!user.displayName || !user._id) {
            throw new Error("Invalid user object")
        }
        this.#currentUser = (this.#currentUser?._id === user._id)
            ? Object.assign(this.#currentUser, user)
            : user
        return this
    }

    set activeLine(line) {
        this.#activeLine = line
    }

    get activeLine() {
        return this.#activeLine
    }

    get activeProject() {
        return this.#activeProject
    }

    get userMetrics() {
        return this.#userMetrics
    }

    get userProjects() {
        return this.#userProjects
    }

    set activeProject(project) {
        this.#activeProject = project
    }

    get activeCollection() {
        return this.#activeCollection
    }

    set activeCollection(collection) {
        this.#activeCollection = collection
    }

    async getUserProjects(idToken) {
        let self = this
        const userId = getUserFromToken(idToken)
        return import('./User.js').then(async module => {
            const u = new module.default(userId)
            const { projects, metrics } = await u.getProjects()
            self.#userMetrics = metrics
            self.#userProjects = projects
            eventDispatcher.dispatch("tpen-user-projects-loaded")
            return projects
        })
    }

    async getFirstPageOfProject(projectID) {
        return import('./Project.js').then(async module => {
            let project = new module.default(projectID)
            project = await project.fetch()
            return project?.layers[0]?.pages[0]
        })
    }

    getLastModifiedPageId() {
        if(!this.activeProject || !this.activeProject.layers) return null
        return this.activeProject._lastModified
    }

    async getAllPublicProjects() {
        // Logic to fetch all public projects
        return fetch(`${this.servicesURL}/projects/public`)
            .then(response => response.json())
    }

    getAuthorization() {
        const storedToken = localStorage.getItem("userToken")
        try {
            if (!checkExpired(storedToken)) {
                return storedToken
            }
        } catch (error) { }
        localStorage.removeItem("userToken")
        return false
    }

    logout(redirect = origin + location.pathname) {
        localStorage.clear()
        location.href = `${this.TPEN3URL}/logout?returnTo=${encodeURIComponent(redirect)}`
        return
    }

    login(redirect = location.href) {
        location.href = `${this.TPEN3URL}/login?returnTo=${encodeURIComponent(redirect)}`
        return
    }

    /**
     * Upgrades a temporary collaborator to a full user connected to the provided agent.
     *
     * @param projectID - The project which contains the temporary TPEN3 User as a member.
     * @param inviteCode - The temporary TPEN3 User _id wanting a new Agent that matches their _id.
     * @param agentID - The existing Agent _id to use for 'upgrading' the TPEN3 User, instead of the inviteCode.
     */
    async tempUserUpgrade(projectID, inviteCode, agentID) {
        if (!(inviteCode && agentID && projectID)) return
        if (inviteCode === agentID) return 
        let result = await fetch(`${this.servicesURL}/project/${projectID}/collaborator/${inviteCode}/agent/${agentID}`)
        .then(response => response.text())     
        .catch(err => { 
            throw err 
        })
        return result    
    }

    attachAuthentication = (element) => {
        if (Array.isArray(element)) {
            element.forEach(elem => this.attachAuthentication(elem))
            return
        }
        const token = new URLSearchParams(location.search).get("idToken") ?? this.getAuthorization()
        const inviteCode = new URLSearchParams(window.location.search).get('inviteCode')
        let modifiedParams = location.search.replace(/[\?&]idToken=[^&]+/, '').replace(/[\?&]inviteCode=[^&]+/, '')
        if (modifiedParams.charAt(0) === "&") {
            modifiedParams = modifiedParams.replace("&", "?")
        }
        if (modifiedParams && modifiedParams.charAt(0) !== "?") {
            modifiedParams = "?" + modifiedParams
        }
        history.replaceState(null, "", location.pathname + modifiedParams)
        if (!token) {
            this.login()
            return
        }
        const agentID = decodeUserToken(token)["http://store.rerum.io/agent"].split("/").pop()
        if (inviteCode && agentID && inviteCode !== agentID) {
            const projectID = this.screen.projectInQuery ?? this.activeProject._id
            if (!projectID) throw new Error("We need a project id so we can align the user with their project.")
            this.tempUserUpgrade(projectID, inviteCode, agentID)
        }
        localStorage.setItem("userToken", token)
        element.setAttribute("require-auth", true)
        updateUser(element, token)
        eventDispatcher.on("token-expiration", () => element.classList.add("expired"))
        eventDispatcher.dispatch("tpen-authenticated", token)
    }
}

function updateUser(element, token) {
    element.userToken = token
    const userId = getUserFromToken(element.userToken)
    element.setAttribute("tpen-user-id", userId)
    const expires = decodeUserToken(element.userToken)?.exp
    element.setAttribute("tpen-token-expires", expires)
    element.expiring = setTimeout(() => {
        eventDispatcher.dispatchEvent("token-expiration")
    }, expires * 1000 - Date.now())
    element.querySelectorAll("[tpen-creator]").forEach(elem => elem.setAttribute("tpen-creator", `https://store.rerum.io/v1/id/${userId}`))
}

// Export a shared instance of EventDispatcher
const TPEN = new Tpen()
export default TPEN

// Notify page of module loading if not being imported
// if (window?.location) {
//     console.log("TPEN module loaded")
//     window.TPEN = TPEN
//     window.TPEN.eventDispatcher = eventDispatcher
//     document?.dispatchEvent(new CustomEvent("tpen-loaded"))
// }
