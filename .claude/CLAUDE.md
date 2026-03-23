# CLAUDE.md

This file provides guidance to AI assistants when working with code in this repository.

## Project Overview

TPEN3 Interfaces is a JavaScript library that provides web components and API client functionality as TPEN Interfaces.  This application is part of the TPEN 3.0 ecosystem for transcription and paleography education and research.

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

### Event System
Components communicate via custom events and the TPEN eventDispatcher:

```javascript
// Using TPEN eventDispatcher for app-wide events
TPEN.eventDispatcher.dispatch('tpen-project-loaded', projectData)
TPEN.eventDispatcher.on('tpen-project-loaded', (ev) => {
    console.log('Project loaded:', ev.detail)
})

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
9. **Vault for IIIF Resources**: Always use `vault` to get IIIF resources. Never use a raw `fetch()` for IIIF resources.  Don't import `@iiif/helpers` Vault — use the custom `js/vault.js` singleton instead.

### Common Issues to Avoid:
- Don't forget to attach authentication to fetch requests for TPEN API calls
- Don't manipulate DOM directly in components - use render() method
- Don't store sensitive data in localStorage beyond auth tokens
- Don't make synchronous API calls - always use async/await
- Don't forget to clean up event listeners in disconnectedCallback

### External Resources
- [IIIF Presentation API](https://iiif.io/api/presentation/)
- [W3C Web Annotation](https://www.w3.org/TR/annotation-model/)
- [TPEN 3.0 Ecosystem](https://three.t-pen.org)
- [TPEN3 Interfaces GitHub](https://github.com/CenterForDigitalHumanities/TPEN-interfaces)
- [TPEN3 Services GitHub](https://github.com/CenterForDigitalHumanities/TPEN-services)
- [TinyPEN GitHub](https://github.com/CenterForDigitalHumanities/TinyPEN)
- [RERUM API GitHub](https://github.com/CenterForDigitalHumanities/rerum_server_nodejs)
- [TPEN3 Services API Documentation](https://api.t-pen.org/API.html)
- [RERUM API Documentation](https://store.rerum.io/v1/API.html)

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
