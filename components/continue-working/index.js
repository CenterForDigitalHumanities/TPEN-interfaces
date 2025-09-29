import TPEN from '../../api/TPEN.js'
import { stringFromDate } from '/js/utils.js'

class ContinueWorking extends HTMLElement {
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
        TPEN.eventDispatcher.on('tpen-user-projects-loaded', this.handleProjectsLoaded)
        TPEN.getUserProjects(TPEN.getAuthorization())
    }

    disconnectedCallback() {
        TPEN.eventDispatcher.off('tpen-user-projects-loaded', this.handleProjectsLoaded)
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
            
            let canvas, isV3
            try {
                canvas = await fetch(canvasId).then(r => r.json())
                const context = canvas['@context']
                isV3 = Array.isArray(context)
                    ? context.some(ctx => typeof ctx === 'string' && ctx.includes('iiif.io/api/presentation/3'))
                    : typeof context === 'string' && context.includes('iiif.io/api/presentation/3')
            } catch {
                // Fetch manifest
                const manifestUrl = project.manifest?.[0]
                if (!manifestUrl) return this.generateProjectPlaceholder(project)
                
                const manifest = await fetch(manifestUrl).then(r => r.json())
                const context = manifest['@context']
                isV3 = Array.isArray(context)
                    ? context.some(ctx => typeof ctx === 'string' && ctx.includes('iiif.io/api/presentation/3'))
                    : typeof context === 'string' && context.includes('iiif.io/api/presentation/3')
                const canvases = isV3 ? manifest.items : manifest.sequences?.[0]?.canvases
                canvas = canvases?.find(c => (isV3 ? c.id : c['@id']) === canvasId)
                if (!canvas) return this.generateProjectPlaceholder(project)
            }
            
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
