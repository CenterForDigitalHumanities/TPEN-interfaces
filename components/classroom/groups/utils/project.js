// function extracts projectID from URL of the page
export function getProjectIDFromURL() {
    const params = new URLSearchParams(window.location.search); //searches the query parameters (everything after ?)
    let projectIdQuery = params.get('projectId');
    console.log('Query Parameter Project ID:', projectIdQuery); 

    if (!projectIdQuery) {
        const hash = window.location.hash; //searches the fragment identifier (everything after #)
        let projectIdHash = hash.substring(1); 
        console.log('Hash Project ID:', projectIdHash);
        return projectIdHash;
    }
    else {
        return projectIdQuery;
    }
}