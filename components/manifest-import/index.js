/**
 * Manifest Import Component
 * Handles importing multiple manifests as projects and displaying results
 * @module manifest-import
 */

import TPEN from '../../api/TPEN.js'
import { getUserFromToken } from '../iiif-tools/index.js'
import { escapeHtml } from '/js/utils.js'

class ManifestImport extends HTMLElement {
    #manifests = []
    #createdProjects = []
    #authToken

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        this.#authToken = TPEN.getAuthorization()
        if (!this.#authToken) {
            TPEN.attachAuthentication(this)
        }
        this.load()
    }

    async load() {
        this.#authToken = TPEN.getAuthorization()
        if (!this.#authToken) {
            this.renderNeedAuth()
            return
        }

        this.#manifests = this.#extractManifests()
        if (this.#manifests.length === 0) {
            this.renderNoManifests()
            return
        }

        // For multiple manifests, require explicit user confirmation before starting import
        if (this.#manifests.length > 1) {
            const confirmMessage = `You are about to import ${this.#manifests.length} manifests as new projects. Do you want to continue?`
            const proceed = window.confirm(confirmMessage)
            if (!proceed) {
                if (this.shadowRoot) {
                    this.shadowRoot.innerHTML = '<p>Manifest import canceled by user.</p>'
                }
                return
            }
        }
        this.renderCreating()
        await this.#createProjects()
    }

    #extractManifests() {
        const params = new URLSearchParams(window.location.search)
        const manifests = params.getAll('manifest').filter(m => m?.trim())
        return [...new Set(manifests)] // Remove duplicates
    }

    async #createProjects() {
        this.#createdProjects = []
        for (const manifestUrl of this.#manifests) {
            try {
                const project = await this.#importManifest(manifestUrl)
                this.#createdProjects.push(project)
            } catch (error) {
                console.error(`Failed to import manifest: ${manifestUrl}`, error)
                this.#createdProjects.push({
                    error: true,
                    manifestUrl,
                    message: error.message || 'Failed to create project'
                })
            }
        }
        this.renderResults()
    }

    async #importManifest(manifestUrl) {
        const response = await fetch(`${TPEN.servicesURL}/project/import?createFrom=URL`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#authToken}`
            },
            body: JSON.stringify({ url: manifestUrl })
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        return response.json()
    }

    renderNeedAuth() {
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: var(--light-gray, #f5f5f5);
                    font-family: Roboto, Avenir, sans-serif;
                    padding: 20px;
                }

                .card {
                    background: var(--white, white);
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    padding: 40px;
                    max-width: 400px;
                    text-align: center;
                }

                h2 {
                    color: var(--text-primary, #333);
                    margin: 0 0 20px 0;
                    font-size: 24px;
                }

                p {
                    color: var(--text-secondary, #666);
                    margin: 0 0 30px 0;
                    line-height: 1.6;
                }

                button {
                    background: var(--interface-primary, #005a8c);
                    color: var(--white, white);
                    border: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }

                button:hover {
                    background: var(--interface-primary-hover, #004670);
                }
            </style>
            <div class="container">
                <div class="card">
                    <h2>Sign In Required</h2>
                    <p>You need to be signed in to import manifests and create projects.</p>
                    <button id="loginBtn">Sign In to TPEN</button>
                </div>
            </div>
        `
        this.shadowRoot.querySelector('#loginBtn').addEventListener('click', () => {
            TPEN.login(window.location.href)
        })
    }

    renderNoManifests() {
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: var(--light-gray, #f5f5f5);
                    font-family: Roboto, Avenir, sans-serif;
                    padding: 20px;
                }

                .card {
                    background: var(--white, white);
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    padding: 40px;
                    max-width: 400px;
                    text-align: center;
                }

                h2 {
                    color: var(--text-primary, #333);
                    margin: 0 0 20px 0;
                }

                p {
                    color: var(--text-secondary, #666);
                    margin: 20px 0;
                }

                code {
                    background: var(--light-gray, #f5f5f5);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: monospace;
                    color: var(--error-color, #d93025);
                }

                a {
                    color: var(--link, #b8341a);
                    text-decoration: none;
                }

                a:hover {
                    text-decoration: underline;
                }

                .button-link {
                    display: inline-block;
                    background: var(--interface-primary, #005a8c);
                    color: var(--white, white);
                    padding: 10px 20px;
                    border-radius: 4px;
                    text-decoration: none;
                    margin: 15px 5px 10px;
                    transition: background 0.3s ease;
                }

                .button-link:hover {
                    background: var(--interface-primary-hover, #004670);
                }

                .actions {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid var(--light-gray, #e0e0e0);
                }
            </style>
            <div class="container">
                <div class="card">
                    <h2>No Manifests Found</h2>
                    <p>No IIIF manifests were provided in the URL.</p>
                    <p>Try a URL like:</p>
                    <p style="font-size: 12px; text-align: left;">
                        <code>/import-manifest?manifest=http%3A%2F%2Fexample.com%2Fmanifest.json</code>
                    </p>
                    <div class="actions">
                        <p style="margin-bottom: 15px;">You can also:</p>
                        <a href="${TPEN.BASEURL}/project/import" class="button-link">Use Import Form</a>
                        <br>
                        <a href="${TPEN.BASEURL}/">Back to TPEN</a>
                    </div>
                </div>
            </div>
        `
    }

    renderCreating() {
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: var(--light-gray, #f5f5f5);
                    font-family: Roboto, Avenir, sans-serif;
                }

                .loader-wrapper {
                    text-align: center;
                }

                .spinner {
                    border: 4px solid var(--light-gray, #f5f5f5);
                    border-top: 4px solid var(--interface-primary, #005a8c);
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                h2 {
                    color: var(--text-primary, #333);
                    margin: 0 0 10px 0;
                }

                p {
                    color: var(--text-secondary, #666);
                    margin: 0;
                }
            </style>
            <div class="container">
                <div class="loader-wrapper">
                    <div class="spinner"></div>
                    <h2>Creating Projects</h2>
                    <p>Importing ${this.#manifests.length} manifest${this.#manifests.length !== 1 ? 's' : ''}...</p>
                </div>
            </div>
        `
    }

    renderResults() {
        const successful = this.#createdProjects.filter(p => !p.error)
        const failed = this.#createdProjects.filter(p => p.error)

        this.shadowRoot.innerHTML = `
            <style>
                .page {
                    min-height: 100vh;
                    background: var(--light-gray, #f5f5f5);
                    font-family: Roboto, Avenir, sans-serif;
                    padding: 20px;
                }

                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .header {
                    background: var(--white, white);
                    padding: 30px 20px;
                    border-radius: 8px 8px 0 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 0;
                }

                .header h1 {
                    margin: 0 0 10px 0;
                    color: var(--text-primary, #333);
                }

                .header-summary {
                    color: var(--text-secondary, #666);
                    font-size: 14px;
                }

                .content {
                    background: var(--white, white);
                    padding: 30px 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 0;
                }

                .section {
                    margin-bottom: 40px;
                }

                .section:last-child {
                    margin-bottom: 0;
                }

                .section-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 20px 0;
                    color: var(--text-primary, #333);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .success-icon {
                    color: var(--success-color, #34a853);
                    font-size: 20px;
                }

                .error-icon {
                    color: var(--error-color, #d93025);
                    font-size: 20px;
                }

                .project-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .project-card {
                    background: var(--interface-secondary, #f0f0f0);
                    border: 1px solid var(--light-gray, #ddd);
                    border-radius: 6px;
                    padding: 20px;
                    transition: box-shadow 0.3s ease;
                }

                .project-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .project-title {
                    font-weight: 600;
                    margin: 0 0 10px 0;
                    color: var(--text-primary, #333);
                    word-break: break-word;
                    font-size: 16px;
                }

                .project-meta {
                    font-size: 12px;
                    color: var(--text-muted, #999);
                    margin: 10px 0;
                }

                .project-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                    flex-wrap: wrap;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    transition: background 0.3s ease;
                    text-align: center;
                    flex: 1;
                    min-width: 100px;
                }

                .btn-primary {
                    background: var(--interface-primary, #005a8c);
                    color: var(--white, white);
                }

                .btn-primary:hover {
                    background: var(--interface-primary-hover, #004670);
                }

                .btn-secondary {
                    background: var(--interface-secondary-hover, #e0e0e0);
                    color: var(--text-primary, #333);
                }

                .btn-secondary:hover {
                    background: var(--light-gray, #d0d0d0);
                }

                .error-item {
                    background: var(--error-light, rgba(217, 48, 37, 0.1));
                    border: 1px solid var(--error-color, #d93025);
                    border-radius: 6px;
                    padding: 15px;
                    margin-bottom: 10px;
                }

                .error-url {
                    font-size: 12px;
                    word-break: break-all;
                    color: var(--text-secondary, #666);
                    margin: 10px 0 0 0;
                    font-family: monospace;
                }

                .footer {
                    background: var(--white, white);
                    padding: 20px;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .footer a {
                    padding: 10px 20px;
                    border-radius: 4px;
                    text-decoration: none;
                    transition: background 0.3s ease;
                    flex: 1;
                    min-width: 150px;
                    text-align: center;
                }

                .footer a.home {
                    background: var(--interface-secondary, #f0f0f0);
                    color: var(--text-primary, #333);
                }

                .footer a.home:hover {
                    background: var(--interface-secondary-hover, #e0e0e0);
                }

                .empty-state {
                    text-align: center;
                    color: var(--text-muted, #999);
                    padding: 20px;
                }

                @media (max-width: 600px) {
                    .project-grid {
                        grid-template-columns: 1fr;
                    }

                    .footer {
                        flex-direction: column;
                    }

                    .footer a {
                        min-width: unset;
                    }
                }
            </style>
            <div class="page">
                <div class="container">
                    <div class="header">
                        <h1>Projects Created</h1>
                        <div class="header-summary">
                            ${successful.length} project${successful.length !== 1 ? 's' : ''} created${failed.length > 0 ? `, ${failed.length} failed` : ''}
                        </div>
                    </div>

                    <div class="content">
                        ${successful.length > 0 ? `
                            <div class="section">
                                <div class="section-title">
                                    <span class="success-icon">✓</span>
                                    Successfully Created (${successful.length})
                                </div>
                                <div class="project-grid">
                                    ${successful.map(project => this.#renderProjectCard(project)).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${failed.length > 0 ? `
                            <div class="section">
                                <div class="section-title">
                                    <span class="error-icon">✕</span>
                                    Failed (${failed.length})
                                </div>
                                ${failed.map(error => `
                                    <div class="error-item">
                                        <strong>${error.message}</strong>
                                        <div class="error-url">${error.manifestUrl}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${successful.length === 0 && failed.length === 0 ? `
                            <div class="empty-state">
                                <p>No projects were created.</p>
                            </div>
                        ` : ''}
                    </div>

                    <div class="footer">
                        <a href="${TPEN.BASEURL}/" class="home">Back to TPEN</a>
                        ${successful.length > 0 ? `
                            <a href="${TPEN.BASEURL}/project" class="home">View Projects</a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `
    }

    #renderProjectCard(project) {
        const escapedProjectId = escapeHtml(String(project._id || ''))
        const encodedProjectId = encodeURIComponent(String(project._id || ''))
        return `
            <div class="project-card">
                <div class="project-title">${escapeHtml(project.label || 'Untitled Project')}</div>
                <div class="project-meta">ID: ${escapedProjectId}</div>
                ${project.metadata?.length > 0 ? `
                    <div class="project-meta">
                        Layers: ${project.layers?.length || 0} | Pages: ${this.#countPages(project)}
                    </div>
                ` : ''}
                <div class="project-actions">
                    <a href="${TPEN.BASEURL}/project?projectID=${encodedProjectId}" class="btn btn-primary">View</a>
                    <a href="${TPEN.BASEURL}/interfaces/transcription?projectID=${encodedProjectId}" class="btn btn-secondary">Transcribe</a>
                </div>
            </div>
        `
    }

    #countPages(project) {
        return project.layers?.reduce((total, layer) => total + (layer.pages?.length || 0), 0) || 0
    }
}

customElements.define('tpen-manifest-import', ManifestImport)
