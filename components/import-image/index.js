import TPEN from "../../api/TPEN.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * ImageImporter - Creates a new project from one or more image URLs.
 * @element tpen-image-importer
 */
class ImageImporter extends HTMLElement {
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.render()
    this.addEventListeners()
  }

  disconnectedCallback() {
    this.cleanup.run()
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .importer-container {
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 400px;
        }
        input, button {
          padding: 10px;
          font-size: 1rem;
        }
        .feedback {
          margin-top: 10px;
        }
        .error { color: red; }
        .success { color: green; }
        .loading { color: blue; }
        .page-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9f9f9;
          border: 1px solid #ddd;
          padding: 10px;
          margin-top: 10px;
          border-radius: 5px;
        }
        .page-info span {
          font-weight: bold;
        }
        .manage-btn {
          background: #007bff;
          color: #fff;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 5px;
        }
        .manage-btn:hover {
          background: #0056b3;
        }
      </style>
      <div class="importer-container">
        <h3>Create Project from Image URL</h3>
        <label for="name">Enter Project Name:</label>
        <input type="text" id="name" placeholder="Enter Project Name..." />
        <label for="url">Image URL:</label>
        <input type="text" id="url" placeholder="Drop an image URL here or paste comma-separated URLs..." />
        <button id="submit">Create Project</button>
        <div id="feedback" class="feedback"></div>
        <div id="page-info-container"></div>
      </div>
    `

  }

  /**
   * Sets up event listeners for the component.
   */
  addEventListeners() {
    this.urlInput = this.shadowRoot.querySelector('#url')
    this.submitButton = this.shadowRoot.querySelector('#submit')
    this.feedback = this.shadowRoot.querySelector('#feedback')
    this.pageInfoContainer = this.shadowRoot.querySelector('#page-info-container')

    const importHandler = this.handleImport.bind(this)
    const dragoverHandler = (e) => e.preventDefault()
    const dropHandler = (e) => {
      e.preventDefault()
      const data = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
      if (data) {
        this.urlInput.value = data
      }
    }

    this.cleanup.onElement(this.submitButton, 'click', importHandler)
    this.cleanup.onElement(this.urlInput, 'dragover', dragoverHandler)
    this.cleanup.onElement(this.urlInput, 'drop', dropHandler)
  }

  setLoadingState(isLoading) {
    if (isLoading) {
      this.feedback.textContent = 'Importing image, please wait...'
      this.feedback.className = 'loading'
      this.submitButton.disabled = true
    } else {
      this.feedback.textContent = ''
      this.submitButton.disabled = false
    }
  }

  async validateImageUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => reject(false)
      img.src = url
    })
  }

  async handleImport() {
    let url = this.urlInput.value.trim()
    const urls = url.split(',').map(u => u.trim())
    const label = this.shadowRoot.querySelector('#name').value.trim()
    this.feedback.textContent = ''
    this.pageInfoContainer.innerHTML = ''

    if (!urls.length) {
      this.feedback.textContent = 'Please provide at least one image URL.'
      this.feedback.className = 'error'
      return
    }

    try {
      for (const url of urls) {
        await this.validateImageUrl(url)
      }
    }
    catch (error) {
      this.feedback.textContent = 'The provided URL is unreachable or does not point to a valid image.'
      this.feedback.className = 'error'
      return
    }

    const projectNameRegex = /^[a-zA-Z0-9\s\-_.]+$/
    if (!projectNameRegex.test(label)) {
      this.feedback.textContent = 'Project name can only contain letters, numbers, spaces, dashes, underscores, and periods.'
      this.feedback.className = 'error'
      return
    }

    if (!label) {
      this.feedback.textContent = 'Please enter a project name.'
      this.feedback.className = 'error'
      return
    }

    this.setLoadingState(true)

    try {
      const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
      await fetch(`${TPEN.servicesURL}/project/import-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ imageUrls : urls, projectLabel : label }),
      })
      .then(async(response) => {
         if (!response.ok) {
          const errorData = await response.json()
          this.feedback.textContent = errorData.message
          this.feedback.className = 'error'
          this.setLoadingState(false)
          return errorData
        } else {
          const result = await response.json()
          this.feedback.textContent = 'Page imported successfully!'
          this.feedback.className = 'success'
          this.displayPageInfo(result)
          this.setLoadingState(false)
          return result
        }
      })
      .catch(error => {
        throw error
      })
    } catch (error) {
      console.error('Error importing page')
      console.error(error)
      this.feedback.textContent = 'An unexpected error occurred.'
      this.feedback.className = 'error'
    }
  }

  displayPageInfo(project) {
    const pageInfo = document.createElement('div')
    pageInfo.className = 'page-info'

    const pageTitle = document.createElement('span')
    pageTitle.textContent = project.label || 'Untitled Page'

    const manageButton = document.createElement('a')
    manageButton.className = 'manage-btn'
    manageButton.textContent = 'Manage'
    manageButton.href = `${TPEN.BASEURL}/project/manage?projectID=${project._id}`

    pageInfo.appendChild(pageTitle)
    pageInfo.appendChild(manageButton)

    this.pageInfoContainer.appendChild(pageInfo)
  }
}

customElements.define('tpen-image-importer', ImageImporter)
