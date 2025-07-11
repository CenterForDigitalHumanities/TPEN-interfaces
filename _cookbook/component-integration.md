---
title: Component Integration - TPEN Cookbook
description: Effectively using and combining TPEN's Web Components in your interfaces
author: <cubap@slu.edu>
layout: default
tags: [tpen, components, web-components, integration, reusable]
---

## Use Case

You want to build interfaces that leverage TPEN's existing Web Components effectively, combining them to create powerful, reusable functionality without rebuilding common features from scratch.

## Implementation Notes

TPEN provides a rich set of Web Components that can be combined to create complex interfaces. This recipe shows how to discover, use, and extend these components effectively.

## Discovering Available Components

### 1. Component Explorer

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class ComponentExplorer extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.availableComponents = []
  }
  
  async connectedCallback() {
    await this.discoverComponents()
    this.render()
  }
  
  async discoverComponents() {
    // Discover available TPEN components
    this.availableComponents = [
      {
        name: 'tpen-user-profile',
        description: 'User profile management component',
        path: '/components/user-profile/',
        props: ['show-metadata', 'editable'],
        events: ['profile-updated']
      },
      {
        name: 'tpen-project-list',
        description: 'Project listing with filtering',
        path: '/components/projects/',
        props: ['filter', 'sort', 'limit'],
        events: ['project-selected']
      },
      {
        name: 'tpen-transcription-block',
        description: 'Individual transcription editing block',
        path: '/components/transcription-block/',
        props: ['region-id', 'auto-save'],
        events: ['transcription-changed']
      },
      {
        name: 'tpen-page-tool',
        description: 'Page navigation and management',
        path: '/components/page-tool/',
        props: ['project-id', 'show-thumbnails'],
        events: ['page-changed']
      },
      {
        name: 'tpen-layer-selector',
        description: 'Layer visibility and management',
        path: '/components/layer-selector/',
        props: ['project-id', 'multi-select'],
        events: ['layer-toggled']
      },
      {
        name: 'tpen-quick-guide',
        description: 'Context-sensitive help component',
        path: '/components/quick-guide/',
        props: ['topic', 'position'],
        events: ['guide-closed']
      }
    ]
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .component-explorer {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .component-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }
        .component-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          background: white;
        }
        .component-name {
          font-size: 1.2rem;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 0.5rem;
        }
        .component-description {
          color: #666;
          margin-bottom: 1rem;
        }
        .component-details {
          font-size: 0.9rem;
        }
        .detail-section {
          margin-bottom: 0.5rem;
        }
        .detail-label {
          font-weight: bold;
          color: #333;
        }
        .detail-value {
          color: #666;
          font-family: monospace;
        }
        .demo-button {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }
        .demo-button:hover {
          background: #218838;
        }
      </style>
      
      <div class="component-explorer">
        <h2>TPEN Component Library</h2>
        <p>Discover and test available TPEN Web Components</p>
        
        <div class="component-grid">
          ${this.availableComponents.map(component => `
            <div class="component-card">
              <div class="component-name">&lt;${component.name}&gt;</div>
              <div class="component-description">${component.description}</div>
              
              <div class="component-details">
                <div class="detail-section">
                  <span class="detail-label">Properties:</span>
                  <div class="detail-value">${component.props.join(', ')}</div>
                </div>
                
                <div class="detail-section">
                  <span class="detail-label">Events:</span>
                  <div class="detail-value">${component.events.join(', ')}</div>
                </div>
                
                <div class="detail-section">
                  <span class="detail-label">Path:</span>
                  <div class="detail-value">${component.path}</div>
                </div>
              </div>
              
              <button class="demo-button" onclick="this.getRootNode().host.demoComponent('${component.name}')">
                Demo Component
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }
  
  demoComponent(componentName) {
    // Load and demo the component
    const component = this.availableComponents.find(c => c.name === componentName)
    if (component) {
      this.loadComponentDemo(component)
    }
  }
  
  async loadComponentDemo(component) {
    // Create a demo container
    const demoContainer = document.createElement('div')
    demoContainer.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 80%; max-height: 80%; overflow: auto;">
          <h3>Demo: ${component.name}</h3>
          <p>${component.description}</p>
          
          <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
            <${component.name}></${component.name}>
          </div>
          
          <div style="margin-top: 1rem;">
            <h4>Usage:</h4>
            <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto;">
&lt;${component.name} ${component.props.map(prop => `${prop}="value"`).join(' ')}&gt;&lt;/${component.name}&gt;</pre>
          </div>
          
          <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close Demo
          </button>
        </div>
      </div>
    `
    
    // Load the component script
    try {
      await this.loadComponentScript(component.path)
      document.body.appendChild(demoContainer)
    } catch (error) {
      console.error('Failed to load component:', error)
      alert('Failed to load component demo')
    }
  }
  
  async loadComponentScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = path + 'index.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
}

