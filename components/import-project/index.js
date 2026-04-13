import TPEN from "../../api/TPEN.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * ProjectImporter - Creates a new project from a IIIF manifest URL.
 * @element tpen-project-importer
 */
class ProjectImporter extends HTMLElement {
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()
  /** @type {string[]} Ordered list of manifest URLs provided via query params */
  #manifestQueue = []
  /** @type {number} Current position in the manifest queue */
  #manifestIndex = 0

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
          .hint {
            margin: 0;
            color: #4a4a4a;
            font-size: 0.95rem;
            line-height: 1.4;
          }
          .hint code {
            background: #f1f1f1;
            padding: 2px 4px;
            border-radius: 4px;
          }
          input, button {
            padding: 10px;
            font-size: 1rem;
          }
          .feedback {
            margin-top: 10px;
          }
          .error {
            color: red;
          }
          .success {
            color: green;
          }
          .loading {
          color: blue;
        }
          .project-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f9f9f9;
            border: 1px solid #ddd;
            padding: 10px;
            margin-top: 10px;
            border-radius: 5px;
          }
          .project-info span {
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
        <h3>Create Project from Manifest URL</h3>
          <p class="hint">Tip: this page supports direct links like <code>/project/import?manifest=https://example.com/manifest.json</code>.</p>
          <label for="url">Manifest URL:</label>
          <input type="url" id="url" placeholder="Enter manifest URL..." />
          <button id="submit">Import Project</button>
          <div id="feedback" class="feedback"></div>
          <div id="project-info-container"></div>
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
    this.projectInfoContainer = this.shadowRoot.querySelector('#project-info-container')

    this.#prefillManifestFromQuery()

    const importHandler = this.handleImport.bind(this)
    this.cleanup.onElement(this.submitButton, 'click', importHandler)
  }

  /**
   * Prefill the manifest URL input from inbound query params.
   * Supports links like /project/import?manifest=https://example.com/manifest.json
   * When multiple manifest values are provided, stores them as a queue and
   * prompts the user to submit repeatedly to iterate through the list.
   */
  #prefillManifestFromQuery() {
    const params = new URLSearchParams(window.location.search)
    this.#manifestQueue = params.getAll('manifest').map(value => value?.trim()).filter(Boolean)

    if (this.#manifestQueue.length === 0) return

    this.#manifestIndex = 0
    this.urlInput.value = this.#manifestQueue[0]

    this.feedback.className = 'loading'
    if (this.#manifestQueue.length > 1) {
      this.feedback.textContent = `Manifest 1 of ${this.#manifestQueue.length} loaded. Submit to import, then submit again to iterate through your list.`
    } else {
      this.feedback.textContent = 'Manifest URL loaded from link. Review it and click Import Project when ready.'
    }
  }

  /**
   * Advances to the next manifest in the queue after a successful or failed import.
   * Loads the next URL into the input and appends a progress note to the current feedback.
   */
  #advanceQueue() {
    const nextIndex = this.#manifestIndex + 1
    if (nextIndex >= this.#manifestQueue.length) return

    this.#manifestIndex = nextIndex
    this.urlInput.value = this.#manifestQueue[nextIndex]

    const progressNote = document.createElement('small')
    progressNote.textContent = ` — Manifest ${nextIndex + 1} of ${this.#manifestQueue.length} ready. Submit again to continue.`
    this.feedback.appendChild(progressNote)
  }
  setLoadingState(isLoading) {
    if (isLoading) {
      this.feedback.textContent = 'Importing project, please wait...'
      this.feedback.className = 'loading'
      this.submitButton.disabled = true
    } else {
      this.submitButton.disabled = false
    }
  }

  async handleImport() {
    const url = this.urlInput.value
    this.feedback.textContent = ''
    this.projectInfoContainer.innerHTML = ''

    if (!url) {
      this.feedback.textContent = 'URL is required.'
      this.feedback.className = 'error'
      return
    }

    this.setLoadingState(true)

    try {
      const AUTH_TOKEN = TPEN.getAuthorization() ?? TPEN.login()
      const response = await fetch(`${TPEN.servicesURL}/project/import?createFrom=URL`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        this.feedback.textContent = errorData.message
        this.feedback.className = 'error'
      } else {
        const result = await response.json()
        console.log(result)
        this.feedback.textContent = 'Project imported successfully!'
        this.feedback.className = 'success'
        this.displayProjectInfo(result)
      }
    } catch (error) {
      console.error('Error importing project:', error)
      this.feedback.textContent = 'An unexpected error occurred.'
      this.feedback.className = 'error'
    } finally {
      this.setLoadingState(false)
      this.#advanceQueue()
    }
  }

  displayProjectInfo(project) {
    const projectInfo = document.createElement('div')
    projectInfo.className = 'project-info'

    const projectTitle = document.createElement('span')
    projectTitle.textContent = project.label

    const manageButton = document.createElement('a')
    manageButton.className = 'manage-btn'
    manageButton.textContent = 'Manage'
    manageButton.href = `${TPEN.BASEURL}/project/manage?projectID=${project._id}`

    projectInfo.appendChild(projectTitle)
    projectInfo.appendChild(manageButton)

    this.projectInfoContainer.appendChild(projectInfo)
  }
}

customElements.define('tpen-project-importer', ProjectImporter)
