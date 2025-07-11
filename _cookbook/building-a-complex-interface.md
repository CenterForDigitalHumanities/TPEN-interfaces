---
title: Building a Complex Interface - TPEN Cookbook
description: Advanced patterns for building full-featured TPEN interfaces
author: <cubap@slu.edu>
layout: default
tags: [tpen, api, javascript, interface, advanced, project, transcription]
---

## Use Case

You want to build a comprehensive interface that manages projects, handles user authentication, works with permissions, and provides transcription capabilities. This interface will demonstrate advanced patterns used in production TPEN applications.

## Implementation Notes

Complex interfaces typically involve multiple components working together, state management across components, and integration with multiple TPEN API classes. This recipe shows how to build a project management interface with transcription capabilities.

## Key Components

### 1. Authentication and User Management

First, establish authentication and track user state across your application:

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class ProjectManager extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    
    // Listen for authentication events
    TPEN.eventDispatcher.on('tpen-user-authenticated', (user) => {
      this.handleUserLogin(user)
    })
    
    TPEN.eventDispatcher.on('tpen-project-loaded', (project) => {
      this.handleProjectLoad(project)
    })
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    this.render()
  }
  
  async handleUserLogin(user) {
    // Load user's projects
    const projects = await TPEN.currentUser.getProjects()
    this.updateProjectList(projects)
    
    // Check user permissions
    const permissions = await this.checkUserPermissions()
    this.updateUIBasedOnPermissions(permissions)
  }
}
```

### 2. Project Management with Permissions

Handle project operations with proper permission checking:

```javascript
async checkUserPermissions() {
  if (!TPEN.currentUser) return {}
  
  const permissions = {
    canCreateProject: await TPEN.currentUser.hasPermission('create-project'),
    canManageUsers: await TPEN.currentUser.hasPermission('manage-users'),
    canModifyTranscriptions: await TPEN.currentUser.hasPermission('modify-transcriptions'),
    canViewAll: await TPEN.currentUser.hasPermission('view-all')
  }
  
  return permissions
}

async createNewProject(projectData) {
  try {
    const permissions = await this.checkUserPermissions()
    if (!permissions.canCreateProject) {
      throw new Error('Insufficient permissions to create project')
    }
    
    const newProject = await TPEN.Project.create(projectData)
    
    // Dispatch success event
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: 'Project created successfully',
      type: 'success'
    })
    
    return newProject
  } catch (error) {
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `Error creating project: ${error.message}`,
      type: 'error'
    })
    throw error
  }
}
```

### 3. Multi-Component State Management

Coordinate state between multiple components:

```javascript
class TranscriptionWorkspace extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.state = {
      currentProject: null,
      selectedPage: null,
      transcriptionMode: 'edit',
      unsavedChanges: false
    }
  }
  
  connectedCallback() {
    this.render()
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    // Listen for project changes
    TPEN.eventDispatcher.on('tpen-project-loaded', (project) => {
      this.updateState({ currentProject: project })
    })
    
    // Listen for page selection
    this.addEventListener('page-selected', (event) => {
      this.updateState({ selectedPage: event.detail.page })
    })
    
    // Listen for transcription changes
    this.addEventListener('transcription-changed', (event) => {
      this.updateState({ unsavedChanges: true })
      this.autoSave()
    })
  }
  
  updateState(newState) {
    this.state = { ...this.state, ...newState }
    this.render()
  }
  
  async autoSave() {
    if (!this.state.unsavedChanges) return
    
    try {
      await this.saveCurrentTranscription()
      this.updateState({ unsavedChanges: false })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }
}
```

### 4. Advanced API Integration

Work with multiple API classes and handle complex data flows:

```javascript
class ProjectDashboard extends HTMLElement {
  async loadProjectData(projectId) {
    try {
      // Load project details
      const project = await TPEN.Project.load(projectId)
      
      // Load related data in parallel
      const [collaborators, permissions, pages, metadata] = await Promise.all([
        project.getCollaborators(),
        project.getPermissions(),
        project.getPages(),
        project.getMetadata()
      ])
      
      // Update UI with all data
      this.updateProjectView({
        project,
        collaborators,
        permissions,
        pages,
        metadata
      })
      
    } catch (error) {
      this.handleError('Failed to load project data', error)
    }
  }
  
  async manageProjectCollaborators(projectId, action, userData) {
    const project = await TPEN.Project.load(projectId)
    
    switch (action) {
      case 'add':
        await project.addCollaborator(userData.email, userData.role)
        break
      case 'remove':
        await project.removeCollaborator(userData.userId)
        break
      case 'updateRole':
        await project.updateCollaboratorRole(userData.userId, userData.newRole)
        break
    }
    
    // Refresh collaborator list
    const updatedCollaborators = await project.getCollaborators()
    this.updateCollaboratorList(updatedCollaborators)
  }
}
```

### 5. Error Handling and User Feedback

Implement comprehensive error handling:

```javascript
class ErrorHandler {
  static handleAPIError(error, context) {
    let message = 'An unexpected error occurred'
    
    switch (error.status) {
      case 401:
        message = 'Authentication required. Please log in.'
        // Redirect to login
        TPEN.attachAuthentication(document.body)
        break
      case 403:
        message = 'Permission denied. You don\'t have access to this resource.'
        break
      case 404:
        message = 'Resource not found.'
        break
      case 500:
        message = 'Server error. Please try again later.'
        break
      default:
        message = error.message || message
    }
    
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `${context}: ${message}`,
      type: 'error'
    })
  }
}
```

## Complete Example

Here's a complete example that combines all these patterns:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Advanced TPEN Interface</title>
    <script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
    <script src="advanced-project-manager.js" type="module"></script>
</head>
<body>
    <advanced-project-manager></advanced-project-manager>
</body>
</html>
```