customElements.define('component-explorer', ComponentExplorer)
```

### 2. Component Composition Patterns

```javascript
// Example: Building a complete transcription interface using existing components
class CompositeTranscriptionInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.currentProject = null
  }
  
  connectedCallback() {
    TPEN.attachAuthentication(this)
    this.setupEventListeners()
    this.render()
  }
  
  setupEventListeners() {
    // Listen for project selection
    this.addEventListener('project-selected', (event) => {
      this.currentProject = event.detail.project
      this.updateInterface()
    })
    
    // Listen for page changes
    this.addEventListener('page-changed', (event) => {
      this.currentPage = event.detail.page
      this.updateTranscriptionView()
    })
    
    // Listen for layer changes
    this.addEventListener('layer-toggled', (event) => {
      this.updateLayerVisibility(event.detail)
    })
    
    // Listen for transcription changes
    this.addEventListener('transcription-changed', (event) => {
      this.handleTranscriptionChange(event.detail)
    })
  }
  
  updateInterface() {
    // Update all child components when project changes
    const components = this.shadowRoot.querySelectorAll('[data-project-aware]')
    components.forEach(component => {
      if (component.setAttribute) {
        component.setAttribute('project-id', this.currentProject.id)
      }
    })
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .composite-interface {
          display: grid;
          grid-template-areas: 
            "toolbar toolbar toolbar"
            "projects pages transcription"
            "layers pages transcription";
          grid-template-columns: 250px 1fr 400px;
          grid-template-rows: auto 1fr auto;
          height: 100vh;
          gap: 1rem;
          padding: 1rem;
        }
        
        .toolbar-area {
          grid-area: toolbar;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .projects-area {
          grid-area: projects;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
        }
        
        .pages-area {
          grid-area: pages;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
        }
        
        .transcription-area {
          grid-area: transcription;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
        }
        
        .layers-area {
          grid-area: layers;
          background: white;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
        }
        
        .component-container {
          height: 100%;
          overflow: auto;
        }
        
        .toolbar-component {
          display: inline-block;
          margin-right: 1rem;
        }
      </style>
      
      <div class="composite-interface">
        <div class="toolbar-area">
          <tpen-user-profile class="toolbar-component" show-metadata="false"></tpen-user-profile>
          <tpen-quick-guide class="toolbar-component" topic="transcription"></tpen-quick-guide>
        </div>
        
        <div class="projects-area">
          <div class="component-container">
            <tpen-project-list 
              data-project-aware
              filter="transcription"
              sort="modified"
              limit="10">
            </tpen-project-list>
          </div>
        </div>
        
        <div class="pages-area">
          <div class="component-container">
            <tpen-page-tool 
              data-project-aware
              show-thumbnails="true">
            </tpen-page-tool>
          </div>
        </div>
        
        <div class="transcription-area">
          <div class="component-container">
            <tpen-transcription-block 
              data-project-aware
              auto-save="true">
            </tpen-transcription-block>
          </div>
        </div>
        
        <div class="layers-area">
          <div class="component-container">
            <tpen-layer-selector 
              data-project-aware
              multi-select="true">
            </tpen-layer-selector>
          </div>
        </div>
      </div>
    `
  }
  
  updateTranscriptionView() {
    const transcriptionComponent = this.shadowRoot.querySelector('tpen-transcription-block')
    if (transcriptionComponent && this.currentPage) {
      transcriptionComponent.setAttribute('page-id', this.currentPage.id)
    }
  }
  
  updateLayerVisibility(layerInfo) {
    // Update page tool component to show/hide layers
    const pageComponent = this.shadowRoot.querySelector('tpen-page-tool')
    if (pageComponent) {
      pageComponent.setAttribute('visible-layers', layerInfo.visibleLayers.join(','))
    }
  }
  
  handleTranscriptionChange(changeInfo) {
    // Handle transcription changes, possibly update other components
    console.log('Transcription changed:', changeInfo)
    
    // Could update a progress indicator, send to collaboration server, etc.
    this.dispatchEvent(new CustomEvent('interface-transcription-changed', {
      detail: changeInfo,
      bubbles: true
    }))
  }
}

customElements.define('composite-transcription-interface', CompositeTranscriptionInterface)
```

### 3. Custom Component Extension

```javascript
// Example: Extending an existing TPEN component
class ExtendedTranscriptionBlock extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.originalComponent = null
  }
  
  connectedCallback() {
    this.createExtendedInterface()
  }
  
  createExtendedInterface() {
    // Create the base transcription component
    this.originalComponent = document.createElement('tpen-transcription-block')
    
    // Add custom features
    this.render()
    
    // Set up event forwarding
    this.setupEventForwarding()
  }
  
  setupEventForwarding() {
    // Forward events from the original component
    this.originalComponent.addEventListener('transcription-changed', (event) => {
      this.handleTranscriptionChange(event.detail)
      
      // Forward the event
      this.dispatchEvent(new CustomEvent('transcription-changed', {
        detail: event.detail,
        bubbles: true
      }))
    })
  }
  
  handleTranscriptionChange(detail) {
    // Add custom behavior
    this.updateWordCount(detail.text)
    this.checkSpelling(detail.text)
    this.updateProgress()
  }
  
  updateWordCount(text) {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCountElement = this.shadowRoot.querySelector('.word-count')
    if (wordCountElement) {
      wordCountElement.textContent = `${words.length} words`
    }
  }
  
  async checkSpelling(text) {
    // Simple spell check implementation
    const spellCheckElement = this.shadowRoot.querySelector('.spell-check')
    if (!spellCheckElement) return
    
    try {
      // Mock spell check - in real implementation, call a spell check API
      const suspiciousWords = text.match(/\b\w*[0-9]\w*\b/g) || []
      
      if (suspiciousWords.length > 0) {
        spellCheckElement.innerHTML = `
          <span style="color: #dc3545;">
            Possible issues: ${suspiciousWords.join(', ')}
          </span>
        `
      } else {
        spellCheckElement.innerHTML = `
          <span style="color: #28a745;">No obvious issues</span>
        `
      }
    } catch (error) {
      console.error('Spell check failed:', error)
    }
  }
  
  updateProgress() {
    // Update progress indicator
    const progressElement = this.shadowRoot.querySelector('.progress-indicator')
    if (progressElement) {
      // Calculate progress based on filled transcription blocks
      const progress = this.calculateProgress()
      progressElement.style.width = `${progress}%`
    }
  }
  
  calculateProgress() {
    // Mock progress calculation
    const text = this.originalComponent.value || ''
    const minWords = 10 // Minimum words for "complete"
    const currentWords = text.trim().split(/\s+/).filter(word => word.length > 0).length
    return Math.min(100, (currentWords / minWords) * 100)
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .extended-transcription {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .transcription-header {
          background: #f8f9fa;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .transcription-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
        }
        
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .progress-bar {
          width: 100px;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-indicator {
          height: 100%;
          background: #28a745;
          transition: width 0.3s ease;
          width: 0%;
        }
        
        .transcription-body {
          padding: 1rem;
        }
        
        .transcription-footer {
          background: #f8f9fa;
          padding: 0.5rem 1rem;
          border-top: 1px solid #e0e0e0;
          font-size: 0.9rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .word-count {
          color: #666;
        }
        
        .spell-check {
          color: #666;
        }
      </style>
      
      <div class="extended-transcription">
        <div class="transcription-header">
          <h4>Enhanced Transcription</h4>
          <div class="transcription-stats">
            <div class="stat-item">
              <span>Progress:</span>
              <div class="progress-bar">
                <div class="progress-indicator"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="transcription-body">
          <!-- Original component will be inserted here -->
        </div>
        
        <div class="transcription-footer">
          <div class="word-count">0 words</div>
          <div class="spell-check">Ready</div>
        </div>
      </div>
    `
    
    // Insert the original component
    const body = this.shadowRoot.querySelector('.transcription-body')
    body.appendChild(this.originalComponent)
  }
  
  // Expose methods from the original component
  get value() {
    return this.originalComponent.value
  }
  
  set value(val) {
    this.originalComponent.value = val
  }
  
  // Forward attribute changes to the original component
  static get observedAttributes() {
    return ['region-id', 'auto-save', 'page-id']
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.originalComponent) {
      this.originalComponent.setAttribute(name, newValue)
    }
  }
}

