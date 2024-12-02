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
                .then(data => Object.assign(this, data))
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
            const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/invite-member`, {
                headers: {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
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
            const token = TPEN.getAuthorization() ?? TPEN.login()
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

            return await response
        } catch (error) {
            userMessage(error.message)
        }
    }

    async makeLeader(userId) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/addRoles`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(["LEADER"]),
            })
            if (!response.ok) {
                throw new Error(`Error promoting user to LEADER: ${response.status}`)
            }

            return response
        } catch (error) {
            userMessage(error.message)
        }
    }

    async demoteLeader(userId) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/removeRoles`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(["LEADER"]),
            })
            if (!response.ok) {
                throw new Error(`Error removing LEADER role: ${response.status}`)
            }

            return response
        } catch (error) {
            userMessage(error.message)
        }
    }


    async setToViewer(userId) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/setRoles`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(["VIEWER"]),
            })
            if (!response.ok) {
                throw new Error(`Error revoking write access: ${response.status}`)
            }

            return response
        } catch (error) {
            userMessage(error.message)
        }
    }

    async cherryPickRoles(userId, roles) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/setRoles`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roles }),
            })
            if (!response.ok) {
                throw new Error(`Error setting user roles: ${response.status}`)
            }

            return response
        } catch (error) {
            userMessage(error.message)
        }
    }

    async transferOwnership(userId) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${this.TPEN.servicesURL}/project/${this._id}/switch/owner`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newOwnerId: userId })
            })

            if (!response.ok) {
                throw new Error("Failed to update roles")
            }
        } catch (error) {
            console.error("Error updating roles:", error)
            alert("Failed to update roles. Please try again.")
        }
    }

    getLabel() {
        return this.label ?? this.data?.label ?? this.metadata?.find(m => m.label === "title")?.value ?? "Untitled"
    }
}
