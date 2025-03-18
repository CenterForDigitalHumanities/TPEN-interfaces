/**
 * Project API Link for user interfaces to import. The result will look like this:
 * { 
 *  _id: "someHash",
 *  label: "Some Project",
 *  metadata: [ {} ],
 *  layers: [ {} ],
 *  creator: "userHash",
 *  collaborators: { userHash: { roles: [ "roles" ], profile: { displayName: "name", ...} }},
 *  license: "licenseString",
 *  tools: [ {} ],
 *  options: { "option": "value" },
 *  roles: { "roleName": [ "permissions" ] },
 * }
 * 
 * @author cubap@slu.edu
 * @type module
 * @version 0.0.1
 */
import TPEN from './TPEN.js'
import { eventDispatcher } from './events.js'
import { userMessage } from "../components/iiif-tools/index.js"

export default class Project {

    #authentication
    #isLoaded

    constructor(_id) {
        if (typeof _id !== "string") {
            throw new Error("Project ID must be a string")
        }
        this._id = _id
    }

    async fetch() {
        const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
        try {
            return await fetch(`${TPEN.servicesURL}/project/${this._id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            })
                .then(response => response.ok ? response : Promise.reject(response))
                .then(response => response.json())
                .then(data => {
                    Object.assign(this, data)
                    this.#isLoaded = true
                    eventDispatcher.dispatch("tpen-project-loaded", this)
                    return this
                })
                .catch(error => {
                    eventDispatcher.dispatch("tpen-project-load-failed", error)
                    return Promise.reject(error)
                })
        } catch (error) {
            return userMessage(`${error.status}: ${error.statusText}`)
        }
    }

    async save() {
        const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
        if (!AUTH_TOKEN) {
            throw new Error("Authentication is required to save a project")
        }
        return fetch(`${TPEN.servicesURL}/project/${this._id}`, {
            method: "PUT",
            headers: new Headers({
                Authorization: `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(this)
        })
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => {
                eventDispatcher.dispatch("tpen-project-saved", this)
            })
            .catch(error => {
                eventDispatcher.dispatch("tpen-project-save-failed", error)
            })
    }

    async addMember(email) {
        try {
            const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/invite-member`, {
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

    async removeMember(userId) {
        try {
            const token = TPEN.getAuthorization() ?? TPEN.login()
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/remove-member`, {
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
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/addRoles`, {
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
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/removeRoles`, {
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
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/setRoles`, {
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
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userId}/setRoles`, {
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
            const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/switch/owner`, {
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
            return response
        } catch (error) {
            console.error("Error updating roles:", error)
            alert("Failed to update roles. Please try again.")
        }
    }

    setMetadata(metadata) {
        this.metadata = metadata
        return this.save()
    }
    async updateMetadata(metadata) {
        const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
        const response = await fetch(`${TPEN.servicesURL}/project/${this._id}/metadata`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(metadata),
        })

        if (!response.ok) throw new Error("Failed to update metadata")
        this.setMetadata(metadata)
    }

    addLayer(layer) {
        this.layers.push(layer)
        return this.save()
    }

    removeLayer(layerID) {
        this.layers = this.layers.filter(layer => layer._id !== layerID)
        return this.save()
    }

    addTool(tool) {
        this.tools.push(tool)
        return this.save()
    }

    removeTool(toolID) {
        this.tools = this.tools.filter(tool => tool._id !== toolID)
        return this.save()
    }

    async inviteCollaborator(email, roles) {
        return fetch(`${TPEN.servicesURL}/project/${this._id}/invite-member`, {
            method: "POST",
            headers: new Headers({
                Authorization: `Bearer ${this.#authentication}`,
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ email, roles })
        }).catch(err => Promise.reject(err))
    }

    async removeCollaborator(userID) {
        // userID is the _id (Hex String) of the user to remove from the project
        if (!this.collaborators?.[userID]) {
            return Promise.reject(new Error("User not found in collaborators list"))
        }
        return fetch(`${TPEN.servicesURL}/project/${this._id}/remove-member`, {
            method: "POST",
            headers: new Headers({
                Authorization: `Bearer ${this.#authentication}`,
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({ userID })
        }).catch(err => Promise.reject(err))
    }

    async addCollaboratorRole(userID, roles) {
        // role is a string value of the role to add to the user
        if (!this.collaborators?.[userID]) {
            return Promise.reject(new Error("User not found in collaborators list"))
        }
        return fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userID}/addRoles`, {
            method: "POST",
            headers: new Headers({
                Authorization: `Bearer ${this.#authentication}`,
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(roles)
        }).catch(err => Promise.reject(err))
    }

    async removeCollaboratorRole(userID, roles) {
        // role is a string value of the role to remove from the user
        if (!this.collaborators?.[userID]) {
            return Promise.reject(new Error("User not found in collaborators list"))
        }
        return fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userID}/removeRoles`, {
            method: "POST",
            headers: new Headers({
                Authorization: `Bearer ${this.#authentication}`,
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(roles)
        }).catch(err => Promise.reject(err))
    }

    async setCollaboratorRoles(userID, roles) {
        // role is a string value of the role to set for the user
        if (!this.collaborators?.[userID]) {
            return Promise.reject(new Error("User not found in collaborators list"))
        }
        return fetch(`${TPEN.servicesURL}/project/${this._id}/collaborator/${userID}/setRoles`, {
            method: "PUT",
            headers: new Headers({
                Authorization: `Bearer ${this.#authentication}`,
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(roles)
        }).catch(err => Promise.reject(err))
    }

    getLabel() {
        return this.label ?? this.title ?? this.metadata?.find(m => m.label === "title")?.value ?? "Untitled"
    }
}
