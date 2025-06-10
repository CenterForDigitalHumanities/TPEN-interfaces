/** 
 * To use this class, initialize new class, set authentication token, then call required methods
 */

import TPEN from "./TPEN.js"
import { getUserFromToken } from "../components/iiif-tools/index.js"

const eventDispatcher = TPEN.eventDispatcher

export default class User {
  #isTheAuthenticatedUser() {
    return this._id === getUserFromToken(TPEN.getAuthorization())
  }
  constructor(_id) {
    this._id = _id
  }

  async getProfile() {
    if (!this._id)
      throw Error("User ID is required")

    const serviceAPI = `${TPEN.servicesURL}/${this.#isTheAuthenticatedUser() ? "my/profile" : `user/:${this._id}`
      }`
    const headers = this.#isTheAuthenticatedUser()
      ? new Headers({ Authorization: `Bearer ${TPEN.getAuthorization()}` })
      : new Headers()
    await fetch(serviceAPI, { headers })
      .then((response) => {
        if (!response.ok) Promise.reject(response)
        return response.json()
      })
      .then((data) => {
        Object.assign(this, data)
        this.displayName = data.profile?.displayName ?? data.name ?? "Anonymous"
        if (data._sub) {
          eventDispatcher.dispatch("tpen-user-loaded", this)
        }
      })
    return this
  }

  async getProjects() {
    const headers = new Headers({
      Authorization: `Bearer ${TPEN.getAuthorization()}`
    })

    // Response shape: { metrics, projects }
    return await fetch(`${TPEN.servicesURL}/my/projects`, { headers })
      .then((response) => {
        if (!response.ok) {
          return Promise.reject(response)
        }
        return response.json()
      })
      .then((data) => {
        return data
      })
      .catch((error) => {
        // Alert user with error message
        throw error
      })
  }

  async updateRecord(data) {
    try {
      const response = await fetch(`${TPEN.servicesURL}/my/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TPEN.getAuthorization()}`
        },
        body: JSON.stringify(data)
      })
      const updatedUser = await response.json()
      return updatedUser
    } catch (error) {
      console.error("Error updating user record:", error)
      throw error
    }
  }

  async addToPublicProfile(data) {
    try {
      const userRecord = await this.getProfile()
      const publicInfo = { ...userRecord?.profile, ...data }
      const payload = { ...userRecord, profile: publicInfo }
      const response = await this.updateRecord(payload)
      return response
      // We can either manipulate the data this way and use the the same route to handle all updates or,
      // we can create a new route in Services and move these manipulations there.
      // A third option would be to add a tag in the payload or via query strings
    } catch (error) {
      console.error("Error updating user record:", error)
      throw error
    }
  }

  async updatePrivateInformation(data) {
    const response = await this.updateRecord(data)
    return response
  }

  static fromToken(token) {
    return new User(getUserFromToken(token))
  }
}
