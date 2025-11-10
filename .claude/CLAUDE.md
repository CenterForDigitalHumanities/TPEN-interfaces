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
├── js/                     # Core JavaScript API classes
│   ├── TPEN.js            # Main API client class
│   ├── Project.js         # Project management
│   ├── User.js            # User authentication/management
│   ├── Group.js           # Group/team management
│   └── utilities/         # Helper functions
├── components/            # Web Components library
│   ├── annotation/        # Annotation-related components
│   ├── canvas/           # Canvas and image handling
│   ├── dashboard/        # Dashboard UI components
│   ├── project/          # Project management components
│   ├── transcription/    # Transcription interface components
│   └── user/             # User profile components
├── css/                   # Stylesheets
│   ├── tpen.css          # Main stylesheet
│   └── components/       # Component-specific styles
├── tests/                 # Jest test files
│   ├── TPEN.test.js
│   ├── Project.test.js
│   └── User.test.js
├── _layouts/             # Jekyll layouts for GitHub Pages
├── _config.yml           # Jekyll configuration
└── package.json          # Node.js dependencies

```

## Technology Stack

### Core Technologies
- **Language**: Vanilla JavaScript (ES6+)
- **Web Standards**: Web Components, Custom Elements, Shadow DOM
- **Build System**: Jekyll (for GitHub Pages deployment)
- **Testing**: Jest
- **CI/CD**: GitHub Actions

### Key Dependencies
- **IIIF**: International Image Interoperability Framework support
- **RERUM**: Data storage and persistence layer
- **JWT**: JSON Web Tokens for authentication

## Core API Classes

### TPEN Class (`js/TPEN.js`)
Main API client that handles authentication and request management.

```javascript
// Key methods:
TPEN.attachAuthentication(event)  // Attach auth headers to fetch requests
TPEN.checkAuthentication()        // Verify current authentication status
TPEN.getAuthorization()          // Get current auth token
TPEN.logout()                    // Clear authentication
```

### Project Class (`js/Project.js`)
Manages transcription projects and their members.

```javascript
// Key methods:
new Project(projectData)         // Create project instance
project.create()                // Create new project
project.save()                  // Save project changes
project.delete()                // Delete project
project.addMember(userId, role) // Add project member
project.removeMember(userId)    // Remove project member
project.getManifests()          // Get IIIF manifests
```

### User Class (`js/User.js`)
Handles user authentication and profile management.

```javascript
// Key methods:
User.login(credentials)         // Authenticate user
User.logout()                  // Sign out user
User.profile()                 // Get user profile
User.update(userData)          // Update profile
User.getProjects()             // Get user's projects
```

### Group Class (`js/Group.js`)
Manages groups and teams for collaborative work.

```javascript
// Key methods:
new Group(groupData)           // Create group instance
group.create()                // Create new group
group.addMember(userId)        // Add group member
group.removeMember(userId)     // Remove member
group.getProjects()           // Get group projects
```

## API Endpoints

The API follows RESTful conventions with these primary endpoints:

### Authentication
- `POST /login` - User authentication
- `POST /logout` - Sign out
- `GET /user/profile` - Get current user

### Projects
- `GET /project` - List projects
- `POST /project` - Create project
- `GET /project/:id` - Get project details
- `PUT /project/:id` - Update project
- `DELETE /project/:id` - Delete project
- `POST /project/:id/addMember` - Add member
- `POST /project/:id/removeMember` - Remove member

### Manifests (IIIF)
- `GET /manifest` - List manifests
- `POST /manifest/add` - Add manifest to project
- `GET /manifest/:id` - Get manifest details

### Groups
- `GET /group` - List groups
- `POST /group` - Create group
- `PUT /group/:id` - Update group
- `DELETE /group/:id` - Delete group

## Web Components Architecture

### Component Pattern
All components follow this structure:
```javascript
class ComponentName extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
    }

    connectedCallback() {
        // Component initialization
        this.render()
        this.addEventListeners()
    }

    render() {
        // Render component HTML
    }

    static get observedAttributes() {
        return ['attribute-name']
    }

    attributeChangedCallback(name, oldValue, newValue) {
        // Handle attribute changes
    }
}

