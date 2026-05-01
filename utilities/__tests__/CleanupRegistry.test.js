import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import '../../test/helpers/dom.js'

const { CleanupRegistry } = await import('../CleanupRegistry.js')

describe('CleanupRegistry', () => {
    describe('add()', () => {
        it('calls the cleanup function when run() is invoked', () => {
            const registry = new CleanupRegistry()
            let called = false
            registry.add(() => { called = true })
            registry.run()
            assert.equal(called, true)
        })

        it('ignores non-function values', () => {
            const registry = new CleanupRegistry()
            assert.doesNotThrow(() => {
                registry.add(null)
                registry.add(undefined)
                registry.add('string')
                registry.run()
            })
        })
    })

    describe('onWindow()', () => {
        it('registers and cleans up window event listener', () => {
            const registry = new CleanupRegistry()
            let fired = 0
            const handler = () => fired++
            registry.onWindow('custom-test-event', handler)

            window.dispatchEvent(new Event('custom-test-event'))
            assert.equal(fired, 1)

            registry.run()
            window.dispatchEvent(new Event('custom-test-event'))
            assert.equal(fired, 1)
        })

        it('returns an early unsubscribe function', () => {
            const registry = new CleanupRegistry()
            let fired = 0
            const handler = () => fired++
            const unsub = registry.onWindow('custom-test-event-2', handler)

            window.dispatchEvent(new Event('custom-test-event-2'))
            assert.equal(fired, 1)

            unsub()
            window.dispatchEvent(new Event('custom-test-event-2'))
            assert.equal(fired, 1)
        })
    })

    describe('onDocument()', () => {
        it('registers and cleans up document event listener', () => {
            const registry = new CleanupRegistry()
            let fired = 0
            const handler = () => fired++
            registry.onDocument('custom-doc-event', handler)

            document.dispatchEvent(new Event('custom-doc-event'))
            assert.equal(fired, 1)

            registry.run()
            document.dispatchEvent(new Event('custom-doc-event'))
            assert.equal(fired, 1)
        })
    })

    describe('onElement()', () => {
        it('registers and cleans up element event listener', () => {
            const registry = new CleanupRegistry()
            const el = document.createElement('div')
            let fired = 0
            const handler = () => fired++
            registry.onElement(el, 'click', handler)

            el.dispatchEvent(new Event('click'))
            assert.equal(fired, 1)

            registry.run()
            el.dispatchEvent(new Event('click'))
            assert.equal(fired, 1)
        })
    })

    describe('onEvent()', () => {
        it('registers and cleans up dispatcher event listener', () => {
            const registry = new CleanupRegistry()
            let fired = 0

            const dispatcher = {
                _handlers: new Map(),
                on(event, handler) {
                    if (!this._handlers.has(event)) this._handlers.set(event, [])
                    this._handlers.get(event).push(handler)
                },
                off(event, handler) {
                    const handlers = this._handlers.get(event) ?? []
                    const idx = handlers.indexOf(handler)
                    if (idx !== -1) handlers.splice(idx, 1)
                }
            }

            registry.onEvent(dispatcher, 'test', () => fired++)
            dispatcher._handlers.get('test')[0]()
            assert.equal(fired, 1)

            registry.run()
            assert.equal(dispatcher._handlers.get('test').length, 0)
        })
    })

    describe('run()', () => {
        it('calls all registered cleanups in order', () => {
            const registry = new CleanupRegistry()
            const order = []
            registry.add(() => order.push(1))
            registry.add(() => order.push(2))
            registry.add(() => order.push(3))
            registry.run()
            assert.deepEqual(order, [1, 2, 3])
        })
    })
})
