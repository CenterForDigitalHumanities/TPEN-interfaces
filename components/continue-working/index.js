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
                }
                .section {
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
                    transition: opacity 0.3s ease;
                }
                .section img.loading {
                    opacity: 0.6;
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
        
        // First render with placeholder images
        container.innerHTML = recentProjects.map(a => {
            let lastEdited = stringFromDate(a.project._modifiedAt)
            return `
            <div class="section" data-id="${a.project._id}">
                <h3>${a.label}</h3>
                <span style="font-size:0.9em;color:#888;">${a.project.label}</span>
                <a href="${TPEN.BASEURL}/transcribe?projectID=${a.project._id}&pageID=${a.pageId}">
                <img src="../assets/images/manuscript_img.webp" alt="${a.project.label ?? 'Project'}" data-project-id="${a.project._id}">
                </a>
                <p>${lastEdited ? `Last edited: ${lastEdited}` : ''}</p>
            </div>
            `
        }).join('')
        
        // Then asynchronously load actual project images
        for (const { project } of recentProjects) {
            this.loadProjectImage(project._id)
        }
    }

    async loadProjectImage(projectId) {
        const imgElement = this.shadowRoot.querySelector(`img[data-project-id="${projectId}"]`)
        if (!imgElement) return
        
        try {
            // Add loading state
            imgElement.classList.add('loading')
            
            // Get the first page of the project
            const firstPage = await TPEN.getFirstPageOfProject(projectId)
            if (!firstPage?.target) {
                console.warn(`No target found for project ${projectId}`)
                return
            }

            // Fetch the canvas to get the image
            const canvasResponse = await fetch(firstPage.target)
            if (!canvasResponse.ok) {
                throw new Error(`Canvas fetch failed: ${canvasResponse.status}`)
            }
            
            const canvas = await canvasResponse.json()
            let imageId = canvas.items?.[0]?.items?.[0]?.body?.id
            
            if (imageId) {
                // Handle IIIF Image API URLs - ensure they have proper parameters for thumbnails
                if (!imageId.includes('default.jpg')) {
                    const lastChar = imageId[imageId.length - 1]
                    if (lastChar !== '/') imageId += '/'
                    imageId += 'full/300,/0/default.jpg' // Request a 300px wide thumbnail
                }
                
                // Update the image source
                imgElement.src = imageId
                imgElement.classList.remove('loading')
            }
        } catch (error) {
            console.warn(`Failed to load image for project ${projectId}:`, error)
            // Keep the placeholder image on error and remove loading state
            imgElement.classList.remove('loading')
        }
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
