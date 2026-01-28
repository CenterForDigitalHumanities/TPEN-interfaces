import TPEN from '../../api/TPEN.js'
import { escapeHtml } from '/js/utils.js'
import CheckPermissions from '../check-permissions/checkPermissions.js'
import { onProjectReady } from "../../utilities/projectReady.js"

/**
 * NavigationManager - Interface for customizing project navigation URLs.
 * Requires PROJECT OPTIONS edit access.
 * @element tpen-navigation-manager
 */
class NavigationManager extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this._navigation = {
            transcribe: '',
            defineLines: '',
            manageProject: ''
        }
        this._savedNavigation = {}
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Removes component if user lacks PROJECT OPTIONS edit access.
     */
    authgate() {
        if (!CheckPermissions.checkEditAccess("PROJECT", "OPTIONS")) {
            this.remove()
            return
        }
        this.loadNavigation()
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    loadNavigation() {
        const project = TPEN.activeProject
        const nav = project?.interfaces?.navigation || {}
        this._navigation = {
            transcribe: nav.transcribe || '',
            defineLines: nav.defineLines || '',
            manageProject: nav.manageProject || ''
        }
        this._savedNavigation = { ...this._navigation }
    }

    hasUnsavedChanges() {
        return Object.keys(this._navigation).some(
            key => this._navigation[key] !== this._savedNavigation[key]
        )
    }

    async saveNavigation() {
        const project = TPEN.activeProject
        if (!project) return

        // Only save non-empty URLs
        const urlsToSave = {}
        Object.entries(this._navigation).forEach(([key, value]) => {
            if (value && value.trim()) {
                urlsToSave[key] = value.trim()
            }
        })

        try {
            await project.storeInterfacesCustomization({ navigation: urlsToSave })
            this._savedNavigation = { ...this._navigation }
            TPEN.eventDispatcher.dispatch('tpen-toast', { 
                status: 'info', 
                message: 'Navigation URLs saved successfully' 
            })
            this.render()
            this.addEventListeners()
        } catch (error) {
            TPEN.eventDispatcher.dispatch('tpen-toast', { 
                status: 'error', 
                message: 'Failed to save navigation URLs' 
            })
            console.error('Error saving navigation URLs:', error)
        }
    }

    resetToDefaults() {
        if (confirm('Reset all navigation URLs to defaults?')) {
            this._navigation = {
                transcribe: '',
                defineLines: '',
                manageProject: ''
            }
            this.render()
            this.addEventListeners()
        }
    }

    render() {
        const project = TPEN.activeProject
        if (!project) {
            this.shadowRoot.innerHTML = '<div style="padding: 20px;">Loading project...</div>'
            return
        }

        const defaults = {
            transcribe: '/transcribe',
            defineLines: '/annotator',
            manageProject: '/project/manage/'
        }

        this.shadowRoot.innerHTML = `
            <style>
            :host {
                display: block;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }

            h1 {
                color: var(--interface-primary);
                margin-bottom: 10px;
            }

            .subtitle {
                color: var(--text-secondary);
                margin-bottom: 30px;
            }

            .section {
                background: var(--white);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .section h2 {
                margin-top: 0;
                color: var(--text-primary);
                font-size: 1.3em;
            }

            .url-group {
                margin-bottom: 20px;
            }

            .url-group label {
                display: block;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--text-primary);
            }

            .url-group .description {
                font-size: 0.9em;
                color: var(--text-secondary);
                margin-bottom: 8px;
            }

            .url-group .default-info {
                font-size: 0.85em;
                color: var(--text-muted);
                margin-bottom: 8px;
                font-style: italic;
            }

            .url-input {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid var(--interface-secondary);
                border-radius: 6px;
                font-size: 1em;
                box-sizing: border-box;
            }

            .url-input:focus {
                outline: none;
                border-color: var(--interface-primary);
            }

            .url-input::placeholder {
                color: var(--text-muted);
            }

            .button-group {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .btn {
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
            }

            .btn-primary {
                background: var(--interface-primary);
                color: var(--white);
            }

            .btn-primary:hover {
                background: var(--interface-primary-hover);
            }

            .btn-secondary {
                background: var(--interface-secondary);
                color: var(--text-primary);
            }

            .btn-secondary:hover {
                background: var(--interface-secondary-hover);
            }

            .info-box {
                background: var(--interface-secondary);
                border-left: 4px solid var(--interface-primary);
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
            }

            .info-box h3 {
                margin-top: 0;
                color: var(--interface-primary);
                font-size: 1.1em;
            }

            .info-box p {
                margin: 8px 0;
                color: var(--text-primary);
                line-height: 1.5;
            }

            .info-box code {
                background: rgba(0, 0, 0, 0.05);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
            }

            .info-box ul {
                margin: 8px 0;
                padding-left: 24px;
            }

            .info-box li {
                margin: 4px 0;
                color: var(--text-primary);
            }
            </style>

            <blockquote>
            Holding space for the real form in a different PR
            </blockquote>

            <h1>Navigation URLs</h1>
            <p class="subtitle">Customize navigation links for <em>${escapeHtml(project.getLabel())}</em></p>

            <div class="section">
                <div class="info-box">
                    <h3>ℹ️ About Custom Navigation URLs</h3>
                    <p>You can customize where navigation links point to. This allows you to:</p>
                    <ul>
                        <li>Use alternative transcription interfaces</li>
                        <li>Point to external annotation tools</li>
                        <li>Integrate with custom project management systems</li>
                    </ul>
                    <p>Leave a field empty to use the default TPEN URL. The <code>projectID</code> query parameter will always be added automatically.</p>
                </div>

                <div class="url-group">
                    <label for="transcribe-url">Transcribe URL</label>
                    <div class="description">Where users go to transcribe manuscript lines</div>
                    <div class="default-info">Default: ${escapeHtml(defaults.transcribe)}</div>
                    <input 
                        type="text" 
                        id="transcribe-url" 
                        class="url-input" 
                        placeholder="${escapeHtml(defaults.transcribe)}"
                        value="${escapeHtml(this._navigation.transcribe)}"
                    />
                </div>

                <div class="url-group">
                    <label for="define-lines-url">Define Lines URL</label>
                    <div class="description">Where users go to annotate/define lines on manuscript pages</div>
                    <div class="default-info">Default: ${escapeHtml(defaults.defineLines)}</div>
                    <input 
                        type="text" 
                        id="define-lines-url" 
                        class="url-input" 
                        placeholder="${escapeHtml(defaults.defineLines)}"
                        value="${escapeHtml(this._navigation.defineLines)}"
                    />
                </div>

                <div class="url-group">
                    <label for="manage-project-url">Manage Project URL</label>
                    <div class="description">Where users go to manage project settings and collaborators</div>
                    <div class="default-info">Default: ${escapeHtml(defaults.manageProject)}</div>
                    <input 
                        type="text" 
                        id="manage-project-url" 
                        class="url-input" 
                        placeholder="${escapeHtml(defaults.manageProject)}"
                        value="${escapeHtml(this._navigation.manageProject)}"
                    />
                </div>

                <div class="button-group">
                    ${this.hasUnsavedChanges() ? '<button class="btn btn-primary" id="save-btn">Save Changes</button>' : ''}
                    <button class="btn btn-secondary" id="reset-btn">Reset to Defaults</button>
                </div>
            </div>
        `
    }

    addEventListeners() {
        // Input change handlers
        const transcribeInput = this.shadowRoot.querySelector('#transcribe-url')
        const defineLinesInput = this.shadowRoot.querySelector('#define-lines-url')
        const manageProjectInput = this.shadowRoot.querySelector('#manage-project-url')

        const updateNav = () => {
            this._navigation.transcribe = transcribeInput.value
            this._navigation.defineLines = defineLinesInput.value
            this._navigation.manageProject = manageProjectInput.value
            this.render()
            this.addEventListeners()
        }

        transcribeInput?.addEventListener('input', updateNav)
        defineLinesInput?.addEventListener('input', updateNav)
        manageProjectInput?.addEventListener('input', updateNav)

        // Button handlers
        this.shadowRoot.querySelector('#save-btn')?.addEventListener('click', () => {
            this.saveNavigation()
        })

        this.shadowRoot.querySelector('#reset-btn')?.addEventListener('click', () => {
            this.resetToDefaults()
        })
    }
}

customElements.define('tpen-navigation-manager', NavigationManager)
