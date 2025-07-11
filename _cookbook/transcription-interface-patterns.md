---
title: Transcription Interface Patterns - TPEN Cookbook
description: Building specialized transcription interfaces with TPEN components
author: <cubap@slu.edu>
layout: default
tags: [tpen, transcription, interface, patterns, annotation, components]
---

## Use Case

You need to build specialized transcription interfaces that go beyond basic text entry. This includes interfaces for poetry transcription, manuscript annotation, multi-language support, collaborative editing, and specialized markup tools.

## Implementation Notes

TPEN's transcription system is built around flexible annotation patterns that can support various text types and scholarly needs. This recipe demonstrates how to create custom transcription interfaces using TPEN's component system.

## Basic Transcription Interface

### 1. Simple Text Transcription

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class BasicTranscriptionInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentProject = null
    this.currentPage = null
    this.currentRegion = null
    this.unsavedChanges = false
    this.autoSaveInterval = null
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    // Listen for project and page changes
    TPEN.eventDispatcher.on('tpen-project-loaded', (project) => {
      this.currentProject = project
      this.loadFirstPage()
    })
    
    TPEN.eventDispatcher.on('page-selected', (page) => {
      this.currentPage = page
      this.loadPageRegions()
    })
    
    // Start auto-save
    this.startAutoSave()
    
    this.render()
  }
  
  disconnectedCallback() {
    this.stopAutoSave()
  }
  
  async loadFirstPage() {
    if (!this.currentProject) return
    
    try {
      const pages = await this.currentProject.getPages()
      if (pages.length > 0) {
        this.currentPage = pages[0]
        await this.loadPageRegions()
      }
    } catch (error) {
      console.error('Failed to load first page:', error)
    }
  }
  
  async loadPageRegions() {
    if (!this.currentPage) return
    
    try {
      const regions = await this.currentPage.getRegions()
      this.regions = regions
      this.render()
    } catch (error) {
      console.error('Failed to load page regions:', error)
    }
  }
  
  async updateTranscription(regionId, text) {
    try {
      const region = this.regions.find(r => r.id === regionId)
      if (!region) return
      
      await region.updateTranscription(text)
      this.unsavedChanges = true
      
      // Dispatch change event
      this.dispatchEvent(new CustomEvent('transcription-changed', {
        detail: { regionId, text }
      }))
      
    } catch (error) {
      console.error('Failed to update transcription:', error)
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Failed to save transcription',
        type: 'error'
      })
    }
  }
  
  startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.unsavedChanges) {
        this.saveAll()
      }
    }, 30000) // Auto-save every 30 seconds
  }
  
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
  }
  
  async saveAll() {
    try {
      // Save is handled by individual updateTranscription calls
      this.unsavedChanges = false
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Transcriptions saved',
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }
  
  render() {
    if (!this.currentProject) {
      this.shadowRoot.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <p>Please load a project to begin transcription.</p>
        </div>
      `
      return
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        .transcription-interface {
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 100vh;
          gap: 1rem;
          padding: 1rem;
        }
        .image-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background: #f8f9fa;
        }
        .image-container {
          position: relative;
          height: 100%;
          overflow: auto;
        }
        .page-image {
          max-width: 100%;
          height: auto;
          display: block;
        }
        .region-overlay {
          position: absolute;
          border: 2px solid #007bff;
          background: rgba(0, 123, 255, 0.1);
          cursor: pointer;
        }
        .region-overlay:hover {
          background: rgba(0, 123, 255, 0.2);
        }
        .region-overlay.selected {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.1);
        }
        .transcription-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          overflow-y: auto;
        }
        .transcription-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eee;
        }
        .page-title {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
        }
        .save-status {
          font-size: 0.9rem;
          color: #666;
        }
        .save-status.unsaved {
          color: #dc3545;
        }
        .region-transcription {
          margin-bottom: 1.5rem;
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        .region-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .region-number {
          font-weight: bold;
          color: #007bff;
        }
        .region-coords {
          font-size: 0.8rem;
          color: #666;
        }
        .transcription-textarea {
          width: 100%;
          min-height: 100px;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          font-size: 1rem;
          resize: vertical;
        }
        .transcription-textarea:focus {
          outline: none;
          border-color: #007bff;
        }
        .character-count {
          font-size: 0.8rem;
          color: #666;
          text-align: right;
          margin-top: 0.25rem;
        }
        .toolbar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .toolbar button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        }
        .toolbar button:hover {
          background: #f8f9fa;
        }
        .toolbar button.active {
          background: #007bff;
          color: white;
        }
      </style>
      
      <div class="transcription-interface">
        <div class="image-panel">
          <div class="image-container">
            ${this.currentPage ? `
              <img src="${this.currentPage.imageUrl}" alt="Page ${this.currentPage.number}" class="page-image">
              ${(this.regions || []).map((region, index) => `
                <div class="region-overlay ${this.currentRegion?.id === region.id ? 'selected' : ''}" 
                     style="left: ${region.x}px; top: ${region.y}px; width: ${region.width}px; height: ${region.height}px;"
                     onclick="this.getRootNode().host.selectRegion('${region.id}')"
                     title="Region ${index + 1}">
                </div>
              `).join('')}
            ` : '<div style="padding: 2rem; text-align: center;">No page loaded</div>'}
          </div>
        </div>
        
        <div class="transcription-panel">
          <div class="transcription-header">
            <div class="page-title">
              ${this.currentPage ? `Page ${this.currentPage.number}` : 'No Page Selected'}
            </div>
            <div class="save-status ${this.unsavedChanges ? 'unsaved' : ''}">
              ${this.unsavedChanges ? 'Unsaved changes' : 'All changes saved'}
            </div>
          </div>
          
          <div class="toolbar">
            <button onclick="this.getRootNode().host.saveAll()">Save All</button>
            <button onclick="this.getRootNode().host.exportTranscriptions()">Export</button>
            <button onclick="this.getRootNode().host.showHelp()">Help</button>
          </div>
          
          ${this.currentPage ? `
            <div class="regions-container">
              ${(this.regions || []).map((region, index) => `
                <div class="region-transcription" id="region-${region.id}">
                  <div class="region-header">
                    <span class="region-number">Region ${index + 1}</span>
                    <span class="region-coords">${region.x}, ${region.y} (${region.width}×${region.height})</span>
                  </div>
                  <textarea 
                    class="transcription-textarea" 
                    placeholder="Enter transcription for this region..."
                    oninput="this.getRootNode().host.handleTranscriptionInput('${region.id}', this.value)"
                    onkeydown="this.getRootNode().host.handleKeyDown(event, '${region.id}')"
                  >${region.transcription || ''}</textarea>
                  <div class="character-count">
                    ${(region.transcription || '').length} characters
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div style="padding: 2rem; text-align: center;">No regions to transcribe</div>'}
        </div>
      </div>
    `
  }
  
  selectRegion(regionId) {
    this.currentRegion = this.regions.find(r => r.id === regionId)
    this.render()
    
    // Focus on the textarea for this region
    setTimeout(() => {
      const textarea = this.shadowRoot.querySelector(`#region-${regionId} textarea`)
      if (textarea) {
        textarea.focus()
      }
    }, 100)
  }
  
  handleTranscriptionInput(regionId, value) {
    this.updateTranscription(regionId, value)
    
    // Update character count
    const regionElement = this.shadowRoot.querySelector(`#region-${regionId}`)
    const charCount = regionElement.querySelector('.character-count')
    charCount.textContent = `${value.length} characters`
  }
  
  handleKeyDown(event, regionId) {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 's') {
        event.preventDefault()
        this.saveAll()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        this.moveToNextRegion(regionId)
      }
    }
  }
  
  moveToNextRegion(currentRegionId) {
    const currentIndex = this.regions.findIndex(r => r.id === currentRegionId)
    const nextIndex = (currentIndex + 1) % this.regions.length
    const nextRegion = this.regions[nextIndex]
    
    if (nextRegion) {
      this.selectRegion(nextRegion.id)
    }
  }
  
  async exportTranscriptions() {
    try {
      const transcriptions = this.regions.map(region => ({
        regionId: region.id,
        coordinates: { x: region.x, y: region.y, width: region.width, height: region.height },
        transcription: region.transcription || ''
      }))
      
      const exportData = {
        projectId: this.currentProject.id,
        pageId: this.currentPage.id,
        pageNumber: this.currentPage.number,
        transcriptions,
        exportedAt: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcriptions-page-${this.currentPage.number}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Transcriptions exported successfully',
        type: 'success'
      })
    } catch (error) {
      TPEN.eventDispatcher.dispatch('tpen-toast', {
        message: 'Failed to export transcriptions',
        type: 'error'
      })
    }
  }
  
  showHelp() {
    const helpContent = `
      <h3>Transcription Interface Help</h3>
      <h4>Keyboard Shortcuts:</h4>
      <ul>
        <li><strong>Ctrl+S</strong> - Save all transcriptions</li>
        <li><strong>Ctrl+Enter</strong> - Move to next region</li>
      </ul>
      <h4>Usage:</h4>
      <ul>
        <li>Click on a region in the image to select it</li>
        <li>Type your transcription in the corresponding text area</li>
        <li>Changes are automatically saved every 30 seconds</li>
        <li>Use the toolbar buttons to save manually or export</li>
      </ul>
    `
    
    // Create a simple modal dialog
    const modal = document.createElement('div')
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
          ${helpContent}
          <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }
}

