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

    handleProjectsLoaded = (event) => {
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
                const projectId = id.split(':')[1].split('/')[0]
                const pageId = id.split('/')[1].split(':')[1]
                const project = projects.find(p => p._id === projectId)
                return project ? { project, label, pageId } : null
            })
            .filter(Boolean)
        container.innerHTML = recentProjects.map(a => {
            let lastEdited = stringFromDate(a.project._modifiedAt)
            return `
            <div class="section" data-id="${a.project._id}">
                <h3>${a.label}</h3>
                <span style="font-size:0.9em;color:#888;">${a.project.label}</span>
                <a href="${TPEN.BASEURL}/transcribe?projectId=${a.project._id}&pageId=${a.pageId}">
                <img src="../assets/images/manuscript_img.webp" alt="${a.project.label ?? 'Project'}">
                </a>
                <p>${lastEdited ? `Last edited: ${lastEdited}` : ''}</p>
            </div>
            `
        }).join('')
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
