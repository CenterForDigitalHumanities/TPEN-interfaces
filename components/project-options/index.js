import TPEN from '/api/TPEN.js'
import '/components/gui/card/Card.js'
import '/components/project-details/index.js'
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
            <h3>Project Tools</h3>
            <project-tools></project-tools>
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
                                    lines-count="${page.lines?.length ?? ''}">
                                </line-annotation-link>
                            </li>
                        `).join('') ?? '<li>No pages</li>'}
                    </ul>
                </details>
            `).join('') ?? '<div>No layers defined.</div>'}
        `

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

class ProjectConfig extends HTMLElement {
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
        this.shadowRoot.innerHTML = `<div>Configuration for project <b>${TPEN.activeProject._id}</b> will appear here.</div>`
    }
}

customElements.define('tpen-project-config', ProjectConfig)
