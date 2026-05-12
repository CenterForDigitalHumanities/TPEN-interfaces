import TPEN from "../api/TPEN.js"

export const onProjectReady = (ctx, handler, eventName = 'tpen-project-loaded') => {
  if (!ctx || typeof handler !== 'function') return () => {}
  const bound = handler.bind(ctx)
  try {
    if (TPEN.activeProject?._createdAt) {
      bound()
    }
  } catch (_) {}
  TPEN.eventDispatcher.on(eventName, bound)
  return () => TPEN.eventDispatcher.off(eventName, bound)
}

/**
 * Context-free variant of {@link onProjectReady} for inline `<script type="module">`
 * blocks that have no element to bind to.  If the project is already loaded when
 * called, the handler is invoked synchronously with a synthetic
 * `{ detail: TPEN.activeProject }` event so existing `ev.detail.*` handler bodies
 * keep working.  Also subscribes for any future `tpen-project-loaded` dispatch.
 *
 * Closes the race described in issue #541, where the dispatch can complete before
 * an inline-script's `eventDispatcher.on(...)` registration runs.
 *
 * @param {(ev: { detail: any }) => void} handler
 * @param {string} [eventName='tpen-project-loaded']
 * @returns {() => void} unsubscribe
 */
export const whenProjectReady = (handler, eventName = 'tpen-project-loaded') => {
  if (typeof handler !== 'function') return () => {}
  try {
    if (TPEN.activeProject?._createdAt) {
      handler({ detail: TPEN.activeProject })
    }
  } catch (_) {}
  TPEN.eventDispatcher.on(eventName, handler)
  return () => TPEN.eventDispatcher.off(eventName, handler)
}
