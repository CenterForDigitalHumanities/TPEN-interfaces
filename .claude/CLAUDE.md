# CLAUDE.md

This file provides guidance to AI assistants when working with code in this repository.

## Project Overview

TPEN3 Interfaces is a JavaScript library that provides web components and API client functionality for TPEN3 (Transcription for Paleographical and Editorial Notation) version. TPEN3 is a web-based tool for transcribing manuscripts and historical documents.

### Key Capabilities
- **Manuscript Transcription**: Tools for transcribing paleographical texts and manuscripts
- **Project Management**: Create, manage, and collaborate on transcription projects
- **Web Components**: Reusable UI components for building transcription interfaces
- **API Client**: JavaScript SDK for interacting with the TPEN3 backend services
- **IIIF Integration**: Support for International Image Interoperability Framework manifests

## Project Structure

```
/mnt/e/tpen3-interfaces/
├── api/                      # Core JavaScript API classes
│   ├── TPEN.js              # Main API client singleton
│   ├── Project.js           # Project management
│   ├── User.js              # User authentication/management
│   ├── config.js            # Environment configuration
│   ├── events.js            # Event dispatcher
│   └── __tests__/           # API tests (node:test)
├── components/              # Web Components library
│   ├── check-permissions/   # Permission checking utility
│   ├── column-selector/     # Column selection component
│   ├── gui/                 # GUI components (toast, alert, confirm)
│   ├── iiif-tools/          # IIIF utilities and token handling
│   ├── project-*/           # Project-related components
│   ├── user-profile/        # User profile component
│   └── ...                  # Many more components
├── interfaces/              # Full-page interface implementations
│   ├── annotator/           # Annotation interface
│   ├── transcription/       # Transcription interface
│   ├── manage-project/      # Project management interface
│   └── ...                  # Other interfaces
├── utilities/               # Shared utility functions
│   ├── CleanupRegistry.js   # Event listener cleanup utility
│   └── projectReady.js      # Project ready state utility
├── css/                     # Stylesheets
│   ├── index.css            # Main stylesheet
│   ├── manage/              # Management page styles
│   └── collaborators/       # Collaborator styles
├── js/                      # Utility scripts (redirect, vault, utils)
├── assets/                  # Static assets (icons, images, logos)
├── _classes/                # Jekyll class documentation
├── _cookbook/               # Jekyll cookbook examples
├── _layouts/                # Jekyll layouts for GitHub Pages
├── manage/                  # Management pages
└── _config.yml              # Jekyll configuration
```

## Technology Stack

### Core Technologies
- **Language**: Vanilla JavaScript (ES6+)
- **Web Standards**: Web Components, Custom Elements, Shadow DOM
- **Build System**: Jekyll (for GitHub Pages deployment)
- **Testing**: Node.js native test runner (`node:test`)
- **CI/CD**: GitHub Actions

### Key Dependencies
- **IIIF**: International Image Interoperability Framework support
- **RERUM**: Data storage and persistence layer
- **JWT**: JSON Web Tokens for authentication

## Core API Classes

### TPEN Class (`api/TPEN.js`)
Main API client singleton that handles authentication, configuration, and state management.

```javascript
// Key methods:
TPEN.attachAuthentication(element)  // Attach auth to element, redirects to login if needed
TPEN.getAuthorization()             // Get current auth token (or false if expired)
TPEN.login(redirect)                // Redirect to TPEN3 login page
TPEN.logout(redirect)               // Clear auth and redirect to logout
TPEN.getUserProjects(idToken)       // Get user's projects and metrics (async)
TPEN.getFirstPageOfProject(id)      // Get first page of a project (async)
TPEN.getAllPublicProjects()         // Fetch all public projects (async)
TPEN.tempUserUpgrade(projectID, inviteCode, agentID) // Upgrade temp user (async)

// Key properties:
TPEN.eventDispatcher               // Event dispatcher for app-wide events
TPEN.currentUser                   // Currently authenticated user
TPEN.activeProject                 // Currently active project
TPEN.userProjects                  // Cached user projects
TPEN.userMetrics                   // Cached user metrics
TPEN.screen                        // URL query parameters (projectInQuery, pageInQuery, etc.)
TPEN.servicesURL                   // API services URL
TPEN.BASEURL                       // Base application URL
```

