---
title: API Best Practices - TPEN Cookbook
description: Optimal patterns for working with TPEN's API classes effectively
author: <cubap@slu.edu>
layout: default
tags: [tpen, api, best-practices, performance, error-handling, patterns]
---

## Use Case

You want to use TPEN's API classes efficiently and effectively, following best practices for performance, error handling, caching, and maintainability.

## Implementation Notes

TPEN's API classes (TPEN.js, Project.js, User.js) provide powerful functionality, but they should be used following established patterns to ensure reliability and performance.

## Error Handling Patterns

### 1. Comprehensive Error Handling

```javascript
import { TPEN } from 'https://app.t-pen.org/api/TPEN.js'

class TPENAPIWrapper {
  constructor() {
    this.retryAttempts = 3
    this.retryDelay = 1000
    this.cache = new Map()
  }
  
  async safeAPICall(operation, context = 'API operation') {
    let lastError = null
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await operation()
        return result
      } catch (error) {
        lastError = error
        
        // Log the error with context
        console.error(`${context} failed (attempt ${attempt}/${this.retryAttempts}):`, error)
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === this.retryAttempts) {
          throw this.enhanceError(error, context)
        }
        
        // Wait before retry
        await this.delay(this.retryDelay * attempt)
      }
    }
    
    throw lastError
  }
  
  isRetryableError(error) {
    // Network errors, temporary server errors, etc.
    return error.status >= 500 || 
           error.name === 'NetworkError' || 
           error.message.includes('timeout')
  }
  
  enhanceError(error, context) {
    return {
      ...error,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Project operations with error handling
  async getProject(projectId) {
    return this.safeAPICall(async () => {
      const cacheKey = `project-${projectId}`
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)
      }
      
      const project = await TPEN.Project.load(projectId)
      this.cache.set(cacheKey, project)
      
      return project
    }, `Loading project ${projectId}`)
  }
  
  async getUserProjects(userId) {
    return this.safeAPICall(async () => {
      const user = await TPEN.User.load(userId)
      return user.getProjects()
    }, `Loading projects for user ${userId}`)
  }
  
  async updateTranscription(regionId, text) {
    return this.safeAPICall(async () => {
      const region = await TPEN.Region.load(regionId)
      await region.updateTranscription(text)
      
      // Clear related cache entries
      this.invalidateCache(`region-${regionId}`)
      
      return region
    }, `Updating transcription for region ${regionId}`)
  }
  
  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

// Global instance
const apiWrapper = new TPENAPIWrapper()
```

### 2. Batch Operations

```javascript
class BatchOperations {
  constructor() {
    this.batchSize = 10
    this.batchDelay = 100
  }
  
  async batchUpdateTranscriptions(updates) {
    const batches = this.createBatches(updates, this.batchSize)
    const results = []
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      
      try {
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(update => this.updateSingleTranscription(update))
        )
        
        results.push(...batchResults)
        
        // Add delay between batches to avoid overwhelming the server
        if (i < batches.length - 1) {
          await this.delay(this.batchDelay)
        }
        
      } catch (error) {
        console.error(`Batch ${i + 1} failed:`, error)
        
        // Handle batch failure - could retry individual items
        const individualResults = await this.handleBatchFailure(batch)
        results.push(...individualResults)
      }
    }
    
    return results
  }
  
  async handleBatchFailure(batch) {
    // Retry individual items in the failed batch
    const results = []
    
    for (const update of batch) {
      try {
        const result = await this.updateSingleTranscription(update)
        results.push(result)
      } catch (error) {
        console.error(`Individual update failed:`, error)
        results.push({ error: error.message, update })
      }
    }
    
    return results
  }
  
  async updateSingleTranscription(update) {
    return apiWrapper.updateTranscription(update.regionId, update.text)
  }
  
  createBatches(items, batchSize) {
    const batches = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

const batchOps = new BatchOperations()
```

### 3. Caching Strategy

