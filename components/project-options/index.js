import TPEN from '/api/TPEN.js'
import '/components/gui/card/Card.js'
import '/components/project-details/index.js'
import '/components/project-tools/index.js'
import { stringFromDate } from '/js/utils.js'
import vault from '../../js/vault.js'

class ProjectOptions extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
          Loading...
    `
        TPEN.eventDispatcher.on('tpen-project-loaded', (ev) => {
            this.render()
            this.updateActionLink()
        })
    }

    connectedCallback() {
        if (!TPEN.screen.projectInQuery) {
            TPEN.getUserProjects(TPEN.getAuthorization())
            TPEN.eventDispatcher.on('tpen-user-projects-loaded', (ev) => {
                import('../../api/Project.js').then(({ default: Project }) => {
                    Project.getById(TPEN.userProjects?.[0]?._id)
                })
            })
        }
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
            <a href="/components/update-metadata/index.html?projectID=${project._id}">✏️</a>
            </p>
            <ul style="padding-left:1em;">
            <li><b>Label:</b> ${project.getLabel()}</li>
            <li><b>Created:</b> ${stringFromDate(project._createdAt)}</li>
            <li><b>Last Modified:</b> ${stringFromDate(project._modifiedAt)}</li>
            <li><b>Owner:</b> ${project.getOwner()?.displayName ?? ''}</li>
            </ul>
            <h3>Project Tools <a href="/project/manage/?projectID=${project._id}">✏️</a></h3>
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
                    ? `/transcribe?projectID=${project._id}`
                    : `/annotator?projectID=${project._id}`
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
            <a href="/annotator?projectID=${TPEN.activeProject._id}&pageID=${this._pageId.split("/").pop()}">
                ${this._pageLabel}
                ${this._linesCount !== '' ? ` (${this._linesCount} lines)` : ''}
            </a>
        `
    }
}
customElements.define('line-annotation-link', LineAnnotationLink)

class ProjectCustomization extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
          Loading...
    `
        TPEN.eventDispatcher.on('tpen-project-loaded', (ev) => {
            this.render()
        })
    }

    connectedCallback() { }

    render() {
        const project = TPEN.activeProject
        if (!project) {
            this.shadowRoot.innerHTML = `<div>No project loaded.</div>`
            return
        }

        const interfaces = project.interfaces || {}
        const hasInterfaces = Object.keys(interfaces).length > 0

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
            </style>
            ${hasInterfaces ? Object.entries(interfaces).map(([name, config]) => {
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
            'quicktype': `/interfaces/quicktype?projectID=${projectId}`
        }
        return editPages[interfaceName] || null
    }

    getInterfaceInfo(name, config) {
        // Provide specific info based on interface type
        if (name === 'quicktype') {
            const shortcuts = Array.isArray(config) ? config : []
            return `${shortcuts.length} shortcut${shortcuts.length !== 1 ? 's' : ''} defined`
        }
        // Generic fallback for other interfaces
        return Array.isArray(config) ? `${config.length} items` : 'Configured'
    }
}

customElements.define('tpen-project-customization', ProjectCustomization)
