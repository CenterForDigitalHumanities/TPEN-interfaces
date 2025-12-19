import { EventDispatcher } from "../events.js"
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe("EventDispatcher", () => {
    describe("on()", () => {
        it("should register an event listener that fires multiple times", () => {
            const dispatcher = new EventDispatcher()
            let count = 0
            
            dispatcher.on('test-event', () => {
                count++
            })
            
            dispatcher.dispatch('test-event')
            dispatcher.dispatch('test-event')
            dispatcher.dispatch('test-event')
            
            assert.equal(count, 3)
        })

        it("should pass event detail to the listener", () => {
            const dispatcher = new EventDispatcher()
            let receivedDetail = null
            
            dispatcher.on('test-event', (event) => {
                receivedDetail = event.detail
            })
            
            dispatcher.dispatch('test-event', { foo: 'bar' })
            
            assert.deepEqual(receivedDetail, { foo: 'bar' })
        })
    })

    describe("one()", () => {
        it("should register an event listener that fires only once", () => {
            const dispatcher = new EventDispatcher()
            let count = 0
            
            dispatcher.one('test-event', () => {
                count++
            })
            
            dispatcher.dispatch('test-event')
            dispatcher.dispatch('test-event')
            dispatcher.dispatch('test-event')
            
            assert.equal(count, 1)
        })

        it("should pass event detail to the one-time listener", () => {
            const dispatcher = new EventDispatcher()
            let receivedDetail = null
            
            dispatcher.one('test-event', (event) => {
                receivedDetail = event.detail
            })
            
            dispatcher.dispatch('test-event', { foo: 'bar' })
            
            assert.deepEqual(receivedDetail, { foo: 'bar' })
        })

        it("should auto-remove the listener after first execution", () => {
            const dispatcher = new EventDispatcher()
            let callCount = 0
            
            dispatcher.one('test-event', () => {
                callCount++
            })
            
            // First dispatch - should trigger
            dispatcher.dispatch('test-event')
            assert.equal(callCount, 1)
            
            // Second dispatch - should not trigger
            dispatcher.dispatch('test-event')
            assert.equal(callCount, 1)
            
            // Third dispatch - should still not trigger
            dispatcher.dispatch('test-event')
            assert.equal(callCount, 1)
        })

        it("should work with multiple one() listeners on the same event", () => {
            const dispatcher = new EventDispatcher()
            let count1 = 0
            let count2 = 0
            
            dispatcher.one('test-event', () => {
                count1++
            })
            
            dispatcher.one('test-event', () => {
                count2++
            })
            
            dispatcher.dispatch('test-event')
            assert.equal(count1, 1)
            assert.equal(count2, 1)
            
            dispatcher.dispatch('test-event')
            assert.equal(count1, 1)
            assert.equal(count2, 1)
        })

        it("should work alongside regular on() listeners", () => {
            const dispatcher = new EventDispatcher()
            let onCount = 0
            let oneCount = 0
            
            dispatcher.on('test-event', () => {
                onCount++
            })
            
            dispatcher.one('test-event', () => {
                oneCount++
            })
            
            dispatcher.dispatch('test-event')
            assert.equal(onCount, 1)
            assert.equal(oneCount, 1)
            
            dispatcher.dispatch('test-event')
            assert.equal(onCount, 2)
            assert.equal(oneCount, 1)
            
            dispatcher.dispatch('test-event')
            assert.equal(onCount, 3)
            assert.equal(oneCount, 1)
        })
    })

    describe("off()", () => {
        it("should remove a registered event listener", () => {
            const dispatcher = new EventDispatcher()
            let count = 0
            
            const listener = () => {
                count++
            }
            
            dispatcher.on('test-event', listener)
            dispatcher.dispatch('test-event')
            assert.equal(count, 1)
            
            dispatcher.off('test-event', listener)
            dispatcher.dispatch('test-event')
            assert.equal(count, 1)
        })
    })

    describe("dispatch()", () => {
        it("should dispatch an event with no detail", () => {
            const dispatcher = new EventDispatcher()
            let fired = false
            
            dispatcher.on('test-event', () => {
                fired = true
            })
            
            dispatcher.dispatch('test-event')
            assert.equal(fired, true)
        })

        it("should dispatch an event with detail", () => {
            const dispatcher = new EventDispatcher()
            let receivedDetail = null
            
            dispatcher.on('test-event', (event) => {
                receivedDetail = event.detail
            })
            
            dispatcher.dispatch('test-event', { test: 'data' })
            assert.deepEqual(receivedDetail, { test: 'data' })
        })
    })
})
