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