```javascript
class TPENCache {
  constructor() {
    this.cache = new Map()
    this.expirationTimes = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes
  }
  
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value)
    this.expirationTimes.set(key, Date.now() + ttl)
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      return null
    }
    
    const expirationTime = this.expirationTimes.get(key)
    if (Date.now() > expirationTime) {
      this.cache.delete(key)
      this.expirationTimes.delete(key)
      return null
    }
    
    return this.cache.get(key)
  }
  
  has(key) {
    return this.get(key) !== null
  }
  
  delete(key) {
    this.cache.delete(key)
    this.expirationTimes.delete(key)
  }
  
  clear() {
    this.cache.clear()
    this.expirationTimes.clear()
  }
  
  // Utility methods for common cache keys
  getProjectKey(projectId) {
    return `project-${projectId}`
  }
  
  getUserKey(userId) {
    return `user-${userId}`
  }
  
  getRegionKey(regionId) {
    return `region-${regionId}`
  }
  
  getPageKey(pageId) {
    return `page-${pageId}`
  }
  
  // Cache with automatic key generation
  async cacheAPICall(keyGenerator, apiCall, ttl = this.defaultTTL) {
    const key = keyGenerator()
    
    if (this.has(key)) {
      return this.get(key)
    }
    
    const result = await apiCall()
    this.set(key, result, ttl)
    return result
  }
}

// Global cache instance
const tpenCache = new TPENCache()

// Enhanced API wrapper with caching
class CachedTPENAPI extends TPENAPIWrapper {
  async getProject(projectId) {
    return tpenCache.cacheAPICall(
      () => tpenCache.getProjectKey(projectId),
      () => super.getProject(projectId),
      10 * 60 * 1000 // 10 minutes TTL for projects
    )
  }
  
  async getUser(userId) {
    return tpenCache.cacheAPICall(
      () => tpenCache.getUserKey(userId),
      () => TPEN.User.load(userId),
      15 * 60 * 1000 // 15 minutes TTL for users
    )
  }
  
  async getProjectPages(projectId) {
    return tpenCache.cacheAPICall(
      () => `project-pages-${projectId}`,
      async () => {
        const project = await this.getProject(projectId)
        return project.getPages()
      },
      5 * 60 * 1000 // 5 minutes TTL for pages
    )
  }
}

const cachedAPI = new CachedTPENAPI()
```

### 4. Rate Limiting

```javascript
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = []
  }
  
  async waitForRateLimit() {
    const now = Date.now()
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.windowMs - (now - oldestRequest)
      
      if (waitTime > 0) {
        await this.delay(waitTime)
      }
    }
    
    this.requests.push(now)
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Rate-limited API wrapper
class RateLimitedTPENAPI extends CachedTPENAPI {
  constructor() {
    super()
    this.rateLimiter = new RateLimiter(10, 1000) // 10 requests per second
  }
  
  async safeAPICall(operation, context = 'API operation') {
    await this.rateLimiter.waitForRateLimit()
    return super.safeAPICall(operation, context)
  }
}

const rateLimitedAPI = new RateLimitedTPENAPI()
```

### 5. Data Validation

```javascript
class TPENValidator {
  static validateProject(project) {
    const errors = []
    
    if (!project.title || project.title.trim().length === 0) {
      errors.push('Project title is required')
    }
    
    if (project.title && project.title.length > 200) {
      errors.push('Project title must be less than 200 characters')
    }
    
    if (project.description && project.description.length > 1000) {
      errors.push('Project description must be less than 1000 characters')
    }
    
    if (project.collaborators && !Array.isArray(project.collaborators)) {
      errors.push('Collaborators must be an array')
    }
    
    return errors
  }
  
  static validateUser(user) {
    const errors = []
    
    if (!user.email || !this.isValidEmail(user.email)) {
      errors.push('Valid email is required')
    }
    
    if (!user.displayName || user.displayName.trim().length === 0) {
      errors.push('Display name is required')
    }
    
    if (user.displayName && user.displayName.length > 100) {
      errors.push('Display name must be less than 100 characters')
    }
    
    return errors
  }
  
  static validateTranscription(transcription) {
    const errors = []
    
    if (!transcription.text && transcription.text !== '') {
      errors.push('Transcription text is required (can be empty string)')
    }
    
    if (transcription.text && transcription.text.length > 10000) {
      errors.push('Transcription text must be less than 10,000 characters')
    }
    
    if (!transcription.regionId) {
      errors.push('Region ID is required')
    }
    
    return errors
  }
  
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  static throwIfInvalid(data, validator) {
    const errors = validator(data)
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }
  }
}

// Validated API wrapper
class ValidatedTPENAPI extends RateLimitedTPENAPI {
  async createProject(projectData) {
    TPENValidator.throwIfInvalid(projectData, TPENValidator.validateProject)
    
    return this.safeAPICall(async () => {
      return TPEN.Project.create(projectData)
    }, 'Creating project')
  }
  
  async updateUser(userId, userData) {
    TPENValidator.throwIfInvalid(userData, TPENValidator.validateUser)
    
    return this.safeAPICall(async () => {
      const user = await TPEN.User.load(userId)
      return user.update(userData)
    }, `Updating user ${userId}`)
  }
  
  async updateTranscription(regionId, text) {
    const transcriptionData = { regionId, text }
    TPENValidator.throwIfInvalid(transcriptionData, TPENValidator.validateTranscription)
    
    return super.updateTranscription(regionId, text)
  }
}

const validatedAPI = new ValidatedTPENAPI()
```

