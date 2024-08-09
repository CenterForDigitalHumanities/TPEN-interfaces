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

export { encodeContentState, decodeContentState }
