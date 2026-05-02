// test/helpers/component-harness.js
// Mounts a custom element in jsdom and returns helpers
export function mountComponent(tagName, elementClass) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass)
  }
  const el = document.createElement(tagName)
  document.body.appendChild(el)
  return {
    element: el,
    shadowRoot: el.shadowRoot,
    waitForEvent: (eventName) => new Promise(resolve => {
      el.addEventListener(eventName, resolve, { once: true })
    })
  }
}