### Project Class (`api/Project.js`)
Manages transcription projects and their members.

```javascript
// Constructor - takes project ID string
new Project(projectId)              // Create project instance with ID

// Instance methods:
project.fetch()                     // Load project data from API (async)
project.save()                      // Save project changes (async)
project.addMember(email, roles)     // Invite member by email (async)
project.removeMember(userId)        // Remove project member (async)
project.makeLeader(userId)          // Promote user to LEADER role (async)
project.demoteLeader(userId)        // Remove LEADER role from user (async)
project.setToViewer(userId)         // Set user to VIEWER role only (async)
project.cherryPickRoles(userId, roles) // Set specific roles for user (async)
project.transferOwnership(userId)   // Transfer project ownership (async)
project.updateMetadata(metadata)    // Update project metadata (async)
project.setMetadata(metadata)       // Set metadata and save
project.addLayer(layer)             // Add layer and save
project.removeLayer(layerId)        // Remove layer and save
project.addTool(tool)               // Add tool and save
project.removeTool(toolId)          // Remove tool and save
project.storeInterfacesCustomization(customizations, replace) // Save UI customizations (async)
project.getLabel()                  // Get project label/title
project.getByRole(role)             // Get collaborators with specific role
project.getOwner()                  // Get project owner
project.getPageByIndex(index, layerIndex) // Get page at index
project.getFirstPageID(layerIndex)  // Get first page ID

// Static methods:
Project.getById(projectId)          // Fetch project by ID (async)
```

### User Class (`api/User.js`)
Handles user profile and project management.

```javascript
// Constructor - takes user ID string
new User(userId)                    // Create user instance with ID

// Instance methods:
user.getProfile()                   // Fetch user profile (async)
user.getProjects()                  // Get user's projects with metrics (async)
user.updateRecord(data)             // Update user record (async)
user.addToPublicProfile(data)       // Add data to public profile (async)
user.updatePrivateInformation(data) // Update private info (async)

// Static methods:
User.fromToken(token)               // Create User instance from JWT token
```

### Configuration (`api/config.js`)
Environment-aware configuration system.

```javascript
import { CONFIG, ACTIVE_ENV, ENVIRONMENTS } from './config.js'

// CONFIG contains:
CONFIG.env          // 'dev' or 'prod'
CONFIG.servicesURL  // API endpoint (e.g., 'https://dev.api.t-pen.org')
CONFIG.BASEURL      // App base URL
CONFIG.tinyThingsURL // TinyThings service URL
CONFIG.staticURL    // Static assets URL
CONFIG.RERUMURL     // RERUM store URL
CONFIG.TPEN28URL    // TPEN 2.8 URL
CONFIG.TPEN3URL     // TPEN 3 main URL

// Environment is determined by (in order):
// 1. globalThis.TPEN_ENV
// 2. <meta name="tpen-env" content="dev|prod">
// 3. process.env.TPEN_ENV
// 4. Defaults to 'dev'
```

### Vault (`js/vault.js`)
Singleton caching layer for IIIF resources. **This is a custom utility, not the `@iiif/helpers` Vault.**
All components should use the vault instead of raw `fetch()` for IIIF resources (canvases, manifests, annotation pages, annotations, etc.).

```javascript
import vault from '../../js/vault.js'

// Core methods:
vault.get(item, itemType, noCache)                       // Fetch with dual-layer cache (memory + localStorage)
vault.set(item, itemType)                                // Store in both caches
vault.delete(item, itemType)                             // Remove from both caches
vault.clear(itemType)                                    // Purge all of a given type
vault.all()                                              // Get all cached resources

// Fallback methods:
vault.getWithFallback(item, itemType, manifestUrls, noCache) // get() + prefetch manifests on miss
vault.prefetchManifests(urls)                                // Batch prefetch manifests
vault.prefetchDocuments(items, docType)                      // Batch prefetch any document type
vault.prefetchCollections(items)                             // Batch prefetch collections
```

