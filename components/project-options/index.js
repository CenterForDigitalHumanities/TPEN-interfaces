import TPEN from '/api/TPEN.js'
import '/components/gui/card/Card.js'
import '/components/project-details/index.js'
import '/components/project-tools/index.js'
import { stringFromDate, escapeHtml } from '/js/utils.js'
import { renderPermissionError } from '../../utilities/renderPermissionError.js'
import CheckPermissions from '../check-permissions/checkPermissions.js'
import { onProjectReady } from '../../utilities/projectReady.js'
import vault from '../../js/vault.js'

/**
 * ProjectOptions - Displays project details, tools, and navigation options.
 * Requires PROJECT view access.
 * @element tpen-project-options
 */
class ProjectOptions extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null
    /** @type {Function|null} Unsubscribe function for user projects listener */
    _unsubUserProjects = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `Loading...`
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        if (!TPEN.screen.projectInQuery) {
            TPEN.getUserProjects(TPEN.getAuthorization())
            this._userProjectsHandler = () => {
                import('../../api/Project.js').then(({ default: Project }) => {
                    Project.getById(TPEN.userProjects?.[0]?._id)
                })
            }
            TPEN.eventDispatcher.on('tpen-user-projects-loaded', this._userProjectsHandler)
        }
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Renders permission error if user lacks PROJECT view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess("PROJECT", "*")) {
            renderPermissionError(this.shadowRoot, TPEN.screen?.projectInQuery ?? '')
            return
        }
        this.render()
        this.updateActionLink()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        if (this._userProjectsHandler) {
            TPEN.eventDispatcher.off('tpen-user-projects-loaded', this._userProjectsHandler)
        }
    }

    getNavigationUrl(type, project) {
        const projectId = project._id
        const interfaces = project.interfaces || {}
        
        // Default base URLs (without query strings)
        const defaults = {
            transcribe: `/transcribe`,
            defineLines: `/annotator`,
            manageProject: `/project/manage/`
        }
        
        // Get custom URL from interfaces or use default
        const baseUrl = interfaces.navigation?.[type] || defaults[type]
        
        // Always append projectID query string
        const separator = baseUrl.includes('?') ? '&' : '?'
        return `${baseUrl}${separator}projectID=${projectId}`
    }

    render() {
        const project = TPEN.activeProject
        if (!project) {
            this.shadowRoot.innerHTML = `<div>No project loaded.</div>`
            return
        }
        this.shadowRoot.innerHTML = `
            <style>
            .inline img {
                height: 35px;
                width: 35px;
                margin-left: 1em;
            }
            .inline span {
                position: relative;
                display: inline-block;
            }
            </style>
            <p>
            ${project.description ?? 'No description provided.'}
            <a href="/project/metadata?projectID=${project._id}">✏️</a>
            </p>
            <ul style="padding-left:1em;">
            <li><b>Label:</b> ${project.getLabel()}</li>
            <li><b>Created:</b> ${stringFromDate(project._createdAt)}</li>
            <li><b>Last Modified:</b> ${stringFromDate(project._modifiedAt)}</li>
            <li><b>Owner:</b> ${project.getOwner()?.displayName ?? ''}</li>
            </ul>
            <h3>Project Tools <a href="${this.getNavigationUrl('manageProject', project)}">✏️</a></h3>
            <tpen-project-tools readonly="true"></tpen-project-tools>
            <h3>Define Lines</h3>
            ${project.layers?.map(layer => `
            <details>
                <summary>
                ${layer.label ?? 'Untitled Layer'} (${layer.pages?.length ?? 0} pages)
                </summary>
                <ul>
                ${layer.pages?.map(page => `
                    <li>
                    <line-annotation-link 
                        page-id="${page.id}" 
                        page-label="${page.label ?? 'Untitled Page'}"
                        lines-count="${page.items?.length ?? ''}">
                    </line-annotation-link>
                    </li>
                `).join('') ?? '<li>No pages</li>'}
                </ul>
            </details>
            `).join('') ?? '<div>No layers defined.</div>'}
        `
    }

    updateActionLink() {
        const project = TPEN.activeProject
        if (!project) return

        const hasLines = project.layers?.some(layer => 
            layer.pages?.some(page => page.items && page.items.length > 0)
        ) ?? false

        TPEN.eventDispatcher.dispatch('tpen-gui-action-link', {
            label: hasLines ? 'Transcribe' : 'Find Lines',
            callback: () => {
                const url = hasLines 
                    ? this.getNavigationUrl('transcribe', project)
                    : this.getNavigationUrl('defineLines', project)
                window.location.href = url
            }
        })
    }
}

customElements.define('tpen-project-options', ProjectOptions)

class LineAnnotationLink extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this._linesCount = this.getAttribute('lines-count')
        this._pageId = this.getAttribute('page-id')
        this._pageLabel = this.getAttribute('page-label')
    }

    connectedCallback() {
        this.render()
        this.shadowRoot.querySelector('a').addEventListener('mouseenter', () => this.fetchCount())
    }

    async fetchCount() {
        if (this._linesCount) return
        const page = { id: this._pageId, type: 'page' }
        this._linesCount = await vault.get(page).then(p => p.items?.length)
        this.render()
    }

    render() {
        this.shadowRoot.innerHTML = `
            <a href="${this.getDefineLineUrl()}">
                ${this._pageLabel}
                ${this._linesCount !== '' ? ` (${this._linesCount} lines)` : ''}
            </a>
        `
    }

    getDefineLineUrl() {
        const project = TPEN.activeProject
        const pageId = this._pageId.split("/").pop()
        
        // Get base URL from interfaces or use default
        const baseUrl = project?.interfaces?.navigation?.defineLines || `/annotator`
        
        // Always append query strings
        const separator = baseUrl.includes('?') ? '&' : '?'
        return `${baseUrl}${separator}projectID=${project._id}&pageID=${pageId}`
    }
}
customElements.define('line-annotation-link', LineAnnotationLink)

