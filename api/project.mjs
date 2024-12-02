// I'm copying this to Project/index.mjs and updating it there.

import checkUserAuthentication from "../utilities/checkUserAuthentication.mjs"
import TPEN from "../TPEN/index.mjs"
const baseURL = TPEN.servicesURL
export default class Project {
    constructor(projectID) {
        this._id = projectID
    }

    /**
     * Retrieves the authentication token asynchronously.
     */
    async getToken() {
        if (!this.token) {
            const TPEN_USER = await checkUserAuthentication()
            this.token = TPEN_USER.authorization
        }
        return this.token
    }

    /**
     * Load project information from TPEN Services about the project 
     * for rendering user interface.
     */
    async loadData() {
        try {
            const token = await this.getToken()
            const response = await fetch(`${baseURL}/project/${this._id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                return Promise.reject(response)
            }

            this.data = await response.json()
            return this.data
        } catch (err) {
            console.error('Error loading project data:', err)
            throw err
        }
    }

    /**
     * Add a member to the project by email.
     * @param {String} email The email of the member to add.
     */
    async addMember(email) {
        try {
            const token = await this.getToken()
            const response = await fetch(`${baseURL}/project/${this._id}/invite-member`, {
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
            console.error('Error inviting member:', error)
            throw error
        }
    }

    /**
     * Remove a member from the project by userId.
     * @param {String} userId The ID of the member to remove.
     */
    async removeMember(userId) {
        try {
            const token = await this.getToken()
            const response = await fetch(`${baseURL}/project/${this._id}/remove-member`, {
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

            return await response.text()
        } catch (error) {
            console.error('Error removing member:', error)
            throw error
        }
    }
}
