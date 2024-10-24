//https://iiif.io/api/content-state/1.0/#61-choice-of-encoding-mechanism
function encodeContentState(plainContentState) {
    let uriEncoded = encodeURIComponent(plainContentState);  // using built in function
    let base64 = btoa(uriEncoded);                           // using built in function
    let base64url = base64.replace(/\+/g, "-").replace(/\//g, "_");
    let base64urlNoPadding = base64url.replace(/=/g, "");
    return base64urlNoPadding;
}

function decodeContentState(encodedContentState) {
    let base64url = restorePadding(encodedContentState);
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    let base64Decoded = atob(base64);                        // using built in function
    let uriDecoded = decodeURIComponent(base64Decoded);      // using built in function
    return uriDecoded;
}

function restorePadding(s) {
    // The length of the restored string must be a multiple of 4
    let pad = s.length % 4;
    let padding = "";
    if (pad) {
        if (pad === 1) {
            throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
        }
        s += '===='.slice(0, 4 - pad);
    }
    return s + padding;
}

function fetchProject(projectID) {
    const AUTH_TOKEN = window?.TPEN_USER?.authorization
    return fetch(`https://dev.api.t-pen.org/project/${projectID}`,{
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    })
        .then(response => response.ok ? response : Promise.reject(response))
        .then(response => response.json())
        .catch(error => userMessage(`${error.status}: ${error.statusText}`))
}

/**
 * Pop up a modal message to the interface for the user to interact with or dismiss.
 * @param {String} message 
 */
function userMessage(message) {
    const modal = document.createElement('tpen-modal')
    modal.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 20px; border: 1px solid black;`
    modal.innerText = message
    document.body.appendChild(modal)
}

export { encodeContentState, decodeContentState, fetchProject, userMessage }
