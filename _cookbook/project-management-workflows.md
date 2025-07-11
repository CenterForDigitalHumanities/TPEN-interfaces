---
title: Project Management Workflows - TPEN Cookbook
description: Comprehensive guide to managing TPEN projects through their lifecycle
author: <cubap@slu.edu>
layout: default
tags: [tpen, project, management, workflow, api, collaboration]
---

## Use Case

You need to implement comprehensive project management functionality, including creating projects, managing collaborators, setting up permissions, organizing content, and tracking progress. This covers the complete project lifecycle from creation to completion.

## Implementation Notes

TPEN projects are complex entities that contain pages, annotations, user permissions, and metadata. This recipe demonstrates how to build interfaces that can manage all aspects of a project effectively.

## Project Creation and Setup

### 1. Create New Project with Configuration

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class ProjectCreator extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.projectTemplates = [
      {
        id: 'transcription',
        name: 'Transcription Project',
        description: 'Standard transcription workflow',
        defaultSettings: {
          allowLineBreaks: true,
          autoSave: true,
          collaborativeEditing: false
        }
      },
      {
        id: 'classroom',
        name: 'Classroom Project',
        description: 'Educational project with student access',
        defaultSettings: {
          allowLineBreaks: true,
          autoSave: true,
          collaborativeEditing: true,
          submissionDeadline: true
        }
      },
      {
        id: 'research',
        name: 'Research Project',
        description: 'Research-focused with metadata tracking',
        defaultSettings: {
          allowLineBreaks: true,
          autoSave: true,
          collaborativeEditing: true,
          metadataRequired: true
        }
      }
    ]
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    this.render()
  }
  
  async createProject(projectData) {
    try {
      // Validate user permissions
      const canCreate = await this.checkCreatePermission()
      if (!canCreate) {
        throw new Error('Insufficient permissions to create project')
      }
      
      // Create project with TPEN API
      const project = await TPEN.Project.create({
        title: projectData.title,
        description: projectData.description,
        template: projectData.template,
        settings: projectData.settings,
        metadata: projectData.metadata
      })
      
      // Set up initial collaborators if specified
      if (projectData.collaborators && projectData.collaborators.length > 0) {
        await this.addInitialCollaborators(project, projectData.collaborators)
      }
      
      // Configure project settings
      await this.configureProjectSettings(project, projectData.settings)
      
      // Dispatch success event
      this.dispatchEvent(new CustomEvent('project-created', {
        detail: { project }
      }))
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Project created successfully',
        type: 'success'
      })
      
      return project
    } catch (error) {
      this.handleError('Failed to create project', error)
      throw error
    }
  }
  
  async checkCreatePermission() {
    // Check if user has permission to create projects
    if (!TPEN.currentUser) return false
    
    try {
      return await TPEN.currentUser.hasPermission('create-project')
    } catch (error) {
      console.error('Permission check failed:', error)
      return false
    }
  }
  
  async addInitialCollaborators(project, collaborators) {
    for (const collaborator of collaborators) {
      try {
        await project.addCollaborator(collaborator.email, collaborator.role)
      } catch (error) {
        console.warn(`Failed to add collaborator ${collaborator.email}:`, error)
      }
    }
  }
  
  async configureProjectSettings(project, settings) {
    try {
      await project.updateSettings(settings)
    } catch (error) {
      console.error('Failed to configure project settings:', error)
    }
  }
  
  handleError(context, error) {
    console.error(context, error)
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `${context}: ${error.message}`,
      type: 'error'
    })
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .project-creator {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        .template-selector {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .template-option {
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .template-option:hover {
          border-color: #007bff;
        }
        .template-option.selected {
          border-color: #007bff;
          background-color: #f0f8ff;
        }
        .collaborator-list {
          margin-top: 0.5rem;
        }
        .collaborator-item {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        .collaborator-item input {
          flex: 1;
        }
        .collaborator-item select {
          width: 120px;
        }
        .add-collaborator {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 3px;
          cursor: pointer;
        }
        .create-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        .create-btn:hover {
          background: #0056b3;
        }
      </style>
      
      <div class="project-creator">
        <h2>Create New Project</h2>
        
        <form id="projectForm">
          <div class="form-group">
            <label for="title">Project Title *</label>
            <input type="text" id="title" name="title" required>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="3" 
                      placeholder="Describe your project..."></textarea>
          </div>
          
          <div class="form-group">
            <label>Project Template</label>
            <div class="template-selector">
              ${this.projectTemplates.map((template, index) => `
                <div class="template-option ${index === 0 ? 'selected' : ''}" 
                     data-template="${template.id}">
                  <h4>${template.name}</h4>
                  <p>${template.description}</p>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="form-group">
            <label>Initial Collaborators</label>
            <div class="collaborator-list" id="collaboratorList">
              <div class="collaborator-item">
                <input type="email" placeholder="Email address">
                <select>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" onclick="this.parentElement.remove()">Remove</button>
              </div>
            </div>
            <button type="button" class="add-collaborator" onclick="this.getRootNode().host.addCollaboratorField()">
              Add Collaborator
            </button>
          </div>
          
          <button type="submit" class="create-btn">Create Project</button>
        </form>
      </div>
    `
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    const form = this.shadowRoot.querySelector('#projectForm')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleFormSubmit(e)
    })
    
    // Template selection
    const templateOptions = this.shadowRoot.querySelectorAll('.template-option')
    templateOptions.forEach(option => {
      option.addEventListener('click', () => {
        templateOptions.forEach(opt => opt.classList.remove('selected'))
        option.classList.add('selected')
      })
    })
  }
  
  addCollaboratorField() {
    const collaboratorList = this.shadowRoot.querySelector('#collaboratorList')
    const newField = document.createElement('div')
    newField.className = 'collaborator-item'
    newField.innerHTML = `
      <input type="email" placeholder="Email address">
      <select>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>
      <button type="button" onclick="this.parentElement.remove()">Remove</button>
    `
    collaboratorList.appendChild(newField)
  }
  
  async handleFormSubmit(event) {
    const formData = new FormData(event.target)
    const selectedTemplate = this.shadowRoot.querySelector('.template-option.selected')
    
    // Collect collaborators
    const collaboratorItems = this.shadowRoot.querySelectorAll('.collaborator-item')
    const collaborators = Array.from(collaboratorItems)
      .map(item => {
        const email = item.querySelector('input[type="email"]').value
        const role = item.querySelector('select').value
        return email ? { email, role } : null
      })
      .filter(Boolean)
    
    const projectData = {
      title: formData.get('title'),
      description: formData.get('description'),
      template: selectedTemplate.dataset.template,
      collaborators,
      settings: this.getTemplateSettings(selectedTemplate.dataset.template),
      metadata: {
        createdAt: new Date().toISOString(),
        template: selectedTemplate.dataset.template
      }
    }
    
    try {
      await this.createProject(projectData)
      event.target.reset()
    } catch (error) {
      // Error already handled in createProject
    }
  }
  
  getTemplateSettings(templateId) {
    const template = this.projectTemplates.find(t => t.id === templateId)
    return template ? template.defaultSettings : {}
  }
}

customElements.define('tpen-project-creator', ProjectCreator)
```

### 2. Project Overview Dashboard

```javascript
class ProjectDashboard extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentProject = null
    this.projectStats = null
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-project-loaded', async (project) => {
      this.currentProject = project
      await this.loadProjectStats()
      this.render()
    })
    
    this.render()
  }
  
  async loadProjectStats() {
    if (!this.currentProject) return
    
    try {
      const [pages, collaborators, annotations, activity] = await Promise.all([
        this.currentProject.getPages(),
        this.currentProject.getCollaborators(),
        this.currentProject.getAnnotations(),
        this.currentProject.getRecentActivity()
      ])
      
      this.projectStats = {
        totalPages: pages.length,
        completedPages: pages.filter(p => p.status === 'complete').length,
        totalCollaborators: collaborators.length,
        totalAnnotations: annotations.length,
        recentActivity: activity.slice(0, 10)
      }
      
      this.render()
    } catch (error) {
      console.error('Failed to load project stats:', error)
    }
  }
  
  render() {
    if (!this.currentProject) {
      this.shadowRoot.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <p>No project selected. Please select a project to view its dashboard.</p>
        </div>
      `
      return
    }
    
    const stats = this.projectStats
    const project = this.currentProject
    
    this.shadowRoot.innerHTML = `
      <style>
        .dashboard {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #eee;
        }
        .project-title {
          margin: 0;
          color: #333;
        }
        .project-actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .primary-btn { background: #007bff; color: white; }
        .secondary-btn { background: #6c757d; color: white; }
        .success-btn { background: #28a745; color: white; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e0e0e0;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          color: #6c757d;
          font-size: 0.9rem;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 0.5rem;
        }
        .progress-fill {
          height: 100%;
          background: #28a745;
          transition: width 0.3s ease;
        }
        .content-sections {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }
        .section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .section h3 {
          margin-top: 0;
          color: #333;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-time {
          color: #6c757d;
          font-size: 0.8rem;
        }
      </style>
      
      <div class="dashboard">
        <div class="project-header">
          <div>
            <h1 class="project-title">${project.title}</h1>
            <p>${project.description || 'No description provided'}</p>
          </div>
          <div class="project-actions">
            <a href="/interfaces/transcription/?project=${project.id}" class="action-btn primary-btn">
              Open Transcription
            </a>
            <button class="action-btn secondary-btn" onclick="this.getRootNode().host.manageProject()">
              Manage Project
            </button>
            <button class="action-btn success-btn" onclick="this.getRootNode().host.exportProject()">
              Export
            </button>
          </div>
        </div>
        
        ${stats ? `
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${stats.totalPages}</div>
              <div class="stat-label">Total Pages</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.completedPages}</div>
              <div class="stat-label">Completed Pages</div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(stats.completedPages / stats.totalPages * 100) || 0}%"></div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.totalCollaborators}</div>
              <div class="stat-label">Collaborators</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.totalAnnotations}</div>
              <div class="stat-label">Annotations</div>
            </div>
          </div>
          
          <div class="content-sections">
            <div class="section">
              <h3>Project Overview</h3>
              <p><strong>Created:</strong> ${new Date(project.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${project.status || 'Active'}</p>
              <p><strong>Progress:</strong> ${stats.completedPages}/${stats.totalPages} pages completed</p>
            </div>
            
            <div class="section">
              <h3>Recent Activity</h3>
              ${stats.recentActivity.length > 0 ? stats.recentActivity.map(activity => `
                <div class="activity-item">
                  <div>
                    <div>${activity.description}</div>
                    <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              `).join('') : '<p>No recent activity</p>'}
            </div>
          </div>
        ` : '<p>Loading project statistics...</p>'}
      </div>
    `
  }
  
  manageProject() {
    // Navigate to project management interface
    window.location.href = `/interfaces/manage-project/?project=${this.currentProject.id}`
  }
  
  async exportProject() {
    try {
      const exportData = await this.currentProject.export()
      
      // Create download link
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.currentProject.title}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Project exported successfully',
        type: 'success'
      })
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Export failed: ${error.message}`,
        type: 'error'
      })
    }
  }
}