### 6. Progress Tracking

```javascript
class ProgressTracker {
  constructor() {
    this.operations = new Map()
    this.listeners = new Set()
  }
  
  startOperation(operationId, totalSteps) {
    this.operations.set(operationId, {
      totalSteps,
      currentStep: 0,
      startTime: Date.now(),
      status: 'running'
    })
    
    this.notifyListeners(operationId)
  }
  
  updateOperation(operationId, currentStep, description = '') {
    const operation = this.operations.get(operationId)
    if (!operation) return
    
    operation.currentStep = currentStep
    operation.description = description
    operation.lastUpdate = Date.now()
    
    this.notifyListeners(operationId)
  }
  
  completeOperation(operationId, result = null) {
    const operation = this.operations.get(operationId)
    if (!operation) return
    
    operation.status = 'completed'
    operation.result = result
    operation.endTime = Date.now()
    
    this.notifyListeners(operationId)
  }
  
  failOperation(operationId, error) {
    const operation = this.operations.get(operationId)
    if (!operation) return
    
    operation.status = 'failed'
    operation.error = error
    operation.endTime = Date.now()
    
    this.notifyListeners(operationId)
  }
  
  getProgress(operationId) {
    const operation = this.operations.get(operationId)
    if (!operation) return null
    
    return {
      ...operation,
      percentage: Math.round((operation.currentStep / operation.totalSteps) * 100),
      duration: (operation.endTime || Date.now()) - operation.startTime
    }
  }
  
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  notifyListeners(operationId) {
    const progress = this.getProgress(operationId)
    this.listeners.forEach(callback => {
      try {
        callback(operationId, progress)
      } catch (error) {
        console.error('Progress listener error:', error)
      }
    })
  }
}

// Progress-aware API wrapper
class ProgressAwareTPENAPI extends ValidatedTPENAPI {
  constructor() {
    super()
    this.progressTracker = new ProgressTracker()
  }
  
  async batchUpdateTranscriptions(updates) {
    const operationId = `batch-update-${Date.now()}`
    
    try {
      this.progressTracker.startOperation(operationId, updates.length)
      
      const results = []
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i]
        
        this.progressTracker.updateOperation(
          operationId, 
          i + 1, 
          `Updating transcription ${i + 1} of ${updates.length}`
        )
        
        const result = await this.updateTranscription(update.regionId, update.text)
        results.push(result)
      }
      
      this.progressTracker.completeOperation(operationId, results)
      return results
      
    } catch (error) {
      this.progressTracker.failOperation(operationId, error)
      throw error
    }
  }
  
  async loadProjectData(projectId) {
    const operationId = `load-project-${projectId}`
    
    try {
      this.progressTracker.startOperation(operationId, 4)
      
      // Step 1: Load project
      this.progressTracker.updateOperation(operationId, 1, 'Loading project details')
      const project = await this.getProject(projectId)
      
      // Step 2: Load pages
      this.progressTracker.updateOperation(operationId, 2, 'Loading pages')
      const pages = await this.getProjectPages(projectId)
      
      // Step 3: Load collaborators
      this.progressTracker.updateOperation(operationId, 3, 'Loading collaborators')
      const collaborators = await project.getCollaborators()
      
      // Step 4: Load metadata
      this.progressTracker.updateOperation(operationId, 4, 'Loading metadata')
      const metadata = await project.getMetadata()
      
      const result = { project, pages, collaborators, metadata }
      this.progressTracker.completeOperation(operationId, result)
      
      return result
      
    } catch (error) {
      this.progressTracker.failOperation(operationId, error)
      throw error
    }
  }
  
  onProgress(callback) {
    return this.progressTracker.addListener(callback)
  }
}

const progressAwareAPI = new ProgressAwareTPENAPI()
```

### 7. Usage Example

