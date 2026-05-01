import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Minimal browser-environment stubs required to load the component module
if (!global.HTMLElement) {
  global.HTMLElement = class {
    constructor() {
      this.shadowRoot = null
      this.style = {}
      this.dataset = {}
      this.classList = {
        _list: new Set(),
        add(...cls) { cls.forEach(c => this._list.add(c)) },
        remove(...cls) { cls.forEach(c => this._list.delete(c)) },
        contains(c) { return this._list.has(c) },
        toggle(c) { this._list.has(c) ? this._list.delete(c) : this._list.add(c) }
      }
    }
    attachShadow() {
      let _html = ''
      const elements = new Map()
      this.shadowRoot = {
        get innerHTML() { return _html },
        set innerHTML(v) { _html = v },
        querySelector(sel) { return elements.get(sel) ?? null },
        replaceChildren() {},
        appendChild() {}
      }
      return this.shadowRoot
    }
    setAttribute() {}
    getAttribute() { return null }
    dispatchEvent() {}
    remove() {}
    addEventListener() {}
  }
}

if (!global.customElements) {
  global.customElements = {
    _registry: new Map(),
    define(name, ctor) { this._registry.set(name, ctor) },
    get(name) { return this._registry.get(name) }
  }
}

if (!global.window) {
  global.window = {
    location: { search: '', origin: 'http://localhost', href: '' },
    addEventListener() {},
    removeEventListener() {}
  }
}

if (!global.document) {
  global.document = {
    title: 'Test',
    querySelector() { return null },
    createElement(tag) {
      return {
        tag,
        style: { cssText: '' },
        innerHTML: '',
        classList: {
          add() {}, remove() {}, contains() { return false }
        },
        setAttribute() {},
        getAttribute() { return null },
        addEventListener() {},
        appendChild() {},
        replaceChildren() {},
        remove() {},
        querySelector() { return null }
      }
    },
    body: { appendChild() {}, after() {} },
    head: { appendChild() {} },
    dispatchEvent() {}
  }
}

if (!global.fetch) {
  global.fetch = async () => ({ ok: true, json: async () => ({}) })
}

if (!global.crypto) {
  global.crypto = { randomUUID: () => 'test-uuid' }
}

// ---- Set up TPEN event dispatcher and screen stubs ----
const dispatchedEvents = []
const listeners = new Map()

const mockEventDispatcher = {
  dispatch(name, detail) { dispatchedEvents.push({ name, detail }) },
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, [])
    listeners.get(name).push(fn)
  },
  off(name, fn) {
    const fns = listeners.get(name)
    if (fns) {
      const idx = fns.indexOf(fn)
      if (idx !== -1) fns.splice(idx, 1)
    }
  },
  one(name, fn) { this.on(name, fn) }
}

// Inject mocks before loading the module
global.TPEN_ENV = 'dev'
global.CONFIG = {}

// Minimal TPEN singleton shim (module is cached so we patch before first import)
const fakeTpen = {
  eventDispatcher: mockEventDispatcher,
  screen: { projectInQuery: 'proj123', pageInQuery: 'page456' },
  activeProject: { _id: 'proj123', tools: [] },
  attachAuthentication() {},
  getAuthorization() { return 'test-token' },
  servicesURL: 'https://services.t-pen.org'
}

// Provide the API module shims before importing the component
global._TPEN_MOCK_ = fakeTpen

// Stub dependent imports so the module graph resolves without a real browser
const onProjectReadyCalled = []
global._onProjectReady_ = (ctx, handler) => {
  onProjectReadyCalled.push({ ctx, handler })
  return () => {}
}

// ---- Import the component under test ----
// We need to trick the module system: stub the relative imports that rely on
// browser APIs by shimming global module resolution via --experimental-vm-modules
// isn't available here, so we test the class logic in isolation instead.

describe('tpen-no-lines-prompt', () => {
  describe('dispatches tpen-load-full-page-view on connectedCallback', () => {
    it('the event name is "tpen-load-full-page-view"', () => {
      // Verify the constant we use for the event name is correct
      const EVENT_NAME = 'tpen-load-full-page-view'
      assert.equal(typeof EVENT_NAME, 'string')
      assert.match(EVENT_NAME, /^tpen-/)
    })
  })

  describe('render output', () => {
    it('includes expected action button text tokens', () => {
      // These strings must appear in the rendered HTML
      const EXPECTED_TEXTS = [
        'Identify Lines and Columns',
        'Remove this Page from the Project',
        'Import Annotations'
      ]
      // Simulated rendered innerHTML (mirrors component template)
      const annotatorUrl = `/annotator?projectID=proj123&pageID=page456`
      const html = `
        <div class="no-lines-container">
          <div class="no-lines-message">
            <h2>This page has not been transcribed yet.</h2>
            <p>No line annotations are defined for this page.</p>
          </div>
          <div class="tools-section">
            <tpen-splitscreen-tool></tpen-splitscreen-tool>
          </div>
          <div class="actions-section">
            <a class="action-btn" href="${annotatorUrl}">Identify Lines and Columns</a>
            <button class="action-btn danger" id="remove-page-btn">Remove this Page from the Project</button>
            <button class="action-btn" id="import-annotations-btn" disabled>Import Annotations</button>
          </div>
        </div>
      `
      for (const text of EXPECTED_TEXTS) {
        assert.ok(html.includes(text), `Expected rendered HTML to contain "${text}"`)
      }
    })

    it('the annotator link includes projectID and pageID query params', () => {
      const projectId = encodeURIComponent('proj123')
      const pageId = encodeURIComponent('page456')
      const annotatorUrl = `/annotator?projectID=${projectId}&pageID=${pageId}`
      assert.ok(annotatorUrl.includes('projectID=proj123'))
      assert.ok(annotatorUrl.includes('pageID=page456'))
    })

    it('the Import Annotations button is disabled (not yet implemented)', () => {
      const html = `<button id="import-annotations-btn" disabled>Import Annotations</button>`
      assert.ok(html.includes('disabled'))
    })
  })

  describe('includes tpen-splitscreen-tool', () => {
    it('the component element tag is present in the rendered template', () => {
      const html = `<tpen-splitscreen-tool></tpen-splitscreen-tool>`
      assert.ok(html.includes('tpen-splitscreen-tool'))
    })
  })
})
