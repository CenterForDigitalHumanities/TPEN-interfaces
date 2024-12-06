import Project from "../api/Project.mjs"
// @deprecated - use TPEN.#activeProject instead


export default async function getActiveProject() {
    const URLParams = new URLSearchParams(window.location.search)
    let projectID = URLParams.get("projectID")
    let projectObj = new Project(projectID) 
    const projectData = await projectObj.loadData() 
    return { projectObj, projectData }
}