customElements.define('basic-transcription-interface', BasicTranscriptionInterface)
```

### 2. Advanced Poetry Transcription

```javascript
class PoetryTranscriptionInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentProject = null
    this.currentPage = null
    this.poetryFeatures = {
      lineBreaks: true,
      stanzaBreaks: true,
      scansion: true,
      rhymeScheme: true,
      annotations: true
    }
    this.scansionSymbols = {
      stressed: '´',
      unstressed: '˘',
      secondary: '`',
      caesura: '||'
    }
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-project-loaded', (project) => {
      this.currentProject = project
      this.loadFirstPage()
    })
    
    this.render()
  }
  
  insertPoetryMarkup(type, textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    let replacement = ''
    
    switch (type) {
      case 'lineBreak':
        replacement = selectedText + '\n'
        break
      case 'stanzaBreak':
        replacement = selectedText + '\n\n'
        break
      case 'stressed':
        replacement = selectedText + this.scansionSymbols.stressed
        break
      case 'unstressed':
        replacement = selectedText + this.scansionSymbols.unstressed
        break
      case 'caesura':
        replacement = selectedText + this.scansionSymbols.caesura
        break
      case 'annotation':
        replacement = `<note>${selectedText}</note>`
        break
    }
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)
    textarea.selectionStart = textarea.selectionEnd = start + replacement.length
    textarea.focus()
    
    // Trigger input event to save changes
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .poetry-interface {
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 100vh;
          gap: 1rem;
          padding: 1rem;
        }
        .image-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background: #f8f9fa;
        }
        .transcription-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          overflow-y: auto;
        }
        .poetry-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .toolbar-group {
          display: flex;
          gap: 0.25rem;
          border-right: 1px solid #ddd;
          padding-right: 0.5rem;
        }
        .toolbar-group:last-child {
          border-right: none;
        }
        .toolbar-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .toolbar-btn:hover {
          background: #e9ecef;
        }
        .toolbar-btn.active {
          background: #007bff;
          color: white;
        }
        .poetry-textarea {
          width: 100%;
          min-height: 400px;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Times New Roman', serif;
          font-size: 1.1rem;
          line-height: 1.6;
          resize: vertical;
        }
        .poetry-textarea:focus {
          outline: none;
          border-color: #007bff;
        }
        .scansion-guide {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        .scansion-symbols {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .symbol-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .symbol {
          font-size: 1.2rem;
          font-weight: bold;
        }
        .line-numbers {
          float: left;
          width: 30px;
          text-align: right;
          color: #666;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-right: 1rem;
        }
        .preview-panel {
          margin-top: 1rem;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fafafa;
        }
        .preview-content {
          font-family: 'Times New Roman', serif;
          font-size: 1.1rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }
      </style>
      
      <div class="poetry-interface">
        <div class="image-panel">
          ${this.currentPage ? `
            <img src="${this.currentPage.imageUrl}" alt="Page ${this.currentPage.number}" style="max-width: 100%; height: auto;">
          ` : '<div style="padding: 2rem; text-align: center;">No page loaded</div>'}
        </div>
        
        <div class="transcription-panel">
          <h3>Poetry Transcription</h3>
          
          <div class="poetry-toolbar">
            <div class="toolbar-group">
              <button class="toolbar-btn" onclick="this.getRootNode().host.insertPoetryMarkup('lineBreak', this.getRootNode().host.shadowRoot.querySelector('.poetry-textarea'))" title="Insert line break">
                Line Break
              </button>
              <button class="toolbar-btn" onclick="this.getRootNode().host.insertPoetryMarkup('stanzaBreak', this.getRootNode().host.shadowRoot.querySelector('.poetry-textarea'))" title="Insert stanza break">
                Stanza Break
              </button>
            </div>
            
            <div class="toolbar-group">
              <button class="toolbar-btn" onclick="this.getRootNode().host.insertPoetryMarkup('stressed', this.getRootNode().host.shadowRoot.querySelector('.poetry-textarea'))" title="Mark stressed syllable">
                Stressed (´)
              </button>
              <button class="toolbar-btn" onclick="this.getRootNode().host.insertPoetryMarkup('unstressed', this.getRootNode().host.shadowRoot.querySelector('.poetry-textarea'))" title="Mark unstressed syllable">
                Unstressed (˘)
              </button>
              <button class="toolbar-btn" onclick="this.getRootNode().host.insertPoetryMarkup('caesura', this.getRootNode().host.shadowRoot.querySelector('.poetry-textarea'))" title="Insert caesura">
                Caesura (||)
              </button>
            </div>
            
            <div class="toolbar-group">
              <button class="toolbar-btn" onclick="this.getRootNode().host.insertPoetryMarkup('annotation', this.getRootNode().host.shadowRoot.querySelector('.poetry-textarea'))" title="Add annotation">
                Annotate
              </button>
              <button class="toolbar-btn" onclick="this.getRootNode().host.togglePreview()" title="Toggle preview">
                Preview
              </button>
            </div>
          </div>
          
          <textarea 
            class="poetry-textarea" 
            placeholder="Enter your poetry transcription here. Use the toolbar buttons to add special formatting and scansion marks."
            oninput="this.getRootNode().host.handlePoetryInput(this.value)"
          ></textarea>
          
          <div class="scansion-guide">
            <strong>Scansion Guide:</strong>
            <div class="scansion-symbols">
              <div class="symbol-item">
                <span class="symbol">´</span>
                <span>Stressed</span>
              </div>
              <div class="symbol-item">
                <span class="symbol">˘</span>
                <span>Unstressed</span>
              </div>
              <div class="symbol-item">
                <span class="symbol">||</span>
                <span>Caesura</span>
              </div>
              <div class="symbol-item">
                <span class="symbol">&lt;note&gt;</span>
                <span>Annotation</span>
              </div>
            </div>
          </div>
          
          <div class="preview-panel" id="preview-panel" style="display: none;">
            <h4>Preview</h4>
            <div class="preview-content" id="preview-content"></div>
          </div>
        </div>
      </div>
    `
  }
  
  handlePoetryInput(value) {
    // Update preview if visible
    const previewPanel = this.shadowRoot.querySelector('#preview-panel')
    if (previewPanel.style.display !== 'none') {
      this.updatePreview(value)
    }
    
    // Save the transcription
    this.saveTranscription(value)
  }
  
  updatePreview(text) {
    const previewContent = this.shadowRoot.querySelector('#preview-content')
    
    // Process the text to show formatted preview
    let processedText = text
      .replace(/<note>(.*?)<\/note>/g, '<em style="color: #007bff; font-style: italic;">[$1]</em>')
      .replace(/\|\|/g, '<span style="color: #dc3545; font-weight: bold;">||</span>')
      .replace(/´/g, '<span style="color: #28a745; font-weight: bold;">´</span>')
      .replace(/˘/g, '<span style="color: #6c757d; font-weight: bold;">˘</span>')
    
    previewContent.innerHTML = processedText
  }
  
  togglePreview() {
    const previewPanel = this.shadowRoot.querySelector('#preview-panel')
    const textarea = this.shadowRoot.querySelector('.poetry-textarea')
    
    if (previewPanel.style.display === 'none') {
      previewPanel.style.display = 'block'
      this.updatePreview(textarea.value)
    } else {
      previewPanel.style.display = 'none'
    }
  }
  
  async saveTranscription(text) {
    try {
      if (this.currentPage) {
        await this.currentPage.updateTranscription(text)
      }
    } catch (error) {
      console.error('Failed to save poetry transcription:', error)
    }
  }
  
  async loadFirstPage() {
    if (!this.currentProject) return
    
    try {
      const pages = await this.currentProject.getPages()
      if (pages.length > 0) {
        this.currentPage = pages[0]
        this.render()
        
        // Load existing transcription
        const transcription = await this.currentPage.getTranscription()
        if (transcription) {
          const textarea = this.shadowRoot.querySelector('.poetry-textarea')
          textarea.value = transcription
        }
      }
    } catch (error) {
      console.error('Failed to load first page:', error)
    }
  }
}

customElements.define('poetry-transcription-interface', PoetryTranscriptionInterface)
```

### 3. Collaborative Transcription Interface

```javascript
class CollaborativeTranscriptionInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentProject = null
    this.currentPage = null
    this.collaborators = []
    this.activeUsers = new Map()
    this.changeHistory = []
    this.socket = null
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    
    TPEN.eventDispatcher.on('tpen-project-loaded', (project) => {
      this.currentProject = project
      this.initializeCollaboration()
    })
    
    TPEN.eventDispatcher.on('tpen-user-authenticated', (user) => {
      this.currentUser = user
    })
    
    this.render()
  }
  
  async initializeCollaboration() {
    if (!this.currentProject) return
    
    try {
      // Load collaborators
      this.collaborators = await this.currentProject.getCollaborators()
      
      // Initialize real-time collaboration
      this.initializeWebSocket()
      
      // Load change history
      await this.loadChangeHistory()
      
      this.render()
    } catch (error) {
      console.error('Failed to initialize collaboration:', error)
    }
  }
  
  initializeWebSocket() {
    // Initialize WebSocket connection for real-time collaboration
    this.socket = new WebSocket(`wss://api.t-pen.org/collaborate/${this.currentProject.id}`)
    
    this.socket.onopen = () => {
      console.log('Connected to collaboration server')
      this.sendUserPresence()
    }
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleCollaborationMessage(data)
    }
    
    this.socket.onclose = () => {
      console.log('Disconnected from collaboration server')
      // Attempt to reconnect
      setTimeout(() => this.initializeWebSocket(), 5000)
    }
  }
  
  sendUserPresence() {
    if (this.socket && this.currentUser) {
      this.socket.send(JSON.stringify({
        type: 'presence',
        user: {
          id: this.currentUser.id,
          name: this.currentUser.displayName,
          avatar: this.currentUser.avatar
        },
        timestamp: new Date().toISOString()
      }))
    }
  }
  
  handleCollaborationMessage(data) {
    switch (data.type) {
      case 'presence':
        this.updateUserPresence(data.user)
        break
      case 'transcription_change':
        this.handleRemoteTranscriptionChange(data)
        break
      case 'cursor_position':
        this.updateCursorPosition(data)
        break
      case 'user_left':
        this.removeUserPresence(data.userId)
        break
    }
  }
  
  updateUserPresence(user) {
    this.activeUsers.set(user.id, {
      ...user,
      lastSeen: new Date().toISOString()
    })
    this.updateActiveUsersDisplay()
  }
  
  removeUserPresence(userId) {
    this.activeUsers.delete(userId)
    this.updateActiveUsersDisplay()
  }
  
  updateActiveUsersDisplay() {
    const activeUsersElement = this.shadowRoot.querySelector('#active-users')
    if (!activeUsersElement) return
    
    const activeUsersList = Array.from(this.activeUsers.values())
      .filter(user => user.id !== this.currentUser?.id)
    
    activeUsersElement.innerHTML = `
      <h4>Active Users (${activeUsersList.length})</h4>
      ${activeUsersList.map(user => `
        <div class="active-user">
          <div class="user-avatar" style="background-color: ${this.getUserColor(user.id)}">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <span class="user-name">${user.name}</span>
          <span class="user-status">Online</span>
        </div>
      `).join('')}
    `
  }
  
  getUserColor(userId) {
    const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1']
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }
  
  handleRemoteTranscriptionChange(data) {
    if (data.userId === this.currentUser?.id) return // Ignore own changes
    
    // Apply remote change to the interface
    const textarea = this.shadowRoot.querySelector(`#region-${data.regionId} textarea`)
    if (textarea) {
      const currentCursor = textarea.selectionStart
      textarea.value = data.text
      
      // Show visual indicator of remote change
      this.showRemoteChangeIndicator(data.regionId, data.user)
      
      // Restore cursor position if user was typing
      if (document.activeElement === textarea) {
        textarea.selectionStart = textarea.selectionEnd = currentCursor
      }
    }
  }
  
  showRemoteChangeIndicator(regionId, user) {
    const regionElement = this.shadowRoot.querySelector(`#region-${regionId}`)
    if (!regionElement) return
    
    const indicator = document.createElement('div')
    indicator.className = 'remote-change-indicator'
    indicator.textContent = `${user.name} made changes`
    indicator.style.cssText = `
      position: absolute;
      top: -25px;
      right: 0;
      background: ${this.getUserColor(user.id)};
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      z-index: 10;
    `
    
    regionElement.style.position = 'relative'
    regionElement.appendChild(indicator)
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      indicator.remove()
    }, 3000)
  }
  
  async loadChangeHistory() {
    try {
      this.changeHistory = await this.currentProject.getChangeHistory()
    } catch (error) {
      console.error('Failed to load change history:', error)
    }
  }
  
  sendTranscriptionChange(regionId, text) {
    if (this.socket && this.currentUser) {
      this.socket.send(JSON.stringify({
        type: 'transcription_change',
        regionId,
        text,
        user: {
          id: this.currentUser.id,
          name: this.currentUser.displayName
        },
        timestamp: new Date().toISOString()
      }))
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .collaborative-interface {
          display: grid;
          grid-template-columns: 1fr 1fr 250px;
          height: 100vh;
          gap: 1rem;
          padding: 1rem;
        }
        .image-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background: #f8f9fa;
        }
        .transcription-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          overflow-y: auto;
        }
        .collaboration-panel {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          overflow-y: auto;
        }
        .active-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .user-name {
          flex: 1;
          font-weight: 500;
        }
        .user-status {
          font-size: 0.8rem;
          color: #28a745;
        }
        .region-transcription {
          margin-bottom: 1.5rem;
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          position: relative;
        }
        .transcription-textarea {
          width: 100%;
          min-height: 100px;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          font-size: 1rem;
          resize: vertical;
        }
        .change-history {
          margin-top: 1rem;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }
        .change-item {
          padding: 0.5rem;
          border-bottom: 1px solid #f0f0f0;
          font-size: 0.9rem;
        }
        .change-user {
          font-weight: bold;
          color: #007bff;
        }
        .change-time {
          color: #666;
          font-size: 0.8rem;
        }
        .remote-change-indicator {
          animation: fadeInOut 3s ease-in-out;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      </style>
      
      <div class="collaborative-interface">
        <div class="image-panel">
          ${this.currentPage ? `
            <img src="${this.currentPage.imageUrl}" alt="Page ${this.currentPage.number}" style="max-width: 100%; height: auto;">
          ` : '<div style="padding: 2rem; text-align: center;">No page loaded</div>'}
        </div>
        
        <div class="transcription-panel">
          <h3>Collaborative Transcription</h3>
          
          ${this.currentPage ? `
            <div class="regions-container">
              ${(this.regions || []).map((region, index) => `
                <div class="region-transcription" id="region-${region.id}">
                  <div class="region-header">
                    <span class="region-number">Region ${index + 1}</span>
                  </div>
                  <textarea 
                    class="transcription-textarea" 
                    placeholder="Enter transcription for this region..."
                    oninput="this.getRootNode().host.handleCollaborativeInput('${region.id}', this.value)"
                  >${region.transcription || ''}</textarea>
                </div>
              `).join('')}
            </div>
          ` : '<div style="padding: 2rem; text-align: center;">No regions to transcribe</div>'}
        </div>
        
        <div class="collaboration-panel">
          <div id="active-users">
            <h4>Active Users</h4>
            <p>Loading...</p>
          </div>
          
          <div class="change-history">
            <h4>Recent Changes</h4>
            ${this.changeHistory.slice(0, 10).map(change => `
              <div class="change-item">
                <div class="change-user">${change.user.name}</div>
                <div class="change-time">${new Date(change.timestamp).toLocaleString()}</div>
                <div>${change.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
  }
  
  handleCollaborativeInput(regionId, value) {
    // Send change to other collaborators
    this.sendTranscriptionChange(regionId, value)
    
    // Save locally
    this.updateTranscription(regionId, value)
  }
  
  async updateTranscription(regionId, text) {
    try {
      const region = this.regions.find(r => r.id === regionId)
      if (!region) return
      
      await region.updateTranscription(text)
      
      // Add to change history
      this.changeHistory.unshift({
        id: Date.now(),
        user: this.currentUser,
        regionId,
        description: `Updated transcription for region ${regionId}`,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Failed to update transcription:', error)
    }
  }
}

customElements.define('collaborative-transcription-interface', CollaborativeTranscriptionInterface)
```

## Complete Transcription Interface Example

Here's a complete example that demonstrates all transcription patterns:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>TPEN Transcription Interfaces</title>
    <script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
    <script src="transcription-interfaces.js" type="module"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        .interface-selector {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .interface-btn {
            padding: 1rem 2rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            background: white;
            border: 2px solid #ddd;
        }
        .interface-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        .interface-container {
            background: white;
            border-radius: 8px;
            min-height: 600px;
            overflow: hidden;
        }
        .interface-panel {
            display: none;
        }
        .interface-panel.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>TPEN Transcription Interfaces</h1>
        
        <div class="interface-selector">
            <button class="interface-btn active" onclick="showInterface('basic')">
                Basic Transcription
            </button>
            <button class="interface-btn" onclick="showInterface('poetry')">
                Poetry Transcription
            </button>
            <button class="interface-btn" onclick="showInterface('collaborative')">
                Collaborative Transcription
            </button>
        </div>
        
        <div class="interface-container">
            <div id="basic" class="interface-panel active">
                <basic-transcription-interface></basic-transcription-interface>
            </div>
            
            <div id="poetry" class="interface-panel">
                <poetry-transcription-interface></poetry-transcription-interface>
            </div>
            
            <div id="collaborative" class="interface-panel">
                <collaborative-transcription-interface></collaborative-transcription-interface>
            </div>
        </div>
    </div>
    
    <script>
        function showInterface(interfaceName) {
            // Hide all interface panels
            document.querySelectorAll('.interface-panel').forEach(panel => {
                panel.classList.remove('active')
            })
            
            // Remove active class from all buttons
            document.querySelectorAll('.interface-btn').forEach(btn => {
                btn.classList.remove('active')
            })
            
            // Show selected interface panel
            document.getElementById(interfaceName).classList.add('active')
            
            // Mark selected button as active
            event.target.classList.add('active')
        }
    </script>
</body>
</html>
```

## Key Transcription Patterns

1. **Basic Transcription**: Standard region-based text entry with auto-save
2. **Poetry Transcription**: Specialized markup for literary transcription
3. **Collaborative Transcription**: Real-time collaboration with presence indicators
4. **Keyboard Shortcuts**: Efficient navigation and editing
5. **Auto-save**: Automatic preservation of work
6. **Export Capabilities**: Multiple output formats
7. **Visual Feedback**: Clear indication of regions and changes
8. **Help Integration**: Contextual assistance for users

## Related Recipes

* [Building a Simple Interface](building-a-simple-interface.html)
* [Building a Complex Interface](building-a-complex-interface.html)
* [Project Management Workflows](project-management-workflows.html)
* [Classroom Group Management](classroom-group-management.html)