customElements.define('extended-transcription-block', ExtendedTranscriptionBlock)
```

### 4. Component Communication Patterns

```javascript
// Example: Component coordination through events
class ComponentCoordinator extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.componentStates = new Map()
  }
  
  connectedCallback() {
    this.setupGlobalEventListeners()
    this.render()
  }
  
  setupGlobalEventListeners() {
    // Listen for events from child components
    this.addEventListener('project-selected', (event) => {
      this.broadcastToComponents('project-loaded', event.detail)
    })
    
    this.addEventListener('page-changed', (event) => {
      this.broadcastToComponents('page-loaded', event.detail)
    })
    
    this.addEventListener('transcription-changed', (event) => {
      this.updateComponentState('transcription', event.detail)
      this.broadcastToComponents('transcription-updated', event.detail)
    })
    
    // Listen for TPEN global events
    TPEN.eventDispatcher.on('tpen-user-authenticated', (user) => {
      this.broadcastToComponents('user-authenticated', { user })
    })
  }
  
  broadcastToComponents(eventType, data) {
    // Send events to all registered components
    const components = this.shadowRoot.querySelectorAll('[data-component-id]')
    components.forEach(component => {
      if (component.handleCoordinatorEvent) {
        component.handleCoordinatorEvent(eventType, data)
      }
    })
  }
  
  updateComponentState(componentType, state) {
    this.componentStates.set(componentType, state)
    
    // Persist state if needed
    localStorage.setItem(`tpen-component-state-${componentType}`, JSON.stringify(state))
  }
  
  getComponentState(componentType) {
    if (this.componentStates.has(componentType)) {
      return this.componentStates.get(componentType)
    }
    
    // Try to load from localStorage
    const stored = localStorage.getItem(`tpen-component-state-${componentType}`)
    if (stored) {
      try {
        const state = JSON.parse(stored)
        this.componentStates.set(componentType, state)
        return state
      } catch (error) {
        console.error('Failed to parse stored state:', error)
      }
    }
    
    return null
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .coordinator-interface {
          display: grid;
          grid-template-columns: 300px 1fr 300px;
          height: 100vh;
          gap: 1rem;
          padding: 1rem;
        }
        
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .main-content {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .component-container {
          height: 100%;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
      </style>
      
      <div class="coordinator-interface">
        <div class="sidebar">
          <div class="component-container">
            <tpen-project-list 
              data-component-id="project-list"
              filter="all"
              sort="modified">
            </tpen-project-list>
          </div>
          
          <div class="component-container">
            <tpen-layer-selector 
              data-component-id="layer-selector"
              multi-select="true">
            </tpen-layer-selector>
          </div>
        </div>
        
        <div class="main-content">
          <tpen-page-tool 
            data-component-id="page-tool"
            show-thumbnails="true">
          </tpen-page-tool>
        </div>
        
        <div class="sidebar">
          <div class="component-container">
            <extended-transcription-block 
              data-component-id="transcription"
              auto-save="true">
            </extended-transcription-block>
          </div>
          
          <div class="component-container">
            <tpen-quick-guide 
              data-component-id="help"
              topic="transcription">
            </tpen-quick-guide>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('component-coordinator', ComponentCoordinator)
```

## Complete Component Integration Example

Here's a complete example demonstrating component integration:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>TPEN Component Integration</title>
    <script src="https://app.t-pen.org/api/TPEN.js" type="module"></script>
    <script src="component-integration.js" type="module"></script>
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
        .demo-tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .demo-tab {
            padding: 1rem 2rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            background: white;
            border: 2px solid #ddd;
        }
        .demo-tab.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        .demo-container {
            background: white;
            border-radius: 8px;
            min-height: 600px;
            overflow: hidden;
        }
        .demo-panel {
            display: none;
            height: 100%;
        }
        .demo-panel.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>TPEN Component Integration Examples</h1>
        
        <div class="demo-tabs">
            <button class="demo-tab active" onclick="showDemo('explorer')">
                Component Explorer
            </button>
            <button class="demo-tab" onclick="showDemo('composite')">
                Composite Interface
            </button>
            <button class="demo-tab" onclick="showDemo('extended')">
                Extended Components
            </button>
            <button class="demo-tab" onclick="showDemo('coordinated')">
                Coordinated Components
            </button>
        </div>
        
        <div class="demo-container">
            <div id="explorer" class="demo-panel active">
                <component-explorer></component-explorer>
            </div>
            
            <div id="composite" class="demo-panel">
                <composite-transcription-interface></composite-transcription-interface>
            </div>
            
            <div id="extended" class="demo-panel">
                <extended-transcription-block 
                    region-id="example-region"
                    auto-save="true">
                </extended-transcription-block>
            </div>
            
            <div id="coordinated" class="demo-panel">
                <component-coordinator></component-coordinator>
            </div>
        </div>
    </div>
    
    <script>
        function showDemo(demoName) {
            // Hide all demo panels
            document.querySelectorAll('.demo-panel').forEach(panel => {
                panel.classList.remove('active')
            })
            
            // Remove active class from all tabs
            document.querySelectorAll('.demo-tab').forEach(tab => {
                tab.classList.remove('active')
            })
            
            // Show selected demo panel
            document.getElementById(demoName).classList.add('active')
            
            // Mark selected tab as active
            event.target.classList.add('active')
        }
    </script>
</body>
</html>
```

## Key Integration Patterns

1. **Component Discovery**: Systematically finding and understanding available components
2. **Composition**: Combining multiple components into cohesive interfaces
3. **Extension**: Adding functionality to existing components
4. **Communication**: Coordinating between components through events
5. **State Management**: Sharing and persisting component state
6. **Event Forwarding**: Properly handling and forwarding component events
7. **Attribute Management**: Managing component properties and attributes

## Best Practices

1. **Use Semantic HTML**: Always use proper HTML structure
2. **Event Bubbling**: Let events bubble up for better component communication
3. **State Persistence**: Consider persisting component state for better UX
4. **Error Handling**: Implement proper error handling for component failures
5. **Performance**: Be mindful of component lifecycle and memory usage
6. **Accessibility**: Ensure components are accessible to all users

## Related Recipes

* [Building a Simple Interface](building-a-simple-interface.html)
* [Building a Complex Interface](building-a-complex-interface.html)
* [API Best Practices](api-best-practices.html)
* [Performance Optimization](performance-optimization.html)