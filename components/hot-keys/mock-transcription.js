import { eventDispatcher } from "../../api/events.mjs"
import TPEN from "../../api/TPEN.mjs"

class TpenMockTranscription extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.hotkeys = [] 
    this.projectId = "676315c95f0dde3ba56ec54b" // We'd get this from URL or TPEN.activeProject
    this.tpen = TPEN
    TPEN.attachAuthentication(this)
    this.loadHotkeys()
  }

  async loadHotkeys() {
    try {
      const AUTH_TOKEN = this.tpen.getAuthorization()
      if (!AUTH_TOKEN) {
        this.tpen.login()
        return
      }

      const response = await fetch(`${this.tpen.servicesURL}/project/${this.projectId}/hotkeys`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        this.hotkeys = data || []
        this.updateHotkeysDisplay()
      } else {
        console.error("Failed to load hotkeys:", response.statusText)
      }
    } catch (error) {
      console.error("Error loading hotkeys:", error)
    }
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()

    this.addEventListener('hotkey-insert', (event) => {
      const { symbol } = event.detail
      this.insertSymbol(symbol)
    })
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Add your CSS styles here */
        .test-container {
          font-family: Arial, sans-serif;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          max-width: 400px;
          margin: 20px auto;
        }
        .test-container h2 {
          margin-top: 0;
        }
        .test-container textarea {
          width: 100%;
          padding: 8px;
          margin-bottom: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .hotkeys-list {
          margin-top: 20px; 
          display:flex;
          flex-wrap:wrap;
          gap:4px;
          justify-content:space-evenly
        }
        .hotkeys-list div {
          padding: 8px;
          border: 1px solid #eee;
          cursor: pointer;
          display:flex;
          flex-direction:column;
          align-items:center
        }
        .symbol {
          font-weight:700;
          font-size:18px
        }
        .shortcut {
          font-size:10px;
        }
        .hotkeys-list div:hover {
          background-color: #f0f0f0;
        }
      </style>
      <div class="test-container">
        <h2>Transcription Block</h2>
        <textarea id="test-input" rows="5" placeholder="Type here..."></textarea>
        <div class="hotkeys-list" id="hotkeys-display"></div>
      </div>
    `
  }

  setupEventListeners() {
    // Listen for clicks on the hotkeys list
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.addEventListener('click', (event) => {
      const hotkeyDiv = event.target.closest('div')
      if (hotkeyDiv) {
        const index = Array.from(hotkeysDisplay.children).indexOf(hotkeyDiv)
        const symbol = this.hotkeys[index]
        if (symbol) {
          this.dispatchInsertEvent(symbol)
        }
      }
    })

    // Listen for global keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleHotkey(e))
  }

  dispatchInsertEvent(symbol) {
    // Dispatch a custom event to insert the symbol
    const event = new CustomEvent('hotkey-insert', {
      detail: { symbol },
      bubbles: true,
      composed: true,
    })
    eventDispatcher.dispatch(event)
    // this.dispatchEvent(event)
  }

  handleHotkey(event) {
    if (event.ctrlKey && !event.altKey && !event.metaKey) {
      let shortcut = ''

      // Check if a number key (0-9) was pressed
      if (event.code.startsWith('Digit')) {
        const number = event.code.replace('Digit', '') // Extract the number from the code
        if (event.shiftKey) {
          shortcut = `Ctrl + Shift + ${number}` // Ctrl + Shift + number
        } else {
          shortcut = `Ctrl + ${number}` // Ctrl + number
        }
      }

      // Find the hotkey with the matching shortcut
      if (shortcut) {
        const index = this.getIndexFromShortcut(shortcut)
        if (index !== -1) {
          const symbol = this.hotkeys[index]
          if (symbol) {
            event.preventDefault()
            this.dispatchInsertEvent(symbol)
          }
        }
      }
    }
  }

  getIndexFromShortcut(shortcut) {
    // Extract the number from the shortcut string
    const numberMatch = shortcut.match(/\d+/)
    if (numberMatch) {
      const number = parseInt(numberMatch[0], 10)
      if (shortcut.includes('Shift')) {
        return number + 9 // For Ctrl + Shift + 1, return index 10, etc.
      } else {
        return number - 1 // For Ctrl + 1, return index 0, etc.
      }
    }
    return -1 // No match found
  }

  updateHotkeysDisplay() {
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.innerHTML = this.hotkeys
      .map((symbol, index) => `
        <div>
          <span class="symbol">${symbol}</span>
          <span class="shortcut">${this.generateShortcut(index)}</span>
        </div>
      `)
      .join('')
  }

  generateShortcut(index) {
    // Generate shortcuts like Ctrl + 1, Ctrl + 2, etc.
    if (index < 10) {
      return `Ctrl + ${index + 1}`
    } else {
      return `Ctrl + Shift + ${index - 9}` // For indices >= 10, use Ctrl + Shift + 1, etc.
    }
  }

  insertSymbol(symbol) {
    const testInput = this.shadowRoot.getElementById('test-input')
    if (testInput) {
      testInput.value += symbol
    }
  }
}

customElements.define('tpen-mock-transcription', TpenMockTranscription)