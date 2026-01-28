/**
 * CleanupRegistry - A lightweight helper for managing event listener cleanup in web components.
 * Tracks all registered event listeners and provides a single cleanup method.
 *
 * @example
 * class MyComponent extends HTMLElement {
 *     cleanup = new CleanupRegistry()
 *
 *     connectedCallback() {
 *         this.cleanup.onEvent(TPEN.eventDispatcher, 'tpen-project-loaded', this.render.bind(this))
 *         this.cleanup.onWindow('resize', this.handleResize.bind(this))
 *         this.cleanup.onDocument('click', this.handleClick.bind(this))
 *     }
 *
 *     disconnectedCallback() {
 *         this.cleanup.run()
 *     }
 * }
 */
export class CleanupRegistry {
    /** @type {Array<Function>} Array of cleanup functions to execute */
    #handlers = []

    /**
     * Add a custom cleanup function to be called during cleanup.
     * @param {Function} cleanupFn - Function to call during cleanup
     */
    add(cleanupFn) {
        if (typeof cleanupFn === 'function') {
            this.#handlers.push(cleanupFn)
        }
    }

    /**
     * Register an event listener on a TPEN eventDispatcher and track for cleanup.
     * @param {Object} dispatcher - Event dispatcher object with on/off methods
     * @param {string} event - Event name to listen for
     * @param {Function} handler - Event handler function
     */
    onEvent(dispatcher, event, handler) {
        dispatcher.on(event, handler)
        this.#handlers.push(() => dispatcher.off(event, handler))
    }

    /**
     * Register an event listener on the window object and track for cleanup.
     * @param {string} event - Event name to listen for
     * @param {Function} handler - Event handler function
     * @param {Object} [options] - addEventListener options
     */
    onWindow(event, handler, options) {
        window.addEventListener(event, handler, options)
        this.#handlers.push(() => window.removeEventListener(event, handler, options))
    }

    /**
     * Register an event listener on the document object and track for cleanup.
     * @param {string} event - Event name to listen for
     * @param {Function} handler - Event handler function
     * @param {Object} [options] - addEventListener options
     */
    onDocument(event, handler, options) {
        document.addEventListener(event, handler, options)
        this.#handlers.push(() => document.removeEventListener(event, handler, options))
    }

    /**
     * Register an event listener on a DOM element and track for cleanup.
     * @param {Element} element - DOM element to attach listener to
     * @param {string} event - Event name to listen for
     * @param {Function} handler - Event handler function
     * @param {Object} [options] - addEventListener options
     */
    onElement(element, event, handler, options) {
        element?.addEventListener(event, handler, options)
        this.#handlers.push(() => element?.removeEventListener(event, handler, options))
    }

    /**
     * Track a ResizeObserver for cleanup.
     * @param {ResizeObserver} observer - ResizeObserver instance
     */
    addObserver(observer) {
        this.#handlers.push(() => observer?.disconnect())
    }

    /**
     * Track a MutationObserver for cleanup.
     * @param {MutationObserver} observer - MutationObserver instance
     */
    addMutationObserver(observer) {
        this.#handlers.push(() => observer?.disconnect())
    }

    /**
     * Execute all cleanup functions. Safe to call multiple times.
     * Errors in individual cleanup functions are caught and logged.
     */
    run() {
        for (const cleanup of this.#handlers) {
            try {
                cleanup()
            } catch (e) {
                // Silently handle cleanup errors - component may have already been cleaned
            }
        }
        this.#handlers = []
    }

    /**
     * Check if there are any registered cleanup handlers.
     * @returns {boolean} True if handlers are registered
     */
    get hasHandlers() {
        return this.#handlers.length > 0
    }
}

export default CleanupRegistry
