import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

let dom
let TPEN
let NoLinesPrompt

before(async () => {
  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/?projectID=proj123&pageID=page456'
  })

  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.customElements = dom.window.customElements
  globalThis.CustomEvent = dom.window.CustomEvent
  globalThis.Event = dom.window.Event
  globalThis.EventTarget = dom.window.EventTarget
  globalThis.Node = dom.window.Node
  globalThis.location = dom.window.location
  globalThis.history = dom.window.history
  globalThis.localStorage = dom.window.localStorage
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) })

  if (!globalThis.crypto) {
    globalThis.crypto = { randomUUID: () => 'test-uuid' }
  }

  const tpenModule = await import('../../api/TPEN.js')
  TPEN = tpenModule.default
  TPEN.attachAuthentication = () => {}
  TPEN.getAuthorization = () => 'test-token'
  TPEN.activeProject = {
    _id: 'proj123',
    tools: []
  }
  TPEN.screen = {
    projectInQuery: 'proj123',
    pageInQuery: 'page456'
  }

  const componentModule = await import('./index.js')
  NoLinesPrompt = componentModule.default
})

after(() => {
  dom?.window.close()
})

describe('tpen-no-lines-prompt', () => {
  it('defers splitscreen-toggle(view-fullpage) until project-ready', () => {
    const dispatched = []
    const originalDispatch = TPEN.eventDispatcher.dispatch.bind(TPEN.eventDispatcher)
    const originalAttachAuthentication = TPEN.attachAuthentication
    let authAttachCount = 0

    TPEN.eventDispatcher.dispatch = (name, detail) => {
      dispatched.push({ name, detail })
      return originalDispatch(name, detail)
    }
    TPEN.attachAuthentication = () => {
      authAttachCount += 1
    }

    try {
      const element = new NoLinesPrompt()
      element.connectedCallback()
      assert.equal(
        dispatched.some(({ name, detail }) => name === 'splitscreen-toggle' && detail?.selectedTool === 'view-fullpage'),
        false,
        'Expected no view-fullpage request before project-ready'
      )
      assert.equal(
        authAttachCount,
        1,
        'Expected connectedCallback to attach authentication once'
      )

      TPEN.eventDispatcher.dispatch('tpen-project-loaded', {
        _id: 'proj123',
        _createdAt: '2026-05-05T00:00:00.000Z',
        tools: []
      })

      TPEN.eventDispatcher.dispatch('tpen-project-loaded', {
        _id: 'proj123',
        _createdAt: '2026-05-05T00:00:00.000Z',
        tools: []
      })

      const autoOpenDispatches = dispatched.filter(
        ({ name, detail }) => name === 'splitscreen-toggle' && detail?.selectedTool === 'view-fullpage'
      )
      assert.equal(autoOpenDispatches.length, 1, 'Expected exactly one auto view-fullpage request per mount')
      element.disconnectedCallback()
    } finally {
      TPEN.eventDispatcher.dispatch = originalDispatch
      TPEN.attachAuthentication = originalAttachAuthentication
    }
  })

  it('authgate renders, wires events, and auto-dispatches splitscreen-toggle(view-fullpage) once', () => {
    const dispatched = []
    const originalDispatch = TPEN.eventDispatcher.dispatch.bind(TPEN.eventDispatcher)
    const originalRender = NoLinesPrompt.prototype.render
    const originalAddEventListeners = NoLinesPrompt.prototype.addEventListeners
    let renderCount = 0
    let listenerCount = 0

    TPEN.eventDispatcher.dispatch = (name, detail) => {
      dispatched.push({ name, detail })
      return originalDispatch(name, detail)
    }
    NoLinesPrompt.prototype.render = function() {
      renderCount += 1
      return originalRender.call(this)
    }
    NoLinesPrompt.prototype.addEventListeners = function() {
      listenerCount += 1
      return originalAddEventListeners.call(this)
    }

    try {
      const element = new NoLinesPrompt()
      element.authgate()
      element.authgate()
      assert.equal(renderCount, 2, 'Expected authgate to render on each invocation')
      assert.equal(listenerCount, 2, 'Expected authgate to wire listeners on each invocation')
      const autoOpenDispatches = dispatched.filter(
        ({ name, detail }) => name === 'splitscreen-toggle' && detail?.selectedTool === 'view-fullpage'
      )
      assert.equal(autoOpenDispatches.length, 1, 'Expected authgate auto-open dispatch only once')
      element.disconnectedCallback()
    } finally {
      TPEN.eventDispatcher.dispatch = originalDispatch
      NoLinesPrompt.prototype.render = originalRender
      NoLinesPrompt.prototype.addEventListeners = originalAddEventListeners
    }
  })

  it('renders expected actions and tool markup from render()', () => {
    const element = new NoLinesPrompt()
    element.render()

    const shadow = element.shadowRoot
    assert.ok(shadow, 'Expected shadow root to be initialized')
    assert.ok(shadow.innerHTML.includes('Identify Lines and Columns'))
    assert.ok(shadow.innerHTML.includes('Show Page Image'))
    assert.ok(shadow.innerHTML.includes('Remove this Page from the Project'))
    assert.ok(shadow.innerHTML.includes('Import Annotations'))
    assert.ok(shadow.querySelector('tpen-splitscreen-tool'))

    const annotatorLink = shadow.querySelector('a.action-btn')
    assert.equal(
      annotatorLink?.getAttribute('href'),
      '/annotator?projectID=proj123&pageID=page456'
    )

    const importAnnotationsBtn = shadow.querySelector('#import-annotations-btn')
    assert.equal(importAnnotationsBtn?.disabled, true)
  })

  it('Show Page Image button re-dispatches splitscreen-toggle(view-fullpage)', () => {
    const dispatched = []
    const originalDispatch = TPEN.eventDispatcher.dispatch.bind(TPEN.eventDispatcher)

    TPEN.eventDispatcher.dispatch = (name, detail) => {
      dispatched.push({ name, detail })
      return originalDispatch(name, detail)
    }

    try {
      const element = new NoLinesPrompt()
      element.render()
      element.addEventListeners()

      const button = element.shadowRoot.querySelector('#show-page-image-btn')
      assert.ok(button, 'Expected Show Page Image button to exist')

      button.click()

      assert.ok(
        dispatched.some(({ name, detail }) => name === 'splitscreen-toggle' && detail?.selectedTool === 'view-fullpage'),
        'Expected Show Page Image button to dispatch splitscreen-toggle(view-fullpage)'
      )
      element.disconnectedCallback()
    } finally {
      TPEN.eventDispatcher.dispatch = originalDispatch
    }
  })

  it('recovers after close by re-triggering view-fullpage on the same event path', () => {
    const hostState = {
      activeTool: '',
      isSplitscreenActive: false,
      openCount: 0
    }
    const hostTools = document.createElement('div')

    const handleSplitscreenToggle = (event) => {
      const selectedTool = event?.detail?.selectedTool ?? ''
      hostState.activeTool = selectedTool
      hostState.isSplitscreenActive = true
      hostState.openCount += 1
      hostTools.textContent = `tool:${selectedTool}:open:${hostState.openCount}`
    }

    const closeSplitscreen = () => {
      hostState.isSplitscreenActive = false
    }

    TPEN.eventDispatcher.on('splitscreen-toggle', handleSplitscreenToggle)

    try {
      const element = new NoLinesPrompt()
      element.authgate()

      assert.equal(hostState.activeTool, 'view-fullpage')
      assert.equal(hostState.isSplitscreenActive, true)
      assert.equal(hostTools.textContent, 'tool:view-fullpage:open:1')

      closeSplitscreen()
      assert.equal(hostState.isSplitscreenActive, false)

      const button = element.shadowRoot.querySelector('#show-page-image-btn')
      assert.ok(button, 'Expected Show Page Image button to exist')
      button.click()

      assert.equal(hostState.activeTool, 'view-fullpage')
      assert.equal(hostState.isSplitscreenActive, true)
      assert.equal(hostTools.textContent, 'tool:view-fullpage:open:2')
      element.disconnectedCallback()
    } finally {
      TPEN.eventDispatcher.off('splitscreen-toggle', handleSplitscreenToggle)
    }
  })
})
