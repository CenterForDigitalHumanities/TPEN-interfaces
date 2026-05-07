// test/helpers/dom.js
// Sets up jsdom globals for TPEN-interfaces tests
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true
})

global.window = dom.window

// Selectively copy globals needed by TPEN components, skipping read-only getters
const toPropagate = [
    'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement',
    'customElements', 'document', 'Event', 'CustomEvent', 'EventTarget',
    'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
    'localStorage', 'sessionStorage', 'location'
    // Note: timers (setTimeout etc.) intentionally omitted — jsdom's versions
    // cause infinite recursion when assigned to global because they reference window.setTimeout
]

for (const key of toPropagate) {
    const val = dom.window[key]
    if (val !== undefined && !(key in global && Object.getOwnPropertyDescriptor(globalThis, key)?.writable === false)) {
        try {
            global[key] = val
        } catch {}
    }
}

try {
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true })
} catch {}

// Patch requestAnimationFrame for tests
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = cb => setTimeout(cb, 0)
}
if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = id => clearTimeout(id)
}

// Patch fetch if not present (tests should mock it)
if (!global.fetch) {
  global.fetch = () => Promise.reject(new Error('fetch not mocked'))
}
