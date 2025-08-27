import TPEN from '../../api/TPEN.js'
import User from '../../api/User.js'
import Project from '../../api/Project.js'

class ContributionActivity extends HTMLElement {
    static get observedAttributes() {
        return ['tpen-user-id']
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.eventDispatcher.on('tpen-user-loaded', async ev => {
            await this.render(await TPEN.getUserProjects(TPEN.getAuthorization()))
        })
        TPEN.attachAuthentication(this)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'tpen-user-id') {
            if (oldValue !== newValue) {
                const currVal = this?.user?._id
                if (newValue === currVal) return
                const loadedUser = new User(newValue)
                loadedUser.authentication = TPEN.getAuthorization()
                loadedUser.getProfile()
            }
        }
    }

    async render(projects) {
        const contributionsMap = new Map()

        for (const project of projects) {
            const projectData = await new Project(project._id).fetch()

            projectData.layers?.forEach(layer => {
                if (!contributionsMap.has(layer.id)) {
                    contributionsMap.set(layer.id, {
                        projectId: projectData._id,
                        id: layer.id,
                        projectName: projectData.label,
                        type: layer.label,
                        modifiedTime: projectData._modifiedAt
                    })
                }

                layer.pages?.forEach(page => {
                    if (!contributionsMap.has(page.id)) {
                        contributionsMap.set(page.id, {
                            projectId: projectData._id,
                            id: page.id,
                            projectName: projectData.label,
                            type: page.label,
                            modifiedTime: projectData._modifiedAt
                        })
                    }

                    page.items?.forEach(async (item, index) => {
                        if (item.id && !contributionsMap.has(item.id)) {
                            contributionsMap.set(item.id, {
                                projectId: projectData._id,
                                id: item.id,
                                projectName: projectData.label,
                                type: `${page.label} - Annotation ${index + 1}`,
                                modifiedTime: projectData._modifiedAt
                            })
                        }
                    })
                })
            })
        }

        const contributionsArray = Array.from(contributionsMap.values())

        const contributionsByProject = {}
        contributionsArray.forEach(c => {
            if (!contributionsByProject[c.projectId]) {
                contributionsByProject[c.projectId] = {
                    projectName: c.projectName,
                    contributions: []
                }
            }
            contributionsByProject[c.projectId].contributions.push(c)
        })

        Object.values(contributionsByProject).forEach(projectGroup => {
            projectGroup.contributions.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime))
        })

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                }

                .activity-report {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    border: 1px solid #d1d5da;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                    margin-bottom: 20px;
                }

                .activity-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e1e4e8;
                }

                .activity-header h3 {
                    margin-top: 0;
                    font-size: 1.2rem;
                    padding-bottom: 8px;
                    margin: 0;
                    color: var(--accent);
                }

                .total-count {
                    font-size: 0.95rem;
                    color: #586069;
                    font-weight: 500;
                }

                .total-count span {
                    font-weight: bold;
                }

                .project-group {
                    margin-top: 20px;
                }

                .project-name {
                    font-weight: 600;
                    font-size: 1.2rem;
                    margin-bottom: 6px;
                    color: #333;
                    background-color: #f6f8fa;
                    padding: 8px 12px;
                    border-radius: 8px;
                }

                .project-contributions {
                    list-style: none;
                    padding-left: 0;
                    margin-top: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .project-contributions li {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    color: #333;
                }

                .project-contributions a {
                    text-decoration: none;
                    color: var(--primary-color);
                    font-weight: 500;
                }

                .project-contributions .timestamp {
                    font-size: 0.85rem;
                    color: #586069;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .show-more-btn {
                    margin-top: 6px;
                    font-size: 0.85rem;
                    color: #333;
                    cursor: pointer;
                    user-select: none;
                    font-weight: 500;
                }

                .show-more-btn:hover {
                    color: #024c9b;
                }
            </style>

            <div class="activity-report">
                <div class="activity-header">
                    <h3>Contribution Activity</h3>
                    <div class="total-count">Total contributions: <span>${contributionsArray.length}</span></div>
                </div>
                ${Object.values(contributionsByProject).map((projectGroup, projIndex) => `
                    <div class="project-group">
                        <div class="project-name">${projectGroup.projectName}</div>
                        <ul class="project-contributions" id="project-${projIndex}">
                            ${projectGroup.contributions.slice(0, 5).map(c => `
                                <li>
                                    <a href="${c.id}" target="_blank">${c.type}</a>
                                    <span class="timestamp">${new Date(c.modifiedTime).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric',
                                        hour12: true
                                    })}</span>
                                </li>
                            `).join('')}
                        </ul>
                        ${projectGroup.contributions.length > 5 ? `<div class="show-more-btn" data-proj="${projIndex}">Show more</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `

        this.shadowRoot.querySelectorAll('.show-more-btn').forEach(btn => {
            let shownCount = 5
            const projIndex = btn.getAttribute('data-proj')
            const projectGroup = Object.values(contributionsByProject)[projIndex]
            const ul = this.shadowRoot.getElementById(`project-${projIndex}`)

            btn.addEventListener('click', () => {
                const remaining = projectGroup.contributions.slice(shownCount, shownCount + 5)

                remaining.forEach(c => {
                    const li = document.createElement('li')
                    li.innerHTML = `
                        <a href="${c.id}" target="_blank">${c.type}</a>
                        <span class="timestamp">${new Date(c.modifiedTime).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                        })}</span>
                    `
                    ul.appendChild(li)
                })

                shownCount += remaining.length

                if (shownCount >= projectGroup.contributions.length) {
                    btn.remove()
                }
            })
        })
    }
}

customElements.define('contribution-activity', ContributionActivity)