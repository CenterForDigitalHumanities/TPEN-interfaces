// test/helpers/dom.js
// Sets up jsdom globals for TPEN-interfaces tests
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true
})

global.window = dom.window
Object.assign(global, dom.window)
global.document = dom.window.document

global.HTMLElement = dom.window.HTMLElement

global.customElements = dom.window.customElements

global.navigator = dom.window.navigator

global.localStorage = dom.window.localStorage

global.Event = dom.window.Event

global.CustomEvent = dom.window.CustomEvent

global.EventTarget = dom.window.EventTarget

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