/**
 * ProjectCustomization - Displays and manages project interface customizations.
 * Requires PROJECT view access.
 * @element tpen-project-customization
 */
class ProjectCustomization extends HTMLElement {
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `Loading...`
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Renders permission error if user lacks PROJECT view access.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess("PROJECT", "*")) {
            renderPermissionError(this.shadowRoot, TPEN.screen?.projectInQuery ?? '')
            return
        }
        this.render()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
    }

    render() {
        const project = TPEN.activeProject
        if (!project) {
            this.shadowRoot.innerHTML = `<div>No project loaded.</div>`
            return
        }

        const interfaces = project.interfaces || {}
        
        // Always include navigation in the list (even if not configured yet)
        const interfacesToShow = { ...interfaces }
        if (!interfacesToShow.navigation) {
            interfacesToShow.navigation = {}
        }
        
        const hasInterfaces = Object.keys(interfacesToShow).length > 0

        this.shadowRoot.innerHTML = `
            <style>
                .interface-item {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                .interface-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .edit-link {
                    margin-left: 10px;
                    text-decoration: none;
                    font-size: 1.2em;
                }
                .no-interfaces {
                    color: #666;
                    font-style: italic;
                }
                .interface-info .more {
                    color: #666;
                    margin-left: 6px;
                }
                .interface-info .list-item {
                    margin: 2px 0;
                }
                .interface-info .short-list {
                    word-break: break-word;
                }
            </style>
            ${hasInterfaces ? Object.entries(interfacesToShow).map(([name, config]) => {
                const editUrl = this.getEditUrl(name, project._id)
                return `
                    <div class="interface-item">
                        <div class="interface-name">
                            ${this.formatInterfaceName(name)}
                            ${editUrl ? `<a href="${editUrl}" class="edit-link" title="Edit ${name} settings">✏️</a>` : ''}
                        </div>
                        <div class="interface-info">
                            ${this.getInterfaceInfo(name, config)}
                        </div>
                    </div>
                `
            }).join('') : '<div class="no-interfaces">No interface customizations configured.</div>'}
        `
    }

    formatInterfaceName(name) {
        // Convert camelCase or kebab-case to Title Case
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .trim()
    }

    getEditUrl(interfaceName, projectId) {
        // Map interface names to their edit pages
        const editPages = {
            'quicktype': `/manage/quicktype?projectID=${projectId}`,
            'navigation': `/interfaces/navigation?projectID=${projectId}`
        }
        return editPages[interfaceName] || null
    }

    getInterfaceInfo(name, config) {
        // If this interface is a list of text values, preview the values intelligently
        if (Array.isArray(config)) {
            const values = config
                .map(v => typeof v === 'string' ? v.trim() : '')
                .filter(v => v.length > 0)

            if (values.length === 0) return 'Configured'

            // Determine if this is a list of short items (e.g., single characters for quicktype)
            const isShortItems = values.every(v => v.length <= 8)

            if (isShortItems) {
                const maxItems = 10
                const shown = values.slice(0, maxItems).map(v => escapeHtml(v))
                const remaining = values.length - shown.length
                return `
                    <span class="short-list">${shown.join(' · ')}${remaining > 0 ? ` <span class="more">+${remaining} more</span>` : ''}</span>
                `
            }

            // Longer strings: show up to ~4 lines
            const maxLines = 4
            const shownLines = values.slice(0, maxLines).map(v => `
                <div class="list-item">${escapeHtml(v)}</div>
            `).join('')
            const remaining = values.length - Math.min(values.length, maxLines)
            return `
                <div class="long-list">
                    ${shownLines}
                    ${remaining > 0 ? `<div class="more">+${remaining} more</div>` : ''}
                </div>
            `
        }

        // Handle navigation URLs object
        if (name === 'navigation' && typeof config === 'object') {
            const defaults = {
                transcribe: '/transcribe',
                defineLines: '/annotator',
                manageProject: '/project/manage/'
            }
            
            const urls = [
                `Transcribe: ${escapeHtml(config.transcribe || defaults.transcribe)}`,
                `Define Lines: ${escapeHtml(config.defineLines || defaults.defineLines)}`,
                `Manage: ${escapeHtml(config.manageProject || defaults.manageProject)}`
            ]
            
            return `
                <div class="long-list">
                    ${urls.map(url => `<div class="list-item">${url}</div>`).join('')}
                </div>
            `
        }

        // Specific info based on known interface types can go here as a fallback summary
        if (name === 'quicktype') {
            const shortcuts = Array.isArray(config) ? config : []
            return `${shortcuts.length} shortcut${shortcuts.length !== 1 ? 's' : ''} defined`
        }

        // Generic fallback for other interfaces
        return 'Configured'
    }
}

customElements.define('tpen-project-customization', ProjectCustomization)
