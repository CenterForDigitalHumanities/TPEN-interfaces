/**
 * User API Link for user interfaces to import.
 * 
 * @author cubap
 * @type module
 * @version 0.0.1
 */

export default class User {
    #authentication

    /**
     * Constructor for new User accepts (RERUM) Agent URI or internal _id primary key. Quirk for 
     * MongoDB may require unwinding ObjectId() to get _id.
     * @param {String|Object} uid Unique identifier for locating User record in TPEN database
     * @returns {User} new User object
     */
    constructor(uid) {
        if (typeof uid === "object" && uid.hasOwnProperty("$oid")) { // mongoDB ObjectId() quirk
            this.id = uid.$oid
            this.fetchUserData()
            return this
        }

        if (typeof uid === "string") { // Assume short hash id or agent
            try {
                // check if uid is valid URL
                new URL(uid)
                this.agent = uid
            } catch (err) {
                // Assume short hash id
                this.id = uid
            } finally {
                this.fetchUserData()
            }
            return this
        }
        throw new Error("Project ID or configuration is required")
    }

    // new private function fetchUserData()

    /**
     * Load user info from TPEN database. Authenticated Users get more.
     * @returns {Promise} resolves to User object
     * @param {JWT} token JWT token for authentication
     */
    set authentication(token) {
        this.#authentication = token
    }

    async fetchUserData() {
        if (!this.id && !this.agent) {
            throw new Error("User ID or agent is required")
        }
        const serviceAPI = this.#authentication
            ? `https://api.t-pen.org/my/account`
            : `https://api.t-pen.org/user${ this.id ? `/${this.id}` : `?agent=${this.agent}`}`
        const headers = this.#authentication ? new Headers({
                    'Authorization': `Bearer ${this.#authentication}`
                }) : new Headers()
        return fetch(serviceAPI, { headers })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`${res.status} ${res.statusText}`)
                }
                return res.json())
            .then(userData=>Object.assign(this,userData))
            .catch(err => console.error(err))
    }
}
