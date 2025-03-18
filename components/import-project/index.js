import TPEN from "../../api/TPEN.js"

class ProjectImporter extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
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
          <label for="url">Manifest URL:</label>
          <input type="url" id="url" placeholder="Enter manifest URL..." />
          <button id="submit">Import Project</button>
          <div id="feedback" class="feedback"></div>
          <div id="project-info-container"></div>
        </div>
      `

    this.urlInput = this.shadowRoot.querySelector('#url')
    this.submitButton = this.shadowRoot.querySelector('#submit')
    this.feedback = this.shadowRoot.querySelector('#feedback')
    this.projectInfoContainer = this.shadowRoot.querySelector('#project-info-container')

    this.submitButton.addEventListener('click', this.handleImport.bind(this))
  }
  setLoadingState(isLoading) {
    if (isLoading) {
      this.feedback.textContent = 'Importing project, please wait...'
      this.feedback.className = 'loading'
      this.submitButton.disabled = true
    } else {
      this.feedback.textContent = ''
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
    }
  }

  displayProjectInfo(project) {
    const projectInfo = document.createElement('div')
    projectInfo.className = 'project-info'

    const projectTitle = document.createElement('span')
    projectTitle.textContent = project.label

    const manageButton = document.createElement('button')
    manageButton.className = 'manage-btn'
    manageButton.textContent = 'Manage'
    manageButton.onclick = () => {
      alert(`Navigating to manage project: ${project.label}`)
      window.location.href = `/manage/?projectID=${project._id}`
    }

    projectInfo.appendChild(projectTitle)
    projectInfo.appendChild(manageButton)

    this.projectInfoContainer.appendChild(projectInfo)
  }
}

customElements.define('tpen-project-importer', ProjectImporter)