**Key behaviors:**
- **Dual-layer cache**: in-memory `Map` for speed + `localStorage` for persistence across reloads
- **BFS hydration**: when a resource is fetched, embedded IIIF sub-resources are recursively cached individually via `structuredClone()`. The parent stores minimal stubs (`{id, type, label}`) for non-array properties.
- **In-flight deduplication**: concurrent `get()` calls for the same resource share a single network request
- **Seed fallback**: when `item` is an object and the network fetch fails, the object is hydrated and cached as a fallback
- **IIIF v2 + v3 types**: recognizes both unprefixed (v3: `Canvas`, `Manifest`) and prefixed (v2: `sc:Canvas`, `sc:Manifest`) types
- **`noCache` flag**: bypasses in-memory and localStorage lookups to force a fresh fetch

### URL Resolution (`js/utils.js`)
`urlFromIdAndType(id, type, { projectId, pageId, layerId })` resolves resource IDs to fetchable URLs.

- Full URLs (http/https) are returned as-is
- TPEN resources (`annotationpage`, `annotation`, `annotationcollection`) are resolved to the services API
- **External IIIF types (`canvas`, `manifest`, `collection`) return `null`** — these must already be full URLs or will be found as embedded data via manifest prefetch
- Returns `null` (not empty string) when resolution is impossible

## API Endpoints

The API follows RESTful conventions. Base URL is determined by environment (dev: `https://dev.api.t-pen.org`, prod: `https://api.t-pen.org`).

### User/Profile
- `GET /my/profile` - Get authenticated user's profile
- `PUT /my/profile/update` - Update user profile
- `GET /my/projects` - Get user's projects with metrics
- `GET /user/:id` - Get public user profile

### Projects
- `GET /project/:id` - Get project details
- `PUT /project/:id` - Update project
- `PUT /project/:id/metadata` - Update project metadata
- `POST /project/:id/custom` - Replace interface customizations
- `PUT /project/:id/custom` - Merge interface customizations
- `GET /projects/public` - List all public projects

### Project Members
- `POST /project/:id/invite-member` - Invite member by email
- `POST /project/:id/remove-member` - Remove member
- `POST /project/:id/collaborator/:userId/addRoles` - Add roles to user
- `POST /project/:id/collaborator/:userId/removeRoles` - Remove roles from user
- `PUT /project/:id/collaborator/:userId/setRoles` - Set user's roles
- `POST /project/:id/switch/owner` - Transfer ownership
- `GET /project/:id/collaborator/:inviteCode/agent/:agentId` - Upgrade temp user

## Web Components Architecture

### Component Lifecycle Pattern
All components follow this standardized lifecycle:

```
connectedCallback() → onProjectReady() → authgate() → render() → addEventListeners() → disconnectedCallback()
```

**Key Conventions:**
1. **No async lifecycle methods** - `connectedCallback()`, `render()`, and `authgate()` must be synchronous
2. **Delegate async work** - Use separate methods like `initializeAsync()` or `loadAndRender()`
3. **Use CleanupRegistry** - All event listeners that need cleanup must use `CleanupRegistry`
4. **Authentication in connectedCallback** - Call `TPEN.attachAuthentication(this)` in `connectedCallback()`, not the constructor
5. **Permission checks in authgate** - Use `CheckPermissions` to check minimum permissions before rendering. More specific permissions can be checked while rendering component HTML if necessary.

### Standard Component Template
```javascript
import TPEN from '../../api/TPEN.js'
import CheckPermissions from '../check-permissions/checkPermissions.js'
import { onProjectReady } from '../../utilities/projectReady.js'
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

/**
 * ComponentName - Brief description of what this component does.
 * @element tpen-component-name
 */
class ComponentName extends HTMLElement {
    /** @type {CleanupRegistry} Registry for cleanup handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()
    /** @type {Function|null} Unsubscribe function for project ready listener */
    _unsubProject = null

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        TPEN.attachAuthentication(this)
        this._unsubProject = onProjectReady(this, this.authgate)
    }

    /**
     * Authorization gate - checks permissions before rendering.
     * NOTE: This can be called multiple times via onProjectReady.
     */
    authgate() {
        if (!CheckPermissions.checkViewAccess('RESOURCE', 'ACTION')) {
            this.shadowRoot.innerHTML = `<p>Permission denied</p>`
            return
        }
        this.render()
        this.addEventListeners()
        this.initializeAsync() // If async work is needed
    }

    disconnectedCallback() {
        try { this._unsubProject?.() } catch {}
        this.renderCleanup.run()
        this.cleanup.run()
    }

    render() {
        // Synchronous rendering only
        this.shadowRoot.innerHTML = `...`
    }

    addEventListeners() {
        // Clear previous render-specific listeners (important since authgate can be called multiple times)
        this.renderCleanup.run()

        // Use renderCleanup for listeners on elements created in render()
        this.renderCleanup.onElement(this.shadowRoot.querySelector('#btn'), 'click', () => {})

        // Use cleanup for persistent listeners (window, document, eventDispatcher)
        // that should only be registered once
        this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-event', () => {})
    }

    /**
     * Performs async initialization after authgate passes.
     */
    async initializeAsync() {
        // Async work goes here, not in render() or authgate()
    }

    static get observedAttributes() {
        return ['attribute-name']
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Handle attribute changes
    }
}

customElements.define('tpen-component-name', ComponentName)
```