customElements.define('component-name', ComponentName)
```

### Key Components
- `<tpen-dashboard>` - Main dashboard interface
- `<project-list>` - Display user's projects
- `<project-creator>` - Create new projects
- `<manifest-panel>` - IIIF manifest viewer
- `<transcription-canvas>` - Transcription interface
- `<user-profile>` - User profile management

### Event System
Components communicate via custom events:
```javascript
// Dispatching events
this.dispatchEvent(new CustomEvent('project-created', {
    detail: { projectId: '123' },
    bubbles: true,
    composed: true
}))

// Listening for events
element.addEventListener('project-created', (e) => {
    console.log('Project created:', e.detail.projectId)
})
```

## Authentication & Security

### Token-Based Authentication
- Uses JWT (JSON Web Tokens) or RERUM bearer tokens
- Tokens stored in localStorage as 'userToken'
- Automatic token attachment to API requests via fetch interceptor

### Authentication Flow
1. User provides credentials via login component
2. API returns JWT/bearer token
3. Token stored in localStorage
4. TPEN.attachAuthentication() adds token to all fetch requests
5. Token validated on each API request

### Security Considerations
- Always validate user input
- Use prepared statements for database queries
- Implement proper CORS policies
- Sanitize HTML content before rendering
- Check user permissions before operations

## Testing

### Test Structure
Tests are located in `/tests/` and use Jest framework:
```javascript
describe('Component/Class Name', () => {
    beforeEach(() => {
        // Setup
    })

    test('should do something', () => {
        // Test implementation
    })

    afterEach(() => {
        // Cleanup
    })
})
```

### Running Tests
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
```

### Test Utilities
- Mock fetch requests with `global.fetch = jest.fn()`
- Mock localStorage with test utilities
- Test component rendering with jsdom

## Configuration & Deployment

### Environment Configuration
- **Development**: Local development server
- **Production**: GitHub Pages deployment
- Environment detection via `window.location.hostname`

### Jekyll Configuration (`_config.yml`)
```yaml
title: TPEN Interfaces
baseurl: "/tpen3-interfaces"
exclude: [node_modules, tests, package*.json]
```

### GitHub Actions Workflow
Automated deployment pipeline:
1. Push to main branch triggers workflow
2. Run tests
3. Build Jekyll site
4. Deploy to GitHub Pages

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
4. Add corresponding CSS in `/css/components/`
5. Write tests in `/tests/`
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

### Error Handling
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
4. **IIIF Standards**: When working with manifests, follow IIIF Presentation API standards
5. **Project Context**: Projects are the central organizing unit - users create projects, add manifests, and collaborate
6. **Error Messages**: Provide clear, user-friendly error messages, not raw API errors
7. **Testing**: Always write tests for new functionality, especially for API interactions
8. **CSS Encapsulation**: Remember that shadow DOM encapsulates styles - use CSS custom properties for theming

### Common Issues to Avoid:
- Don't forget to attach authentication to fetch requests
- Don't manipulate DOM directly in components - use render() method
- Don't store sensitive data in localStorage beyond auth tokens
- Don't make synchronous API calls - always use async/await
- Don't forget to clean up event listeners in disconnectedCallback

### Development Tips:
- Use the browser's Developer Tools to inspect web components
- Test with both authenticated and unauthenticated states
- Verify CORS headers when integrating with external IIIF sources
- Use semantic versioning for releases
- Document breaking changes clearly

## Resources

### Internal Documentation
- Component usage examples in `/components/README.md`
- API documentation in `/js/README.md`
- Test examples in `/tests/`

### External Resources
- [IIIF Presentation API](https://iiif.io/api/presentation/)
- [W3C Web Annotation](https://www.w3.org/TR/annotation-model/)
- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
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

1. Do not automatically commit or push code.  Developers prefer to do this themselves when the time is right.
  - Make the code changes as requested.
  - Explain what changed and why.
  - Stop before committing.  The developer will decide at what point to commit changes on their own.  You do not need to keep track of it.
2. No auto compacting.  We will compact ourselves if the context gets too big.
3. When creating documentation do not add Claude as an @author.
4. Preference using current libraries and native javascript/Node capabilities instead of installing new npm packages to solve a problem.
  - However, we understand that sometimes we need a package or a package is perfectly designed to solve our problem.  Ask if we want to use them in these cases.
5. We like colors in our terminals!  Be diverse and color text in the terminal for the different purposes of the text.  (ex. errors red, success green, logs bold white, etc.)
6. We like to see logs from running code, so expose those logs in the terminal logs as much as possible.
7. Use JDoc style for code documentation.  Cleanup, fix, or generate documentation for the code you work on as you encounter it.
8. We use `jekyll s` to run the app locally.