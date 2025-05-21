import TPEN from '../../api/TPEN.js'

class ContinueWorking extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                .tpen-continue-working {
                    padding: 10px;
                    display: flex;
                    gap:10px
                }
                .section {
                    margin-bottom: 15px;
                    cursor:pointer;
                    transition:all 0.3s linear;
                }
                .section:hover {
                    transform:scale(0.9)
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
        if(TPEN.userMetrics) {
            this.handleProjectsLoaded()
        }
        TPEN.getUserProjects()
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
                const project = projects.find(p => p.id === id)
                return project ? { ...project, label } : null
            })
            .filter(Boolean)
        container.innerHTML = recentProjects.map(project => `
            <div class="section" data-id="${project.id}">
                <h3>${project.title ?? 'Untitled Project'}</h3>
                <span style="font-size:0.9em;color:#888;">${project.label}</span>
                <img src="${project.image ?? '../assets/images/manuscript_img.webp'}" alt="${project.title ?? 'Project'}">
                <p>${project.lastEdited ? `Last edited: ${new Date(project.lastEdited).toLocaleString()}` : ''}</p>
            </div>
        `).join('')
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
