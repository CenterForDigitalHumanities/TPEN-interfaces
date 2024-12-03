/**
 * The TPEN class is the main class for accessing the TPEN services API. It is used to initialize the TPEN module and to make calls to the API.
 * @deprecated: use and update the file in /api instead
 * @module TPEN
 * @class
 * @example https://centerfordigitalhumanities.github.io/TPEN-interfaces/classes/TPEN
 * @param {String} tinyThingsURL - The URL of the TinyThings API. Defaults to "https://dev.tiny.t-pen.org"
 * @imports { EventDispatcher }
 */
console.warn('Deprecated: use and update the file in /api instead')

import TPEN from '../api/TPEN.mjs'
export default TPEN
import { decodeUserToken, getUserFromToken, checkExpired } from '../components/iiif-tools/index.mjs'
import { eventDispatcher } from './events.mjs'

export default class TPEN {
    #actionQueue = []
    #currentUser = {}
    #activeProject = {}
    #activeCollection

    constructor(tinyThingsURL = "https://dev.tiny.t-pen.org") {
        this.tinyThingsURL = tinyThingsURL
        this.servicesURL = "https://dev.api.t-pen.org"
        this.currentUser
        this.activeProject = { _id: new URLSearchParams(window.location.search).get('projectID') }

        eventDispatcher.on("tpen-user-loaded", ev=> this.currentUser = ev.detail)
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

    get activeProject() {
        return this.#activeProject
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

    async getUserProjects() {
        return this.#currentUser.getUserProjects()
    }

    async getAllPublicProjects() {
        // Logic to fetch all public projects
        return fetch(`${this.servicesURL}/projects/public`)
            .then(response => response.json())
    }

    static getAuthorization() {
        const storedToken = localStorage.getItem("userToken")
        try {
            if (!checkExpired(storedToken)) {
                return storedToken
            }
        } catch (error) {}
        localStorage.removeItem("userToken")
        return false
    }

    static logout(redirect = origin + location.pathname) {
        this.currentUser = null
        localStorage.clear()
        location.href = `https://three.t-pen.org/logout?returnTo=${encodeURIComponent(redirect)}`
        return
    }

    static login(redirect = location.href) {
        location.href = `https://three.t-pen.org/login?returnTo=${encodeURIComponent(redirect)}`
        return
    }

    static attachAuthentication = (element) => {
        if (Array.isArray(element)) {
            element.forEach(elem => this.attachAuthentication(elem))
            return
        }
        const token = new URLSearchParams(location.search).get("idToken") ?? this.getAuthorization()
        history.replaceState(null, "", location.pathname + location.search.replace(/[\?&]idToken=[^&]+/, ''))
        if (!token) {
            this.login()
            return
        }
        localStorage.setItem("userToken", token)
        element.setAttribute("require-auth", true)
        updateUser(element, token)
        eventDispatcher.on("token-expiration", () => element.classList.add("expired"))
        eventDispatcher.dispatch("tpen-authenticated", { detail: token })
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

// Notify page of module loading if not being imported
if(window?.location){
    console.log("TPEN module loaded")
    window.TPEN = TPEN
    window.TPEN.eventDispatcher = eventDispatcher
    document?.dispatchEvent(new CustomEvent("tpen-loaded"))
}
