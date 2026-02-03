import TPEN from "../api/TPEN.js"
import User from "../api/User.js"
import { getUserFromToken } from "../components/iiif-tools/index.js"

// Module-level flag to prevent multiple simultaneous user fetches
let isFetchingUser = false

/**
 * Utility to handle user data readiness, similar to onProjectReady.
 * Immediately invokes handler if user is already loaded, also subscribes to updates.
 * Triggers user fetch if not already loaded and not currently fetching.
 * @param {Object} ctx - The context to bind the handler to
 * @param {Function} handler - The handler function to invoke when user is ready
 * @param {string} eventName - The event name to listen for (default: 'tpen-user-loaded')
 * @returns {Function} Unsubscribe function
 */
export const onUserReady = (ctx, handler, eventName = 'tpen-user-loaded') => {
    if (!ctx || typeof handler !== 'function') return () => {}
    const bound = handler.bind(ctx)

    // Check if user is already loaded (has _id and displayName)
    const userLoaded = TPEN.currentUser?._id && TPEN.currentUser?.displayName
    try {
        if (userLoaded) {
            bound(TPEN.currentUser)
        }
    } catch (_) {}

    // Subscribe to future updates (extract user from event detail, unlike onProjectReady which passes no args)
    const eventHandler = (ev) => bound(ev.detail)
    TPEN.eventDispatcher.on(eventName, eventHandler)

    // Trigger user fetch if not already loaded and not currently fetching
    if (!userLoaded && !isFetchingUser) {
        const token = TPEN.getAuthorization()
        if (token) {
            const userId = getUserFromToken(token)
            if (userId) {
                isFetchingUser = true
                const user = new User(userId)
                user.authentication = token
                user.getProfile()
                    .finally(() => { isFetchingUser = false })
            }
        }
    }

    return () => TPEN.eventDispatcher.off(eventName, eventHandler)
}
