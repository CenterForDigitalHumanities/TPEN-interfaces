import checkUserAuthentication from "../utilities/checkUserAuthentication.mjs"


/**
 * Project API Link for user interfaces to import.
 * 
 * @author cubap
 * @type module
 * @version 0.0.1
 */
const baseURL = "http://localhost:3009"

export default class Project {
    constructor(projectID) {
        this.id = projectID
    }
 
    /**
     * Load project information from TPEN Services about the project 
     * for rendering user interface.
     * @param {String} projectID short hash id for TPEN project
     */

    async loadData() {
        const TPEN_USER = await checkUserAuthentication() 
        let token = TPEN_USER.authorization
        return await fetch(`${baseURL}/project/${this.id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(response => {
                if (!response.ok) {
                    return Promise.reject(response)
                }
                const data = response.json() 
                return this.data = data
            })
            .catch(err => { throw err })
    }

    async addMember(email) {
        let url = `${baseURL}/project/${this.id}/invite-member`

        try {
            const response = await fetch(url, {
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
            throw error
        }
    }

    async removeMember(userId) {

        const url = `${baseURL}/project/${this.id}/remove-member`

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            })

            if (!response.ok) {
                throw new Error(`Error removing member: ${response.status}`)
            }

            const data = await response.json()
            return data


        } catch (error) {
            console.error('Error removing member:', error)
            throw error
        }








        const removeButtons = document.querySelectorAll('.remove-button')

        removeButtons.forEach((button) => {


            button.addEventListener('click', async () => {
                const memberID = button.getAttribute("data-member-id")
                const memberName = button.getAttribute("data-member-name")

                const confirmed = confirm(`This action will remove ${memberName} from your project. Click 'OK' to continue?`)
                if (!confirmed) {
                    return
                }


            })
        })
    }

}

// let projectID = "6602dd2314cd575343f513ba"
// let projectObj = new Project(projectID) 
// const projectData = await projectObj.loadData()
// console.log(projectData)