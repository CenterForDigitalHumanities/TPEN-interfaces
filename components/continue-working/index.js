import TPEN from '../../api/TPEN.js'
import { stringFromDate } from '/js/utils.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'
import vault from '../../js/vault.js'

/**
 * ContinueWorking - Displays recent projects with thumbnails for quick access.
 * @element tpen-continue-working
 */
class ContinueWorking extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                .tpen-continue-working {
                    display: flex;
                    flex-wrap: wrap;
                }
                .section {
                    flex: 1 1 200px;
                    margin-bottom: 15px;
                    cursor:pointer;
                    transition:all 0.3s linear;
                    transform:scale(0.9)
                }
                .section:hover {
                    transform:scale(1)
                }
                .section img {
                    width: 100%;
                    height: auto;
                    border-radius: 4px;
                    aspect-ratio: 1;
                    object-fit: cover;
                    object-position: top left;
                    transition: opacity 0.3s ease-in-out;
                    opacity: 1;
                }
            </style>
            <div class="tpen-continue-working"></div>
        `
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-user-projects-loaded', this.handleProjectsLoaded)
        TPEN.getUserProjects(TPEN.getAuthorization())
    }

    disconnectedCallback() {
        this.cleanup.run()
    }

    handleProjectsLoaded = async (event) => {
        const projects = TPEN.userProjects
        const metrics = TPEN.userMetrics
        const container = this.shadowRoot.querySelector('.tpen-continue-working')
        if (!container) return
        // Priority order: myRecent > lastModified > newest
        const metricLabels = [
            { key: 'myRecent', label: 'Your Last Edit' },
            { key: 'lastModified', label: 'Recently Modified' },
            { key: 'newest', label: 'Newest Project' }
        ]
        const seen = new Set()
        const deduped = []
        for (const { key, label } of metricLabels) {
            const id = metrics?.[key]
            if (id && !seen.has(id)) {
                seen.add(id)
                deduped.push({ id, label })
            }
        }
        const recentProjects = deduped
            .map(({ id, label }) => {
                const projectId = id.split('project:')[1].split('/page:')[0]
                const pageId = id.split('/page:')[1].split('/').pop()
                const project = projects.find(p => p._id === projectId)
                return project ? { project, label, pageId } : null
            })
            .filter(Boolean)

        // If there are no recent projects, notify parent via custom event
        if (recentProjects.length === 0) {
            TPEN.eventDispatcher.dispatch('tpen-no-recent-activity')
            return
        }
        
        const recentProjectsWithPlaceholders = recentProjects.map(a => {
            let lastEdited = stringFromDate(a.project._modifiedAt)
            const thumbnail = this.generateProjectPlaceholder(a.project)
            return { ...a, lastEdited, thumbnail }
        })
        
        // Render immediately with placeholders
        container.innerHTML = recentProjectsWithPlaceholders.map(a => {
            return `
            <div class="section" data-id="${a.project._id}">
                <h3>${a.label}</h3>
                <span style="font-size:0.9em;color:#888;">${a.project.label}</span>
                <a href="${TPEN.BASEURL}/transcribe?projectID=${a.project._id}&pageID=${a.pageId}">
                <img src="${a.thumbnail}" alt="${a.project.label ?? 'Project'}" data-project-id="${a.project._id}">
                </a>
                <p>${a.lastEdited ? `Last edited: ${a.lastEdited}` : ''}</p>
            </div>
            `
        }).join('')
        
        // Load real thumbnails asynchronously and replace placeholders
        recentProjects.forEach(async (projectData) => {
            try {
                const realThumbnail = await this.getProjectThumbnail(projectData.project, projectData.pageId)
                const img = container.querySelector(`img[data-project-id="${projectData.project._id}"]`)
                if (img && img.src !== realThumbnail) {
                    // Create a temporary image to preload
                    const tempImg = new Image()
                    tempImg.onload = () => {
                        // Fade out current image
                        img.style.opacity = '0'
                        // After fade out, change src and fade back in
                        setTimeout(() => {
                            img.src = realThumbnail
                            img.style.opacity = '1'
                        }, 150) // Half of transition time
                    }
                    tempImg.src = realThumbnail
                }
            } catch (error) {
                console.error('Error loading thumbnail for project:', projectData.project._id, error)
            }
        })
    }

    generateProjectPlaceholder(project) {
        // Generate a simple SVG placeholder with project-specific colors and initials
        // This provides visual variety without network requests that cause CORS issues
        const projectName = project.label || project.title || 'Project'
        const initials = projectName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()
        
        // Generate a color based on project ID for consistency
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', 
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
        ]
        const colorIndex = project._id ? Array.from(project._id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length : 0
        const backgroundColor = colors[colorIndex]
        
        // Create a simple SVG as data URL
        const svg = `
            <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad${colorIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${backgroundColor}dd;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grad${colorIndex})" rx="8"/>
                <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="36" font-weight="bold" 
                      text-anchor="middle" fill="white" opacity="0.9">${initials}</text>
                <text x="50%" y="75%" font-family="Arial, sans-serif" font-size="12" 
                      text-anchor="middle" fill="white" opacity="0.7">PROJECT</text>
            </svg>
        `
        
        return `data:image/svg+xml;base64,${btoa(svg)}`
    }

    async getProjectThumbnail(project, annotationPageId) {
        try {
            if (!annotationPageId) return this.generateProjectPlaceholder(project)
            const annotationPage = await fetch(`${TPEN.servicesURL}/project/${project._id}/page/${annotationPageId}`).then(r => r.json())
            const canvasId = annotationPage.target
            if (!canvasId) return this.generateProjectPlaceholder(project)

            // Determine manifest URL — handle both array and string formats
            let manifestUrl = Array.isArray(project.manifest) ? project.manifest[0] : project.manifest
            // Project summaries from getUserProjects may omit manifest; fetch full project if needed
            if (!manifestUrl) {
                try {
                    const token = TPEN.getAuthorization()
                    const fullProject = await fetch(`${TPEN.servicesURL}/project/${project._id}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    }).then(r => r.ok ? r.json() : null)
                    manifestUrl = Array.isArray(fullProject?.manifest) ? fullProject.manifest[0] : fullProject?.manifest
                } catch { /* proceed without manifest */ }
            }

            // Pre-load manifest so embedded canvases are BFS-cached in vault
            if (manifestUrl) {
                vault.registerManifestHint(canvasId, manifestUrl)
                await vault.get(manifestUrl, 'manifest').catch(() => {})
            }

            // Use vault for canvas fetching — canvas may already be in BFS cache from manifest pre-load
            const canvas = await vault.get(canvasId, 'canvas', false, 'tpen-continue-working')
            if (!canvas) return this.generateProjectPlaceholder(project)

            // Detect IIIF version: v3 uses type "Canvas", v2 uses @type "sc:Canvas"
            const canvasType = canvas.type ?? canvas['@type']
            const isV3 = canvasType === 'Canvas'
            
            // Get thumbnail from canvas
            let thumbnailUrl = canvas.thumbnail?.id ?? canvas.thumbnail?.['@id'] ?? canvas.thumbnail
            if (!thumbnailUrl) {
                // Get image
                const annotation = isV3
                    ? canvas.items?.[0]?.items?.[0]
                    : canvas.images?.[0]
                const imageUrl = isV3
                    ? annotation?.body?.id ?? annotation?.body?.['@id']
                    : annotation?.resource?.['@id'] ?? annotation?.resource?.service?.['@id']
                if (annotation?.body?.service || imageUrl?.includes('/full/')) {
                    const service = Array.isArray(annotation.body.service) ? annotation.body.service[0] : annotation.body.service
                    thumbnailUrl = service.id ?? service['@id'] ?? imageUrl
                    const baseUrl = this.getBaseUrl(imageUrl)
                    try {
                        const info = await fetch(baseUrl + '/info.json').then(r => r.json())
                        thumbnailUrl = `${baseUrl}/full/${isV3 ? 'max' : 'full'}/200,/0/default.jpg`
                        await fetch(`${baseUrl}/square/${isV3 ? 'max' : 'full'}/200,/0/default.jpg`)
                            .then(() => thumbnailUrl = `${baseUrl}/square/${isV3 ? 'max' : 'full'}/200,/0/default.jpg`)
                            .catch(async () => await fetch(`${baseUrl}/full/${isV3 ? 'max' : 'full'}/200,/0/default.jpg`)
                                .then(() => thumbnailUrl = `${baseUrl}/full/${isV3 ? 'max' : 'full'}/200,/0/default.jpg`)
                                .catch(() => thumbnailUrl = imageUrl)
                            )
                    } catch {
                        thumbnailUrl = imageUrl
                    }
                }
                thumbnailUrl ??= imageUrl
            }
            return thumbnailUrl ?? this.generateProjectPlaceholder(project)
        } catch (error) {
            console.error('Error getting thumbnail:', error)
            return this.generateProjectPlaceholder(project)
        }
    }

    getBaseUrl(imageUrl) {
        if (imageUrl.endsWith('/info.json')) {
            return imageUrl.replace('/info.json', '')
        }
        if (imageUrl.includes('/full/')) {
            return imageUrl.replace(/\/full\/.*$/, '')
        }
        return imageUrl
    }

}

customElements.define('tpen-continue-working', ContinueWorking)

function collapseSimilarMetrics(metrics) {
    const collapsedMetrics = {}
    metrics.forEach(metric => {
        if (!collapsedMetrics[metric.name]) {
            collapsedMetrics[metric.name] = metric
        } else {
            collapsedMetrics[metric.name].value += metric.value
        }
    })
    return Object.values(collapsedMetrics)
}
