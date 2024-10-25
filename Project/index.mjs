import TPEN from "../TPEN/index.mjs"
import { userMessage } from "../components/iiif-tools/index.mjs"

export default class Project {

    TPEN = new TPEN()


    constructor(_id) {
        this._id = _id
    }

    async fetch() {
        const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
        try {
            return await fetch(`${this.TPEN.servicesURL}/project/${this._id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            })
            .then(response => response.ok ? response : Promise.reject(response))
            .then(response => response.json())
            .then(data => this.data = data)
            .catch(error => { throw error })
        } catch (error) {
            return userMessage(`${error.status}: ${error.statusText}`)
        }
    }

    /**
     * Add a member to the project by email.
     * @param {String} email The email of the member to add.
     */
    async addMember(email) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/invite-member`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                method: "POST",
                body: JSON.stringify({ email }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `Failed to invite collaborator: ${response.statusText}`)
            }

            return await response.json()
        } catch (error) {
            userMessage(error.message)
        }
    }

    /**
     * Remove a member from the project by userId.
     * @param {String} userId The ID of the member to remove.
     */
    async removeMember(userId) {
        try {
            const token =  TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/remove-member`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            })

            if (!response.ok) {
                throw new Error(`Error removing member: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            userMessage(error.message)
        }
    }
}
