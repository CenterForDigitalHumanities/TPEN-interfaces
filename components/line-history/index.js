/**
 * TPEN Line History Component
 * A custom element that builds on concepts from the rerum-history-component
 * to show the history of lines of transcription from TPEN projects.
 * 
 * @module tpen-line-history
 * @author Research Computing Group
 * @license MIT
 */

import TPEN from '../../api/TPEN.js'
import '../line-image/index.js'
import { RerumHistoryData } from 'https://cubap.github.io/rerum-history-component/src/rerum-history-tree.js'

/**
 * Custom element for displaying TPEN line history
 * @class TPENLineHistory
 * @extends HTMLElement
 */
class TPENLineHistory extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.currentLine = null
        this.historyData = []
        this.rerumHistoryData = null
        this.historyGraph = null
    }

    connectedCallback() {
        this.render()
        this.setupEventListeners()
        this.handleLineChange(TPEN.activeLine)
}

    disconnectedCallback() {
        // Clean up RerumHistoryData instance to prevent memory leaks
        if (this.rerumHistoryData) {
            this.rerumHistoryData.abort()
            this.rerumHistoryData = null
        }
    }

    /**
     * Setup event listeners for TPEN.eventDispatcher
     */
    setupEventListeners() {
        // Listen for active line changes from TPEN.eventDispatcher
        TPEN.eventDispatcher.on('tpen-active-line-updated', (event) => {
            this.handleLineChange(event.detail)
        })
    }

    /**
     * Handle line change events
     * @param {Object} lineData - The line data from the event
     */
    async handleLineChange(lineData) {
        if (!lineData) return

        this.currentLine = lineData

        // Fetch history for this line
        await this.fetchLineHistory(lineData)
        this.render()
    }

    // tpen-transcription-line-save-success event when a line is updated

    /**
     * Fetch the history for a given line using RerumHistoryData
     * @param {Object} lineData - The line data object
     */
    async fetchLineHistory(lineData) {
        console.log('fetchLineHistory called with:', lineData)
        // If the line has a URI, fetch its history using RerumHistoryData
        const uri = lineData.id ?? lineData['@id']
        if (!uri) {
            console.log('No URI found in line data, using fallback')
            // No URI, just show current state
            this.historyData = [lineData]
            this.historyGraph = null
            return
        }
        console.log('Using URI for history fetch:', uri)
        try {
            // Clean up previous history data instance
            if (this.rerumHistoryData) {
                this.rerumHistoryData.abort()
            }
            
            this.rerumHistoryData = new RerumHistoryData(uri)
            await this.rerumHistoryData.fetch()
            
            this.historyData = this.rerumHistoryData.getItems()
            this.historyGraph = this.rerumHistoryData.getGraph()
            
            // Sort by timestamp (most recent first) if we don't have graph structure
            if (this.historyData.length > 0) {
                this.historyData.sort((a, b) => {
                    const timestampA = this.getTimestamp(a)
                    const timestampB = this.getTimestamp(b)
                    return timestampB - timestampA
                })
            }
        } catch (error) {
            console.warn('Could not fetch line history with RerumHistoryData:', error)
            // Fallback to simple array with current line
            this.historyData = [lineData]
            this.historyGraph = null
        }
    }

    /**
     * Extract timestamp from a line object using RERUM heuristics
     * @param {Object} line - The line object
     * @returns {Number} Timestamp in milliseconds
     */
    getTimestamp(line) {
        const createdAt = line?.__rerum?.createdAt ?? line?.createdAt ?? line?.modified ?? line?.created ?? line?.timestamp
        const isOverwritten = line?.__rerum?.isOverwritten ?? line?.isOverwritten

        const timestamps = [createdAt, isOverwritten].filter(Boolean).map(ts => {
            if (typeof ts === 'string') {
                const date = new Date(ts)
                return isNaN(date.getTime()) ? null : date.getTime()
            }
            if (typeof ts === 'number') return ts
            return null
        }).filter(t => t !== null)

        return timestamps.length > 0 ? Math.max(...timestamps) : 0
    }

    /**
     * Extract text from a line object
     * @param {Object} line - The line object
     * @returns {String} The text content
     */
    getLineText(line) {
        // Handle IIIF annotation body structure
        if (line.body) {
            // If body is an object with value property (IIIF TextualBody)
            if (typeof line.body === 'object' && line.body.value) {
                return line.body.value
            }
            // If body is an array, look for TextualBody with value
            if (Array.isArray(line.body)) {
                for (const bodyItem of line.body) {
                    if (bodyItem?.value) {
                        return bodyItem.value
                    }
                }
            }
            // If body is a string
            if (typeof line.body === 'string') {
                return line.body
            }
        }

        // Support various other text property names
        return line.text ?? line.content ?? line['cnt:chars'] ?? line.value ?? ''
    }

    /**
     * Extract image bounding information from a line object
     * @param {Object} line - The line object
     * @returns {Object|null} The bounding box information
     */
    getLineBounding(line) {
        // Support various bounding property structures
        const target = line.target ?? line.on
        if (target?.selector?.value) {
            // Handle IIIF selector format
            if (target.selector) {
                const selector = target.selector
                if (selector.value) {
                    // xywh format: xywh=pixel:x,y,w,h or xywh=x,y,w,h
                    const match = selector.value.match(/xywh=(?:pixel:)?(\d+),(\d+),(\d+),(\d+)/)
                    if (match) {
                        return {
                            x: parseInt(match[1]),
                            y: parseInt(match[2]),
                            width: parseInt(match[3]),
                            height: parseInt(match[4])
                        }
                    }
                }
            }
        }

        // Direct bounding box properties
        if (line.x !== undefined && line.y !== undefined &&
            (line.width !== undefined || line.w !== undefined) &&
            (line.height !== undefined || line.h !== undefined)) {
            return {
                x: line.x,
                y: line.y,
                width: line.width ?? line.w,
                height: line.height ?? line.h
            }
        }

        return null
    }

    /**
     * Extract image source from a line object
     * @param {Object} line - The line object
     * @returns {String|null} The image source URL
     */
    getLineImageSource(line) {
        const target = line.target ?? line.on
        if (target?.source) {
            // Handle IIIF target format
            return target.source
        }
        // Handle direct target URL
        if (typeof target === 'string') {
            return target
        }

        // Check for direct image properties
        return line.image ?? line.src ?? line.source ?? null
    }

    /**
     * Extract IIIF manifest and canvas information from TPEN project and current line
     * @returns {Object} Object with manifest and canvas URLs
     */
    getIIIFContext() {
        // Get manifest from TPEN.activeProject
        let manifest = null
        if (TPEN?.activeProject?.manifest) {
            const {manifest: projectManifest} = TPEN.activeProject
            // Handle both string URL and array of URLs
            if (typeof projectManifest === 'string') {
                manifest = projectManifest
            } else if (Array.isArray(projectManifest) && projectManifest[0]) {
                manifest = projectManifest[0]
            }
        } else {
            const manifestElement = this.closest('[iiif-manifest]')
            if (manifestElement) {
                manifest = manifestElement.getAttribute('iiif-manifest')
            }
        }

        // Get canvas from current line target (annotation page canvas)
        let canvas = null
        if (this.currentLine) {
            const target = this.currentLine.target ?? this.currentLine.on
            if (target?.source) {
                canvas = target.source
            }
        }

        return { manifest, canvas }
    }

    /**
     * Extract image source from a line object
     * @param {Object} line - The line object
     * @returns {String|null} The image source URL
     */


    /**
     * Format a timestamp for display
     * @param {String|Number} timestamp - The timestamp to format
     * @returns {String} Formatted date string
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown date'
        const date = new Date(timestamp)
        return date.toLocaleString()
    }

    /**
     * Format time ago string like RerumHistoryTree
     * @param {Number} timestamp - Timestamp in milliseconds
     * @returns {String} Time ago string
     */
    formatTimeAgo(timestamp) {
        if (!timestamp) return ''

        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
        return 'just now'
    }

    /**
     * Format time ago string like RerumHistoryTree
     * @param {Number} timestamp - Timestamp in milliseconds
     * @returns {String} Time ago string
     */
    formatTimeAgo(timestamp) {
        if (!timestamp) return ''

        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
        return 'just now'
    }

    /**
     * Compare two bounding boxes
     * @param {Object} box1 - First bounding box
     * @param {Object} box2 - Second bounding box
     * @returns {Boolean} True if boxes are different
     */
    boundingChanged(box1, box2) {
        if (!box1 && !box2) return false
        if (!box1 || !box2) return true
        return box1.x !== box2.x || box1.y !== box2.y ||
            box1.width !== box2.width || box1.height !== box2.height
    }

    /**
     * Render the component
     */
    render() {
        const styles = `
            :host {
                display: flex;
                flex-direction: column;
                min-height: 0;
                height: calc(100vh - 85px);
             }
 
             .history-container {
                padding: 1rem;
                box-sizing: border-box;
                flex: 1 1 auto;
                min-height: 0;
                overflow: auto;
             }
 
             .history-header {
                 margin-bottom: 1rem;
                 padding-bottom: 0.5rem;
                 border-bottom: 2px solid #333;
             }

             .history-header h2 {
                margin: 0;
                font-size: 1.25rem;
                color: #333;
            }

            .no-line {
                text-align: center;
                color: #666;
                padding: 2rem;
                font-style: italic;
            }

            .history-list {
                 list-style: none;
                 padding: 0;
                 margin: 0;
                /* ensure list doesn't force parent to grow beyond available space */
                box-sizing: border-box;
             }

             .history-item {
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 1rem;
                padding: 1rem;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .history-item:first-child {
                border-left: 4px solid #4CAF50;
            }

            .history-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
                font-size: 0.875rem;
                color: #666;
            }

            .version-label {
                font-weight: bold;
                color: #333;
            }

            .version-id {
                font-family: monospace;
                font-size: 0.75rem;
                color: #666;
                background: #f0f0f0;
                padding: 0.125rem 0.25rem;
                border-radius: 3px;
                margin-left: 0.5rem;
            }

            .timestamp {
                font-size: 0.8rem;
                cursor: help;
            }

            .history-text {
                padding: 0.75rem;
                background: #fafafa;
                border-left: 3px solid #2196F3;
                border-radius: 2px;
                font-family: monospace;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0.5rem 0;
            }

            .history-text.empty {
                color: #999;
                font-style: italic;
            }

            .bounding-info {
                margin-top: 0.5rem;
                padding: 0.5rem;
                background: #fff3cd;
                border-left: 3px solid #ffc107;
                border-radius: 2px;
                font-size: 0.875rem;
            }

            .bounding-info-title {
                font-weight: bold;
                margin-bottom: 0.25rem;
                color: #856404;
            }

            .bounding-values {
                font-family: monospace;
                color: #333;
            }

            .line-image-container {
                margin-top: 0.5rem;
                padding: 0.5rem;
                background: #f8f9fa;
                border-left: 3px solid #6c757d;
                border-radius: 2px;
            }

            .line-image-title {
                font-weight: bold;
                margin-bottom: 0.5rem;
                color: #495057;
                font-size: 0.875rem;
            }

            .line-image {
                max-width: 100%;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                display: block;
            }

            .no-image {
                color: #6c757d;
                font-style: italic;
                font-size: 0.875rem;
            }

            .changed-indicator {
                display: inline-block;
                margin-left: 0.5rem;
                padding: 0.125rem 0.375rem;
                background: #ff9800;
                color: white;
                border-radius: 3px;
                font-size: 0.75rem;
                font-weight: bold;
            }
        `

        let content = ''
        if (!this.currentLine || this.historyData.length === 0) {
            content = `<div class="no-line">Select a line to view its history</div>`
        } else {
            // Get IIIF context for the container
            const iiifContext = this.getIIIFContext()

            const historyItems = this.historyData.map((item, index) => {
                const text = this.getLineText(item)
                const bounding = this.getLineBounding(item)
                const timestamp = this.getTimestamp(item)
                const isLatest = index === 0

                // Check if bounding changed from previous version
                const prevBounding = index < this.historyData.length - 1
                    ? this.getLineBounding(this.historyData[index + 1])
                    : null
                const boundingChanged = this.boundingChanged(bounding, prevBounding)

                // Get version ID for better identification
                const versionId = item['@id'] ?? item.id ?? item._id ?? `version-${index}`
                const shortId = versionId.includes('/') ? versionId.split('/').pop() : versionId
                const lineId = item['@id'] ?? item.id ?? item._id

                let boundingHtml = ''
                if (bounding) {
                    boundingHtml = `
                        <div class="bounding-info">
                            <div class="bounding-info-title">
                                Image Bounding
                                ${boundingChanged && !isLatest ? '<span class="changed-indicator">CHANGED</span>' : ''}
                            </div>
                            <div class="bounding-values">
                                x: ${bounding.x}, y: ${bounding.y}, width: ${bounding.width}, height: ${bounding.height}
                            </div>
                        </div>
                    `
                }

                // Generate line image HTML
                let imageHtml = ''
                if (lineId && (iiifContext.manifest || iiifContext.canvas)) {
                    // Create region attribute from bounding coordinates
                    let regionAttr = ''
                    if (bounding) {
                        regionAttr = `region="${bounding.x},${bounding.y},${bounding.width},${bounding.height}"`
                    }
                    
                    imageHtml = `
                        <div class="line-image-container">
                            <div class="line-image-title">Line Image Preview</div>
                            <tpen-line-image 
                                tpen-line-id="${lineId}"
                                ${regionAttr}
                                class="line-image">
                            </tpen-line-image>
                        </div>
                    `
                } else if (lineId) {
                    imageHtml = `
                        <div class="line-image-container">
                            <div class="line-image-title">Line Image Preview</div>
                            <div class="no-image">Missing IIIF context (manifest/canvas)</div>
                        </div>
                    `
                } else if (bounding) {
                    imageHtml = `
                        <div class="line-image-container">
                            <div class="line-image-title">Line Image Preview</div>
                            <div class="no-image">Missing line ID for TPEN image component</div>
                        </div>
                    `
                }

                return `
                    <li class="history-item">
                        <div class="history-item-header">
                            <span class="version-label">${isLatest ? 'Current Version' : `Version ${this.historyData.length - index}`}</span>
                            <span class="version-id" title="${versionId}">(${shortId})</span>
                            <span class="timestamp" title="${this.formatTimeAgo(timestamp)}">${this.formatTimestamp(timestamp)}</span>
                        </div>
                        <div class="history-text ${text ? '' : 'empty'}">${text ?? '(empty)'}</div>
                        ${boundingHtml}
                        ${imageHtml}
                    </li>
                `
            }).join('')

            content = `
                <div class="history-header">
                    <h2>Line History</h2>
                </div>
                <ul class="history-list" 
                    ${iiifContext.manifest ? `iiif-manifest="${iiifContext.manifest}"` : ''}
                    ${iiifContext.canvas ? `iiif-canvas="${iiifContext.canvas}"` : ''}>
                    ${historyItems}
                </ul>
            `
        }

        this.shadowRoot.innerHTML = `
            <style>${styles}</style>
            <div class="history-container">
                ${content}
            </div>
        `
    }
}

// Register the custom element
customElements.define('tpen-line-history', TPENLineHistory)

export default TPENLineHistory
