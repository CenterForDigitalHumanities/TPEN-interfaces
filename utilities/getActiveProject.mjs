import Project from "../api/project.mjs"

export default async function getActiveProject() {
    const URLParams = new URLSearchParams(window.location.search)
    let projectID = URLParams.get("projectID")
    let projectObj = new Project(projectID) 
    const projectData = await projectObj.loadData() 

    return { projectObj, projectData }
}