### CleanupRegistry Utility
The `CleanupRegistry` class (`utilities/CleanupRegistry.js`) provides centralized event listener management:

```javascript
// Available methods:
cleanup.add(cleanupFn)                    // Add custom cleanup function
cleanup.onEvent(dispatcher, event, handler)  // TPEN eventDispatcher listeners
cleanup.onWindow(event, handler)          // Window event listeners (returns unsubscribe fn)
cleanup.onDocument(event, handler)        // Document event listeners (returns unsubscribe fn)
cleanup.onElement(element, event, handler) // DOM element listeners (returns unsubscribe fn)
cleanup.addObserver(observer)             // ResizeObserver cleanup
cleanup.addMutationObserver(observer)     // MutationObserver cleanup
cleanup.run()                             // Execute all cleanup (call in disconnectedCallback)
```

**Early Unsubscription**: Methods that return unsubscribe functions allow manual cleanup before `disconnectedCallback`:
```javascript
// Store the unsubscribe function for later manual cleanup
this._unsubEscKey = this.cleanup.onWindow('keydown', escHandler)

// Later, manually unsubscribe (e.g., when hiding a modal)
this._unsubEscKey?.()
this._unsubEscKey = null
```

### Dual Cleanup Pattern
For components that re-render multiple times (calling `addEventListeners()` after each render), use two registries:

```javascript
class ReRenderingComponent extends HTMLElement {
    /** @type {CleanupRegistry} Registry for persistent handlers */
    cleanup = new CleanupRegistry()
    /** @type {CleanupRegistry} Registry for render-specific handlers */
    renderCleanup = new CleanupRegistry()

    addEventListeners() {
        // Clear previous render-specific listeners
        this.renderCleanup.run()

        // Add new listeners for this render
        this.renderCleanup.onElement(btn, 'click', () => {
            this.render()
            this.addEventListeners() // Re-renders trigger cleanup
        })
    }

    disconnectedCallback() {
        this.renderCleanup.run()
        this.cleanup.run()
    }
}
```

**When to use `renderCleanup`** (required to prevent memory leaks):
- Components using `onProjectReady(this, this.authgate)` where `authgate()` calls `addEventListeners()` - `authgate` can be called multiple times
- Components with setters or `attributeChangedCallback` that trigger `render()` + `addEventListeners()`
- Components where event handlers call `render()` + `addEventListeners()` (like form re-renders on input)

**When `renderCleanup` is NOT needed:**
- Components that only call `render()` and `addEventListeners()` once in `connectedCallback()`
- Components using `onProjectReady` with a callback that doesn't call `addEventListeners()` (e.g., just loads data)

### CheckPermissions Utility
The `CheckPermissions` class (`components/check-permissions/checkPermissions.js`) provides permission checking:

```javascript
import CheckPermissions from '../check-permissions/checkPermissions.js'

// Available methods:
CheckPermissions.checkViewAccess(entity, scope)    // Check view permission
CheckPermissions.checkEditAccess(entity, scope)    // Check edit permission
CheckPermissions.checkDeleteAccess(entity, scope)  // Check delete permission
CheckPermissions.checkCreateAccess(entity, scope)  // Check create permission
CheckPermissions.checkAllAccess(entity, scope)     // Check all permissions
```

### Event System
Components communicate via custom events and the TPEN eventDispatcher:

```javascript
// Using TPEN eventDispatcher for app-wide events
TPEN.eventDispatcher.dispatch('tpen-project-loaded', projectData)
TPEN.eventDispatcher.on('tpen-project-loaded', (ev) => {
    console.log('Project loaded:', ev.detail)
})

// Common events:
// - tpen-authenticated: User authenticated
// - tpen-user-loaded: User data loaded
// - tpen-project-loaded: Project data loaded
// - tpen-project-saved: Project saved
// - tpen-project-load-failed: Project load failed
// - tpen-page-selected: Page selected in page selector ({ pageId, pageIndex, page })
// - tpen-toast: Show toast message ({ status, message })
// - token-expiration: Auth token expired

// DOM custom events for component communication
this.dispatchEvent(new CustomEvent('project-created', {
    detail: { projectId: '123' },
    bubbles: true,
    composed: true
}))
```

## Authentication & Security

### Token-Based Authentication
- Uses JWT (JSON Web Tokens)
- Tokens stored in localStorage as 'userToken'
- Automatic token attachment via `TPEN.attachAuthentication()`
- Token expiration monitored and dispatches `token-expiration` event

### Authentication Flow
1. Component calls `TPEN.attachAuthentication(this)` in connectedCallback
2. If no valid token, user is redirected to TPEN3 login
3. On return, token is extracted from URL and stored
4. Token attached to element and user data loaded
5. `tpen-authenticated` event dispatched

### Security Considerations
- Always validate user input
- Use prepared statements for database queries
- Implement proper CORS policies
- Sanitize HTML content before rendering
- Check user permissions before operations

## Testing

### Test Structure
Tests are located in `api/__tests__/` and use Node.js native test runner:

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Component/Class Name', () => {
    it('should do something', () => {
        // Test implementation
        assert.equal(actual, expected)
    })

    it('should handle async operations', async () => {
        await assert.rejects(asyncFn())
    })
})
```

### Running Tests
```bash
node --test api/__tests__/        # Run all API tests
node --test api/__tests__/project.test.js  # Run specific test
```

### Test Files
- `api/__tests__/project.test.js` - Project class tests
- `api/__tests__/events.test.js` - Event dispatcher tests
- `components/iiif-tools/index.test.js` - IIIF tools tests

## Configuration & Deployment

### Environment Configuration
See [Configuration (`api/config.js`)](#configuration-apiconfigjs) above for environment detection and URLs.

### Jekyll Configuration (`_config.yml`)
```yaml
title: TPEN Interfaces
description: Useful Interfaces for TPEN 3
collections:
  cookbook:
    label: TPEN Cookbook
    output: true
  classes:
    label: Class
    output: true
theme: jekyll-theme-modernist
permalink: pretty
plugins:
  - jekyll-redirect-from
```

### GitHub Actions Workflow
Automated deployment pipeline:
1. Push to main branch triggers workflow
2. Build Jekyll site
3. Deploy to GitHub Pages

## Development Guidelines

### Code Style
- Use ES6+ JavaScript features
- Follow Web Components best practices
- Implement proper error handling
- Add JSDoc comments for public methods
- Use semantic HTML in components

### Component Development
1. Create component file in appropriate `/components/` subdirectory
2. Extend HTMLElement or appropriate base class
3. Register with customElements.define()
4. Add corresponding CSS if needed
5. Write tests
6. Document usage in component file

### API Integration
1. Use TPEN class for authenticated requests
2. Handle errors gracefully with try/catch
3. Provide user feedback for async operations
4. Cache responses when appropriate
5. Implement retry logic for failed requests

### Git Workflow
1. Create feature branch from main
2. Make changes and test locally
3. Write/update tests
4. Create pull request
5. CI runs tests automatically
6. Merge after review

## Common Patterns & Best Practices

### IIIF Resource Fetching
Always use `vault` for IIIF resources. Never use raw `fetch()` for canvases, manifests, annotation pages, or annotations.

```javascript
import vault from '../../js/vault.js'

// Simple fetch — checks cache, then network
const canvas = await vault.get(canvasURI, 'canvas')

// Fetch with manifest fallback — if not found, prefetches project manifests
// and retries (useful when canvas/page might be embedded in manifest)
const page = await vault.getWithFallback(pageID, 'annotationpage', TPEN.activeProject?.manifest, true)
const canvas = await vault.getWithFallback(canvasID, 'canvas', TPEN.activeProject?.manifest)

// Force fresh fetch (bypass cache) with noCache=true
const freshPage = await vault.get(pageID, 'annotationpage', true)

