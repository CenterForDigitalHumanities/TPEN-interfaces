// https://iiif.io/api/content-state/1.0/#61-choice-of-encoding-mechanism
import { CONFIG } from '../../api/config.js'

function encodeContentState(plainContentState) {
    const uriEncoded = encodeURIComponent(plainContentState)
    const base64 = btoa(uriEncoded)
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_')
    const base64urlNoPadding = base64url.replace(/=/g, '')
    return base64urlNoPadding
}

function decodeContentState(encodedContentState) {
    const base64url = restorePadding(encodedContentState)
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const base64Decoded = atob(base64)
    const uriDecoded = decodeURIComponent(base64Decoded)
    return uriDecoded
}

function decodeUserToken(token) {
    return token ? JSON.parse(atob(restorePadding(token.split('.')[1]))) : {}
}

function getUserFromToken(token) {
    // Reuse the single-source helper to avoid duplicating claim detection logic
    const iri = getAgentIRIFromToken(token)
    return iri?.split('/')?.pop()
}

function restorePadding(s) {
    // The length of the restored string must be a multiple of 4
    let pad = s.length % 4
    if (pad) {
        if (pad === 1) {
            throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding')
        }
        s += '===='.slice(0, 4 - pad)
    }
    s = s.replace(/-/g, '+').replace(/_/g, '/')
    return s
}

function checkExpired(token) {
    return Date.now() >= decodeUserToken(token).exp * 1000
}

async function fetchProject(projectID, AUTH_TOKEN) {
    try {
        const servicesURL = CONFIG.servicesURL
        return fetch(`${servicesURL}/project/${projectID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        })
            .then(response => (response.ok ? response : Promise.reject(response)))
            .then(response => response.json())
            .catch(error => {
                throw error
            })
    } catch (error) {
        return userMessage(`${error.status}: ${error.statusText}`)
    }
}

/**
 * Pop up a modal message to the interface for the user to interact with or dismiss.
 * @param {String} message
 */
function userMessage(message) {
    if (!message) return
    const modal = document.createElement('tpen-modal')
    modal.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 20px; border: 1px solid black;`
    let text
    if (typeof message === 'string') text = message
    else {
        const status = message.status ? message.status + ':' : ''
        const statusText = message.statusText ?? 'Internal Error'
        text = `${status} ${statusText}`
    }
    modal.innerText = text
    document.body.appendChild(modal)
}

export { encodeContentState, decodeContentState, decodeUserToken, checkExpired, getUserFromToken, fetchProject, userMessage }

// Additional helper to get the full Agent IRI from a token (dev/prod aware)
export function getAgentIRIFromToken(token) {
    const decoded = decodeUserToken(token)
    if (!decoded || typeof decoded !== 'object') return undefined
    const agentClaimKey = Object.keys(decoded).find(k => k.endsWith('/agent')) || 'http://store.rerum.io/agent'
    return decoded[agentClaimKey]
}