```javascript
// Complete example using all best practices
class TPENInterface extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.api = progressAwareAPI
    this.currentProject = null
  }
  
  connectedCallback() {
    this.setupProgressTracking()
    this.render()
  }
  
  setupProgressTracking() {
    this.api.onProgress((operationId, progress) => {
      this.updateProgressDisplay(operationId, progress)
    })
  }
  
  async loadProject(projectId) {
    try {
      this.showLoading(true)
      
      const data = await this.api.loadProjectData(projectId)
      this.currentProject = data.project
      
      this.render()
      
    } catch (error) {
      this.showError('Failed to load project', error)
    } finally {
      this.showLoading(false)
    }
  }
  
  async batchUpdateTranscriptions(updates) {
    try {
      const results = await this.api.batchUpdateTranscriptions(updates)
      
      const successful = results.filter(r => !r.error).length
      const failed = results.filter(r => r.error).length
      
      this.showSuccess(`Updated ${successful} transcriptions. ${failed} failed.`)
      
    } catch (error) {
      this.showError('Batch update failed', error)
    }
  }
  
  updateProgressDisplay(operationId, progress) {
    const progressElement = this.shadowRoot.querySelector(`#progress-${operationId}`)
    if (progressElement) {
      progressElement.innerHTML = `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress.percentage}%"></div>
        </div>
        <div class="progress-text">${progress.description}</div>
      `
    }
  }
  
  showLoading(show) {
    const loader = this.shadowRoot.querySelector('.loader')
    if (loader) {
      loader.style.display = show ? 'block' : 'none'
    }
  }
  
  showError(message, error) {
    console.error(message, error)
    
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message: `${message}: ${error.message}`,
      type: 'error'
    })
  }
  
  showSuccess(message) {
    TPEN.eventDispatcher.dispatch('tpen-toast', {
      message,
      type: 'success'
    })
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .tpen-interface {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .loader {
          text-align: center;
          padding: 2rem;
        }
        
        .progress-bar {
          width: 100%;
          height: 20px;
          background: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          margin: 1rem 0;
        }
        
        .progress-fill {
          height: 100%;
          background: #007bff;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-size: 0.9rem;
          color: #666;
          text-align: center;
        }
        
        .project-info {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
        }
        
        .actions {
          display: flex;
          gap: 1rem;
          margin: 1rem 0;
        }
        
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
      </style>
      
      <div class="tpen-interface">
        <h2>TPEN Interface with Best Practices</h2>
        
        <div class="loader" style="display: none;">
          <p>Loading...</p>
        </div>
        
        ${this.currentProject ? `
          <div class="project-info">
            <h3>${this.currentProject.title}</h3>
            <p>${this.currentProject.description}</p>
          </div>
          
          <div class="actions">
            <button class="btn btn-primary" onclick="this.getRootNode().host.refreshProject()">
              Refresh Project
            </button>
            <button class="btn btn-secondary" onclick="this.getRootNode().host.exportProject()">
              Export Project
            </button>
          </div>
        ` : `
          <div class="actions">
            <button class="btn btn-primary" onclick="this.getRootNode().host.loadProject('example-project-id')">
              Load Example Project
            </button>
          </div>
        `}
        
        <div id="progress-container"></div>
      </div>
    `
  }
  
  async refreshProject() {
    if (this.currentProject) {
      await this.loadProject(this.currentProject.id)
    }
  }
  
  async exportProject() {
    if (this.currentProject) {
      try {
        const exportData = await this.api.exportProject(this.currentProject.id)
        // Handle export...
        this.showSuccess('Project exported successfully')
      } catch (error) {
        this.showError('Export failed', error)
      }
    }
  }
}

customElements.define('tpen-best-practices-interface', TPENInterface)
```

## Summary of Best Practices

1. **Error Handling**: Implement comprehensive error handling with retries
2. **Caching**: Cache API responses appropriately with TTL
3. **Rate Limiting**: Respect API rate limits
4. **Validation**: Validate data before sending to API
5. **Progress Tracking**: Provide feedback for long-running operations
6. **Batch Operations**: Group operations for efficiency
7. **Async/Await**: Use modern async patterns consistently
8. **Resource Management**: Clean up resources and clear caches when appropriate

## Related Recipes

* [Building a Simple Interface](building-a-simple-interface.html)
* [Building a Complex Interface](building-a-complex-interface.html)
* [Component Integration](component-integration.html)
* [Performance Optimization](performance-optimization.html)