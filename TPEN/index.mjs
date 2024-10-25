/**
 * The TPEN class is the main class for accessing the TPEN services API. It is used to initialize the TPEN module and to make calls to the API.
 * @module TPEN
 * @class
 * @example https://centerfordigitalhumanities.github.io/TPEN-interfaces/classes/TPEN
 * @param {String} tinyThingsURL - The URL of the TinyThings API. Defaults to "https://dev.tiny.t-pen.org"
 * @imports {User, Project, Transcription}
 */

import { decodeUserToken, getUserFromToken, checkExpired } from '../components/iiif-tools/index.mjs'
import { User } from '/User/index.mjs'
// import { Project } from './Project/index.mjs'

export default class TPEN {
    #actionQueue = []
    #currentUser = {}
    #activeProject = {}
    #activeCollection

    constructor(tinyThingsURL = "https://dev.tiny.t-pen.org") {
        this.tinyThingsURL = tinyThingsURL
        this.servicesURL = "https://dev.api.t-pen.org"
        this.currentUser = TPEN.getAuthorization() ? new User(getUserFromToken(TPEN.getAuthorization())) : {}
        this.activeProject = { _id: new URLSearchParams(window.location.search).get('projectID') }
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
        if (!(user instanceof User)) {
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
        return localStorage.getItem("userToken") ?? false
    }

    static logout(redirect = origin + pathname) {
        this.currentUser = null
        localStorage.clear()
        location.href = `https://three.t-pen.org/logout?returnTo=${encodeURIComponent(redirect)}`
        return
    }

    static login(redirect = location.href) {
        location.href = `https://three.t-pen.org/login?returnTo=${encodeURIComponent(redirect)}`
        return
    }

    static attachAuthentication(element) {
        if (Array.isArray(element)) {
            element.forEach(elem => this.attachAuthentication(elem))
            return
        }
        const token = new URLSearchParams(location.search).get("idToken") ?? this.getAuthorization()
        history.replaceState(null, "", location.pathname + location.search.replace(/[\?&]idToken=[^&]+/, ''))
        if (!token || checkExpired(token)) {
            this.login()
            return
        }
        localStorage.setItem("userToken", token)
        element.setAttribute("require-auth", true)
        element.addEventListener("tpen-authenticated", updateUser)
        element.addEventListener("token-expiration", () => this.classList.add("expired"))
        element.dispatchEvent(new CustomEvent("tpen-authenticated", { detail: { authorization: token } }))
    }
}

function updateUser(event) {
    this.userToken = event.detail.authorization
    const userId = getUserFromToken(this.userToken)
    this.setAttribute("tpen-user-id", userId)
    const expires = decodeUserToken(this.userToken)?.exp
    this.setAttribute("tpen-token-expires", expires)
    this.expiring = setTimeout(() => {
        this.dispatchEvent(new CustomEvent("token-expiration"))
    }, expires * 1000 - Date.now())
    this.querySelectorAll("[tpen-creator]").forEach(elem => elem.setAttribute("tpen-creator", `https://store.rerum.io/v1/id/${userId}`))
}