customElements.define('tpen-project-dashboard', ProjectDashboard)
```

### 3. Collaborator Management

```javascript
class CollaboratorManager extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentProject = null
    this.collaborators = []
    this.availableRoles = [
      { id: 'viewer', name: 'Viewer', permissions: ['view'] },
      { id: 'editor', name: 'Editor', permissions: ['view', 'edit'] },
      { id: 'admin', name: 'Admin', permissions: ['view', 'edit', 'manage'] }
    ]
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-project-loaded', async (project) => {
      this.currentProject = project
      await this.loadCollaborators()
    })
    
    this.render()
  }
  
  async loadCollaborators() {
    if (!this.currentProject) return
    
    try {
      this.collaborators = await this.currentProject.getCollaborators()
      this.render()
    } catch (error) {
      console.error('Failed to load collaborators:', error)
    }
  }
  
  async addCollaborator(email, role) {
    try {
      await this.currentProject.addCollaborator(email, role)
      await this.loadCollaborators()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Collaborator ${email} added successfully`,
        type: 'success'
      })
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to add collaborator: ${error.message}`,
        type: 'error'
      })
    }
  }
  
  async removeCollaborator(userId) {
    try {
      await this.currentProject.removeCollaborator(userId)
      await this.loadCollaborators()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Collaborator removed successfully',
        type: 'success'
      })
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to remove collaborator: ${error.message}`,
        type: 'error'
      })
    }
  }
  
  async updateCollaboratorRole(userId, newRole) {
    try {
      await this.currentProject.updateCollaboratorRole(userId, newRole)
      await this.loadCollaborators()
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Collaborator role updated successfully',
        type: 'success'
      })
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: `Failed to update role: ${error.message}`,
        type: 'error'
      })
    }
  }
  
  render() {
    if (!this.currentProject) {
      this.shadowRoot.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <p>No project selected. Please select a project to manage collaborators.</p>
        </div>
      `
      return
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        .collaborator-manager {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .add-collaborator {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #e0e0e0;
        }
        .add-form {
          display: flex;
          gap: 1rem;
          align-items: end;
        }
        .form-group {
          flex: 1;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .add-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          white-space: nowrap;
        }
        .collaborators-list {
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .collaborator-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .collaborator-item:last-child {
          border-bottom: none;
        }
        .collaborator-info {
          flex: 1;
        }
        .collaborator-name {
          font-weight: bold;
          margin-bottom: 0.25rem;
        }
        .collaborator-email {
          color: #6c757d;
          font-size: 0.9rem;
        }
        .collaborator-role {
          padding: 0.25rem 0.75rem;
          background: #e7f3ff;
          border-radius: 12px;
          font-size: 0.8rem;
          margin: 0 1rem;
        }
        .collaborator-actions {
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .edit-btn { background: #ffc107; color: black; }
        .remove-btn { background: #dc3545; color: white; }
        .role-editor {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .role-editor select {
          padding: 0.25rem;
          border: 1px solid #ddd;
          border-radius: 3px;
        }
        .save-btn { background: #28a745; color: white; }
        .cancel-btn { background: #6c757d; color: white; }
      </style>
      
      <div class="collaborator-manager">
        <h2>Manage Collaborators</h2>
        
        <div class="add-collaborator">
          <h3>Add New Collaborator</h3>
          <form class="add-form" id="addCollaboratorForm">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="role">Role</label>
              <select id="role" name="role">
                ${this.availableRoles.map(role => `
                  <option value="${role.id}">${role.name}</option>
                `).join('')}
              </select>
            </div>
            <button type="submit" class="add-btn">Add Collaborator</button>
          </form>
        </div>
        
        <div class="collaborators-list">
          <h3 style="padding: 1rem; margin: 0; border-bottom: 1px solid #f0f0f0;">
            Current Collaborators (${this.collaborators.length})
          </h3>
          
          ${this.collaborators.length === 0 ? `
            <div style="padding: 2rem; text-align: center; color: #6c757d;">
              No collaborators added yet
            </div>
          ` : this.collaborators.map(collaborator => `
            <div class="collaborator-item" data-user-id="${collaborator.id}">
              <div class="collaborator-info">
                <div class="collaborator-name">${collaborator.displayName || collaborator.email}</div>
                <div class="collaborator-email">${collaborator.email}</div>
              </div>
              
              <div class="collaborator-role" id="role-${collaborator.id}">
                ${collaborator.role}
              </div>
              
              <div class="collaborator-actions" id="actions-${collaborator.id}">
                <button class="action-btn edit-btn" onclick="this.getRootNode().host.editRole('${collaborator.id}')">
                  Edit Role
                </button>
                <button class="action-btn remove-btn" onclick="this.getRootNode().host.confirmRemoveCollaborator('${collaborator.id}')">
                  Remove
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    const form = this.shadowRoot.querySelector('#addCollaboratorForm')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleAddCollaborator(e)
    })
  }
  
  async handleAddCollaborator(event) {
    const formData = new FormData(event.target)
    const email = formData.get('email')
    const role = formData.get('role')
    
    await this.addCollaborator(email, role)
    event.target.reset()
  }
  
  editRole(userId) {
    const roleElement = this.shadowRoot.querySelector(`#role-${userId}`)
    const actionsElement = this.shadowRoot.querySelector(`#actions-${userId}`)
    
    const currentRole = roleElement.textContent
    
    roleElement.innerHTML = `
      <div class="role-editor">
        <select id="newRole-${userId}">
          ${this.availableRoles.map(role => `
            <option value="${role.id}" ${role.id === currentRole ? 'selected' : ''}>
              ${role.name}
            </option>
          `).join('')}
        </select>
      </div>
    `
    
    actionsElement.innerHTML = `
      <button class="action-btn save-btn" onclick="this.getRootNode().host.saveRole('${userId}')">
        Save
      </button>
      <button class="action-btn cancel-btn" onclick="this.getRootNode().host.cancelEdit('${userId}')">
        Cancel
      </button>
    `
  }
  
  async saveRole(userId) {
    const newRoleSelect = this.shadowRoot.querySelector(`#newRole-${userId}`)
    const newRole = newRoleSelect.value
    
    await this.updateCollaboratorRole(userId, newRole)
  }
  
  cancelEdit(userId) {
    // Re-render to cancel edit mode
    this.render()
  }
  
  confirmRemoveCollaborator(userId) {
    const collaborator = this.collaborators.find(c => c.id === userId)
    if (confirm(`Are you sure you want to remove ${collaborator.displayName || collaborator.email} from this project?`)) {
      this.removeCollaborator(userId)
    }
  }
}

customElements.define('tpen-collaborator-manager', CollaboratorManager)
```

## Complete Project Management Example

Here's a complete HTML page that demonstrates all project management concepts:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>TPEN Project Management</title>
    <script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
    <script src="project-management.js" type="module"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .tabs {
            display: flex;
            background: white;
            border-radius: 8px 8px 0 0;
            border: 1px solid #ddd;
            border-bottom: none;
        }
        .tab {
            padding: 1rem 2rem;
            cursor: pointer;
            border-right: 1px solid #ddd;
            background: #f8f9fa;
        }
        .tab.active {
            background: white;
            border-bottom: 1px solid white;
            margin-bottom: -1px;
        }
        .tab-content {
            background: white;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
            min-height: 400px;
        }
        .tab-panel {
            display: none;
        }
        .tab-panel.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>TPEN Project Management</h1>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('dashboard')">Dashboard</div>
            <div class="tab" onclick="showTab('create')">Create Project</div>
            <div class="tab" onclick="showTab('collaborators')">Collaborators</div>
        </div>
        
        <div class="tab-content">
            <div id="dashboard" class="tab-panel active">
                <tpen-project-dashboard></tpen-project-dashboard>
            </div>
            
            <div id="create" class="tab-panel">
                <tpen-project-creator></tpen-project-creator>
            </div>
            
            <div id="collaborators" class="tab-panel">
                <tpen-collaborator-manager></tpen-collaborator-manager>
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tab panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active')
            })
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active')
            })
            
            // Show selected tab panel
            document.getElementById(tabName).classList.add('active')
            
            // Mark selected tab as active
            event.target.classList.add('active')
        }
    </script>
</body>
</html>
```

## Key Features Demonstrated

1. **Project Creation**: Template-based project creation with settings
2. **Dashboard**: Overview of project statistics and progress
3. **Collaborator Management**: Add, remove, and manage user roles
4. **Permission Handling**: Role-based access control
5. **Error Handling**: Comprehensive error handling with user feedback
6. **Real-time Updates**: Live updates of project data
7. **Export Functionality**: Project data export capabilities

## Related Recipes

* [Building a Simple Interface](building-a-simple-interface.html)
* [User Authentication and Permissions](user-authentication-permissions.html)
* [Classroom Group Management](classroom-group-management.html)
* [Transcription Interface Patterns](transcription-interface-patterns.html)