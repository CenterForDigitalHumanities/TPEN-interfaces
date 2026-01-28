import TPEN from '../../api/TPEN.js'
import CheckPermissions from "../../components/check-permissions/checkPermissions.js"
import { renderPermissionError } from "../../utilities/renderPermissionError.js"
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * TpenCustomProperty - Interface for editing custom project properties as JSON.
 * Requires PROJECT OPTIONS edit access.
 * @element tpen-custom-property
 */
class TpenCustomProperty extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering the interface.
     * Renders permission error if user lacks PROJECT OPTIONS edit access.
     */
    authgate() {
        if (!CheckPermissions.checkEditAccess("PROJECT", "OPTIONS")) {
            renderPermissionError(this.shadowRoot, TPEN.screen?.projectInQuery ?? '')
            return
        }
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    render() {
        const projectId = TPEN.screen?.projectInQuery ?? TPEN.activeProject?._id ?? ''
        this.shadowRoot.innerHTML = `
            <style>
                :host { display:block; font-family: Arial, Helvetica, sans-serif }
                label { display:block; margin-bottom:6px; font-weight:600 }
                textarea { width:100%; min-height:140px; box-sizing:border-box; font-family: monospace; padding:8px }
                .actions { margin-top:8px; display:flex; gap:8px; align-items:center }
                button { padding:6px 10px; cursor:pointer }
            </style>
            <label>Custom project property (JSON)</label>
            <textarea id="payload" placeholder='{"example":"value"}'></textarea>
            <div class="actions">
                <button id="save">Save to project</button>
            </div>
        `
    }

    /**
     * Sets up event listeners for the save button.
     */
    addEventListeners() {
        const projectId = TPEN.screen?.projectInQuery ?? TPEN.activeProject?._id ?? ''
        this.shadowRoot.getElementById('save').addEventListener('click', () => this.save(projectId))
    }

    async save(projectId) {
        if (!projectId) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'No project selected', status: 'error' })
            return
        }

        const raw = this.shadowRoot.getElementById('payload')?.value?.trim() ?? ''
        if (!raw) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Payload is empty', status: 'error' })
            return
        }

        let payload
        try {
            payload = JSON.parse(raw)
        } catch (err) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Invalid JSON payload', status: 'error' })
            return
        }

        const token = TPEN.getAuthorization() ?? await TPEN.login()
        if (!token) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Authentication required', status: 'error' })
            return
        }

        try {
            const resp = await fetch(`${TPEN.servicesURL}/project/${projectId}/custom`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            })

            if (!resp.ok) {
                const errText = await resp.text().catch(() => resp.statusText)
                throw new Error(errText ?? `Request failed: ${resp.status}`)
            }

            const body = await resp.json().catch(() => null)
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: 'Custom property saved', status: 'success' })
            TPEN.eventDispatcher.dispatch('tpen-project-metadata-updated', { id: projectId, data: body })
        } catch (error) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { message: error?.message ?? 'Failed to save custom property', status: 'error', dismissible: true })
        }
    }
}

customElements.define('tpen-custom-property', TpenCustomProperty)
