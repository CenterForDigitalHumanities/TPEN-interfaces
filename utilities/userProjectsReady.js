import TPEN from "../api/TPEN.js"

// Module-level flag to prevent multiple simultaneous fetches
let isFetching = false

/**
 * Utility to handle user projects readiness with caching.
 * Checks if projects are already loaded before fetching.
 * Triggers fetch if needed, subscribes to event for results.
 * @param {Object} ctx - The context to bind the handler to
 * @param {Function} handler - The handler function to invoke with projects
 * @returns {Function} Unsubscribe function
 */
export const onUserProjectsReady = (ctx, handler) => {
    if (!ctx || typeof handler !== 'function') return () => {}
    const bound = handler.bind(ctx)

    // Check if projects are already cached
    try {
        if (TPEN.userProjects && TPEN.userProjects.length >= 0) {
            bound(TPEN.userProjects)
        }
    } catch (_) {}

    // Subscribe to future updates
    const eventHandler = () => {
        try {
            bound(TPEN.userProjects)
        } catch (_) {}
    }
    TPEN.eventDispatcher.on('tpen-user-projects-loaded', eventHandler)

    // Trigger fetch if not already cached and not currently fetching
    if (!TPEN.userProjects && !isFetching) {
        isFetching = true
        const token = TPEN.getAuthorization()
        if (token) {
            TPEN.getUserProjects(token)
                .finally(() => { isFetching = false })
        } else {
            isFetching = false
        }
    }

    return () => TPEN.eventDispatcher.off('tpen-user-projects-loaded', eventHandler)
}