// Resolve annotations that may be stubs (have target but no body)
let annotation = item
if (!annotation?.body) {
    annotation = await vault.get(item, 'annotation', true)
}
```

### Error Handling (TPEN API)
```javascript
try {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.json()
} catch (error) {
    console.error('API Error:', error)
    // Show user-friendly error message
}
```

### Component Communication
```javascript
// Parent -> Child: via attributes
<child-component data-id="123"></child-component>

// Child -> Parent: via events
this.dispatchEvent(new CustomEvent('action', {
    detail: data,
    bubbles: true
}))

// Sibling communication: via shared parent or global events
```

### Async Operations
```javascript
// Show loading state
element.classList.add('loading')

try {
    const data = await fetchData()
    renderData(data)
} finally {
    element.classList.remove('loading')
}
```

## Important Notes for AI Assistants

### When Working with This Codebase:
1. **Authentication is Critical**: Always ensure authentication is properly handled before making API calls
2. **Web Components Lifecycle**: Respect the component lifecycle - initialization in connectedCallback, cleanup in disconnectedCallback
3. **Event Bubbling**: Use bubbles: true and composed: true for events that need to cross shadow DOM boundaries
4. **IIIF Resources via Vault**: Always use `vault.get()` or `vault.getWithFallback()` for IIIF resources — never raw `fetch()`. The vault handles caching, fallback to manifest data, and IIIF v2/v3 compatibility
5. **Project Context**: Projects are the central organizing unit - users create projects, add manifests, and collaborate
6. **Error Messages**: Provide clear, user-friendly error messages, not raw API errors
7. **Testing**: Always write tests for new functionality, especially for API interactions
8. **CSS Encapsulation**: Remember that shadow DOM encapsulates styles - use CSS custom properties for theming

### Common Issues to Avoid:
- Don't forget to attach authentication to fetch requests for TPEN API calls
- Don't manipulate DOM directly in components - use render() method
- Don't store sensitive data in localStorage beyond auth tokens
- Don't make synchronous API calls - always use async/await
- Don't forget to clean up event listeners in disconnectedCallback
- Don't import `@iiif/helpers` Vault — `components/default-transcribe` still uses it and is `@deprecated`

### Development Tips:
- Use the browser's Developer Tools to inspect web components
- Test with both authenticated and unauthenticated states
- Verify CORS headers when integrating with external IIIF sources
- Use semantic versioning for releases
- Document breaking changes clearly

## Resources

### Internal Documentation
- Component usage examples in `/components/` source files
- API class documentation in `/api/` source files
- Cookbook examples in `/_cookbook/`
- Class documentation in `/_classes/`

### External Resources
- [IIIF Presentation API](https://iiif.io/api/presentation/)
- [W3C Web Annotation](https://www.w3.org/TR/annotation-model/)
- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [TPEN3 Project Homepage](https://three.t-pen.org)
- [TPEN3 Services API](https://dev.api.t-pen.org)
- [TPEN3 Services GitHub](https://github.com/CenterForDigitalHumanities/TPEN-services)
- [TPEN3 Interfaces GitHub](https://github.com/CenterForDigitalHumanities/TPEN-interfaces)

## Contact & Support

For questions about this codebase:
- Check existing issues in the GitHub repository
- Review test files for usage examples
- Consult component documentation in source files

## Additional Developer Preferences for AI Assistant Behavior

1. Do not automatically commit or push code. Developers prefer to do this themselves when the time is right.
  - Make the code changes as requested.
  - Explain what changed and why.
  - Stop before committing. The developer will decide at what point to commit changes on their own. You do not need to keep track of it.
2. No auto compacting. We will compact ourselves if the context gets too big.
3. When creating documentation do not add Claude as an @author.
4. Preference using current libraries and native javascript/Node capabilities instead of installing new npm packages to solve a problem.
  - However, we understand that sometimes we need a package or a package is perfectly designed to solve our problem. Ask if we want to use them in these cases.
5. We like colors in our terminals! Be diverse and color text in the terminal for the different purposes of the text. (ex. errors red, success green, logs bold white, etc.)
6. We like to see logs from running code, so expose those logs in the terminal logs as much as possible.
7. Use JDoc style for code documentation. Cleanup, fix, or generate documentation for the code you work on as you encounter it.
8. We use `jekyll s` to run the app locally.
