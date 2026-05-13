import TPEN from "../api/TPEN.js"

/**
 * Bind `handler` to `ctx` and invoke it when the active project is ready.
 * Intended for component lifecycle use where the handler needs a `this`
 * context (typically a custom element).  If the project is already loaded
 * when called, the bound handler is invoked synchronously and no listener
 * is registered.  Otherwise, subscribes for the next `tpen-project-loaded`
 * dispatch.  The sync path and the listener are mutually exclusive — the
 * handler is invoked exactly once for the load.
 * @param {object} ctx - Object to bind the handler to (e.g. a component instance).
 * @param {(this: object, ev?: { detail: any }) => void} handler
 * @param {string} [eventName='tpen-project-loaded']
 * @returns {() => void} unsubscribe (no-op when invoked synchronously or when ctx/handler is missing)
 */
export const onProjectReady = (ctx, handler, eventName = 'tpen-project-loaded') => {
  if (!ctx || typeof handler !== 'function') return () => {}
  const bound = handler.bind(ctx)
  if (TPEN.activeProject?._createdAt) {
    try {
      bound()
    } catch (err) {
      console.error('[onProjectReady] handler threw during sync invocation:', err)
    }
    return () => {}
  }
  TPEN.eventDispatcher.on(eventName, bound)
  return () => TPEN.eventDispatcher.off(eventName, bound)
}

/**
 * Context-free variant of {@link onProjectReady} for inline `<script type="module">`
 * blocks that have no element to bind to.  If the project is already loaded when
 * called, the handler is invoked synchronously with a synthetic
 * `{ detail: TPEN.activeProject }` event so existing `ev.detail.*` handler bodies
 * keep working, and no listener is registered.  Otherwise, subscribes for the
 * next `tpen-project-loaded` dispatch.  The sync path and the listener are
 * mutually exclusive — the handler is invoked exactly once for the load.
 * @param {(ev: { detail: any }) => void} handler
 * @param {string} [eventName='tpen-project-loaded']
 * @returns {() => void} unsubscribe (no-op when invoked synchronously)
 */
export const whenProjectReady = (handler, eventName = 'tpen-project-loaded') => {
  if (typeof handler !== 'function') return () => {}
  if (TPEN.activeProject?._createdAt) {
    try {
      handler({ detail: TPEN.activeProject })
    } catch (err) {
      console.error('[whenProjectReady] handler threw during sync invocation:', err)
    }
    return () => {}
  }
  TPEN.eventDispatcher.on(eventName, handler)
  return () => TPEN.eventDispatcher.off(eventName, handler)
}