```javascript
// advanced-project-manager.js
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class AdvancedProjectManager extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.state = {
      user: null,
      projects: [],
      selectedProject: null,
      permissions: {},
      loading: false
    }
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    this.setupEventListeners()
    this.render()
  }
  
  setupEventListeners() {
    TPEN.eventDispatcher.on('tpen-user-authenticated', async (user) => {
      this.updateState({ user, loading: true })
      await this.loadUserData()
      this.updateState({ loading: false })
    })
  }
  
  async loadUserData() {
    try {
      const [projects, permissions] = await Promise.all([
        TPEN.currentUser.getProjects(),
        this.loadUserPermissions()
      ])
      
      this.updateState({ projects, permissions })
    } catch (error) {
      this.handleError('Failed to load user data', error)
    }
  }
  
  async loadUserPermissions() {
    // Implementation depends on your permission system
    return {
      canCreateProject: true,
      canManageUsers: false,
      canModifyTranscriptions: true
    }
  }
  
  updateState(newState) {
    this.state = { ...this.state, ...newState }
    this.render()
  }
  
  handleError(context, error) {
    console.error(context, error)
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `${context}: ${error.message}`,
      type: 'error'
    })
  }
  
  render() {
    const { user, projects, selectedProject, permissions, loading } = this.state
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .loading { opacity: 0.6; }
        .project-card {
          border: 1px solid #ddd;
          padding: 1rem;
          margin: 0.5rem 0;
          border-radius: 4px;
        }
        .permissions-badge {
          background: #e7f3ff;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8rem;
        }
      </style>
      
      <div class="${loading ? 'loading' : ''}">
        ${!user ? '<p>Please log in to access your projects.</p>' : `
          <h2>Welcome, ${user.displayName || user.email}</h2>
          
          <div class="permissions">
            <h3>Your Permissions</h3>
            ${Object.entries(permissions).map(([key, value]) => 
              `<span class="permissions-badge">${key}: ${value ? 'Yes' : 'No'}</span>`
            ).join(' ')}
          </div>
          
          <div class="projects">
            <h3>Your Projects</h3>
            ${projects.length === 0 ? '<p>No projects found.</p>' : 
              projects.map(project => `
                <div class="project-card">
                  <h4>${project.title}</h4>
                  <p>${project.description}</p>
                  <button onclick="this.getRootNode().host.selectProject('${project.id}')">
                    Open Project
                  </button>
                </div>
              `).join('')
            }
          </div>
          
          ${permissions.canCreateProject ? `
            <button onclick="this.getRootNode().host.createProject()">
              Create New Project
            </button>
          ` : ''}
        `}
      </div>
    `
  }
  
  async selectProject(projectId) {
    try {
      this.updateState({ loading: true })
      const project = await TPEN.Project.load(projectId)
      this.updateState({ selectedProject: project, loading: false })
      
      // Dispatch project loaded event
      TPEN.eventDispatcher.dispatch('tpen-project-loaded', project)
    } catch (error) {
      this.handleError('Failed to load project', error)
      this.updateState({ loading: false })
    }
  }
  
  async createProject() {
    const title = prompt('Enter project title:')
    if (!title) return
    
    try {
      this.updateState({ loading: true })
      const project = await TPEN.Project.create({ title })
      
      // Reload projects list
      await this.loadUserData()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Project created successfully',
        type: 'success'
      })
    } catch (error) {
      this.handleError('Failed to create project', error)
      this.updateState({ loading: false })
    }
  }
}

customElements.define('advanced-project-manager', AdvancedProjectManager)
```

## Key Patterns Demonstrated

1. **State Management**: Centralized state with immutable updates
2. **Event-Driven Architecture**: Use TPEN's event system for component communication
3. **Permission-Based UI**: Show/hide features based on user permissions
4. **Error Handling**: Comprehensive error handling with user feedback
5. **Async Operations**: Proper handling of asynchronous API calls
6. **Component Communication**: Multiple components working together
7. **User Experience**: Loading states, feedback, and progressive enhancement

## Related Recipes

* [Building a Simple Interface](building-a-simple-interface.html)
* [User Authentication and Permissions](user-authentication-permissions.html)
* [Project Management Workflows](project-management-workflows.html)
* [Transcription Interface Patterns](transcription-interface-patterns.html)