class EventDispatcher extends EventTarget {
    constructor() {
        super()
    }

    // Method to add an event listener
    on(event, listener) {
        this.addEventListener(event, listener)
    }

    // Method to add a one-time event listener that auto-removes after first execution
    one(event, listener) {
        this.addEventListener(event, listener, { once: true })
    }

    // Method to remove an event listener
    off(event, listener) {
        this.removeEventListener(event, listener)
    }

    // Method to dispatch an event
    dispatch(event, detail = {}) {
        this.dispatchEvent(new CustomEvent(event, { detail }))
    }
}

// Export a shared instance of EventDispatcher
const eventDispatcher = new EventDispatcher()
export { eventDispatcher, EventDispatcher }
