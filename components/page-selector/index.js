import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * PageSelector - Dropdown for selecting pages within a project.
 * Provides navigation between manuscript pages.
 * Requires PAGE ANY view access.
 * @element tpen-page-selector
 */
export default class PageSelector extends HTMLElement {
    /** @type {Array} Flattened list of all pages */
    #pages = []
    /** @type {string|null} Currently selected page ID */
    #currentPageId = null

    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: "open" })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * Removes component if user lacks PAGE ANY view access or there's only one page.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess("PAGE", "ANY")) {
            this.remove()
            return
        }
        this.#buildPagesList()
        if (this.#pages.length <= 1) {
            // No need to render if there's only one page
            return this.remove()
        }
        this.render()
        this.addEventListeners()
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.renderCleanup.run()
        this.cleanup.run()
    }

    /**
     * Build a flattened list of all pages across all layers.
     */
    #buildPagesList() {
        this.#pages = []
        const layers = TPEN.activeProject?.layers || []
        const seenIds = new Set()

        layers.forEach(layer => {
            (layer.pages || []).forEach(page => {
                const id = page.id.split('/').pop()
                if (!seenIds.has(id)) {
                    seenIds.add(id)
                    this.#pages.push({
                        id: id,
                        fullId: page.id,
                        label: this.#getLabel(page)
                    })
                }
            })
        })

        // Set current page from URL
        this.#currentPageId = TPEN.screen.pageInQuery
    }

    /**
     * Extract a display label from a page object.
     * @param {Object} page - Page object with label property
     * @returns {string} Display label
     */
    #getLabel(page) {
        if (typeof page.label === "string") {
            return page.label
        }

        if (typeof page.label === "object") {
            return Object.entries(page.label)
                .map(([lang, values]) => `${lang !== "none" ? lang + ":" : ""} ${Array.isArray(values) ? values.join(", ") : values}`)
                .join(" | ")
        }

        return `Page ${page.id?.split('/').pop() || 'Unknown'}`
    }

    render() {
        const optionsHtml = this.#pages
            .map(page => {
                const selected = page.id === this.#currentPageId ? 'selected' : ''
                return `<option value="${page.id}" ${selected}>${this.#escapeHtml(page.label)}</option>`
            })
            .join("")

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    width: fit-content;
                }
                select {
                    font-size: inherit;
                    font-family: inherit;
                    cursor: pointer;
                }
                select option {
                    background-color: white;
                    color: #333;
                }
                select option:checked {
                    background-color: #005a8c;
                    color: white;
                }
            </style>
            <select part="select" aria-label="Select page">
                ${optionsHtml}
            </select>
        `
    }

    /**
     * Sets up event listeners for the page selector.
     */
    addEventListeners() {
        // Clear previous render-specific listeners
        this.renderCleanup.run()

        const selectEl = this.shadowRoot.querySelector("select")
        const changeHandler = (e) => this.#handlePageChange(e)
        this.renderCleanup.onElement(selectEl, 'change', changeHandler)
    }

    /**
     * Handle page selection change.
     * @param {Event} event - Change event from select element
     */
    #handlePageChange(event) {
        const selectedPageId = event.target.value
        const selectedPage = this.#pages.find(p => p.id === selectedPageId)

        // Dispatch event for interested components
        TPEN.eventDispatcher.dispatch('tpen-page-selected', {
            pageId: selectedPageId,
            pageIndex: this.#pages.indexOf(selectedPage),
            page: selectedPage
        })

        // Navigate via URL change
        const url = new URL(location.href)
        url.searchParams.set('pageID', selectedPageId)
        location.href = url.toString()
    }

    /**
     * Escape HTML special characters to prevent XSS.
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    #escapeHtml(str) {
        if (typeof str !== 'string') return ''
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }
}

customElements.define("tpen-page-selector", PageSelector)
