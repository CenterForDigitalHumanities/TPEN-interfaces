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
        
        container.innerHTML = recentProjects.map(a => {
            let lastEdited = stringFromDate(a.project._modifiedAt)
            // Generate a unique placeholder based on project properties to provide visual variety
            const placeholderImage = this.generateProjectPlaceholder(a.project)
            return `
            <div class="section" data-id="${a.project._id}">
                <h3>${a.label}</h3>
                <span style="font-size:0.9em;color:#888;">${a.project.label}</span>
                <a href="${TPEN.BASEURL}/transcribe?projectID=${a.project._id}&pageID=${a.pageId}">
                <img src="${placeholderImage}" alt="${a.project.label ?? 'Project'}" data-project-id="${a.project._id}">
                </a>
                <p>${lastEdited ? `Last edited: ${lastEdited}` : ''}</p>
            </div>
            `
        }).join('')
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
