import TPEN from "../api/TPEN.js"

// Usage: this._unsubProject = onProjectReady(this, this.authgate)
export const onProjectReady = (ctx, handler, eventName = 'tpen-project-loaded') => {
  if (!ctx || typeof handler !== 'function') return () => {}
  const bound = handler.bind(ctx)
  try {
    if (TPEN.activeProject?._createdAt) {
      bound()
    }
  } catch (_) {}
  const ed = TPEN.eventDispatcher
  ed?.on?.(eventName, bound)
  const off = () => {
    if (!ed) return
    if (typeof ed.off === 'function') ed.off(eventName, bound)
    else if (typeof ed.removeListener === 'function') ed.removeListener(eventName, bound)
    else if (typeof ed.removeEventListener === 'function') ed.removeEventListener(eventName, bound)
    else if (typeof ed.unsubscribe === 'function') ed.unsubscribe(eventName, bound)
  }
  return off
}
