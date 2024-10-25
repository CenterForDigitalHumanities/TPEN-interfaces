import { TPEN } from '../TPEN/index.mjs'

/** Description: to use this class, initialize new class, set authentication token, then call required methods
 * 
 */
export class User {
  TPEN = new TPEN()

  #isTheAuthenticatedUser() {
    return this._id === TPEN.getAuthorization()
  } 
  constructor(_id) {
    this._id = _id
    // if (this.#authentication || this._id) this.getProfile()
  }

  async getProfile() {
    if (!this._id)
      throw Error("User ID is required")

    const serviceAPI = `${this.TPEN.servicesURL}/${
      this.#isTheAuthenticatedUser() ? "my/profile" : `user/:${this._id}`
    }`
    const headers = this.#isTheAuthenticatedUser()
      ? new Headers({ Authorization: `Bearer ${TPEN.getAuthorization()}` })
      : new Headers()
    fetch(serviceAPI, { headers })
      .then((response) => {
        if (!response.ok) Promise.reject(response)
        return response
      })
      .then((response) => response.json())
      .then((data) => {
        // the public user object has no display_name tag, it has a nme instead, hence the check below
        this.display_name ??= TPEN.getAuthorization() ? data.display_name : data.name
        if(data.profile) this.profile = data.profile
        else Object.assign(this, data)
        return this
      })
  }

  async getProjects() {
    const headers = new Headers({
      Authorization: `Bearer ${TPEN.getAuthorization()}`
    })

    return fetch(`${this.TPEN.servicesURL}/my/projects`, { headers })
      .then((response) => {
        if (!response.ok) {
          return Promise.reject(response)
        }
        return response.json()
      })
      .catch((error) => {
        // Alert user with error message
        throw error
      })
  }

  renderProjects(containerId) {
    let projectsList = document.getElementById(containerId)

    if (!containerId || !projectsList) {
      if (!containerId) {
        alert("Provide id for container to render projects")
      } else {
        alert(`Container element with ID '${containerId}' not found.`)
      }

      throw new Error(
        "Provide container id and attach id to HTML element where projects should be rendered"
      )
    }

    this.getProjects()
      .then((projects) => {
        projectsList.innerHTML = ""

        if (projects.length) {
          projects.forEach((project) => {
            const projectTemplate = `
            <li>
              ${project.name}
              <div class="manage">
                <span class="resume-btn">Resume</span>
                <span class="manage-btn" data-project-id="${project._id}">Manage</span>
              </div>
            </li>
          `

            projectsList.insertAdjacentHTML("beforeend", projectTemplate)
          })

          const manageButtons = document.querySelectorAll(".manage-btn")
          manageButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
              const projectId = event.target.getAttribute("data-project-id")
              window.location.href = `/manage?projectID=${projectId}`
            })
          })

        } else {
          projectsList.innerHTML = "No projects yet. Create one to get started"
        }
      })
      .catch((error) => {
        const errorTemplate = `
          <li>
            Error ${error.status ?? 500}: ${error.statusText ?? "Unknown Server error"}
          </li>
        `
        projectsList.insertAdjacentHTML("beforeend", errorTemplate)
        throw error
      })
  }

  async updateRecord(data) {
    try {
      const response = await fetch(`${this.TPEN.servicesURL}/my/profile/update`, {
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
      // we can create a new route in Services and move these manipuations there.
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
}
