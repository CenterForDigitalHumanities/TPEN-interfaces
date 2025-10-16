import { eventDispatcher } from "../../api/events.js"
import TPEN from "../../api/TPEN.js"

class TpenMockTranscription extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.quicktype = []
    this.projectId = new URLSearchParams(window.location.search).get("projectID")
    TPEN.attachAuthentication(this)
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()

    eventDispatcher.on('tpen-project-loaded', (event) => {
      const project = event.detail
      this.quicktype = project.interfaces.quicktype ?? []
      this.updateQuickTypeDisplay()
    })

    eventDispatcher.on('quicktype-insert', (event) => {
      const { symbol } = event.detail
      this.insertSymbol(symbol)
    })
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
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
        .quicktype-list {
          margin-top: 20px; 
          display:flex;
          flex-wrap:wrap;
          gap:4px;
          justify-content:space-evenly
        }
        .quicktype-list div {
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
        .quicktype-list div:hover {
          background-color: #f0f0f0;
        }
      </style>
      <div class="test-container">
        <h2>Transcription Block</h2>
        <textarea id="test-input" rows="5" placeholder="Type here..."></textarea>
        <div class="quicktype-list" id="quicktype-display"></div>
      </div>
    `
  }

  setupEventListeners() {
    // Listen for clicks on the QuickType list
    const quicktypeDisplay = this.shadowRoot.getElementById('quicktype-display')
    quicktypeDisplay.addEventListener('click', (event) => {
      const quicktypeDiv = event.target.closest('div')
      if (quicktypeDiv) {
        const index = Array.from(quicktypeDisplay.children).indexOf(quicktypeDiv)
        const symbol = this.quicktype[index]
        if (symbol) {
          eventDispatcher.dispatch('quicktype-insert', { symbol })
        }
      }
    })

    // Listen for global keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleQuickType(e))
  }


  handleQuickType(event) {
    if (event.ctrlKey && !event.altKey && !event.metaKey) {
      let shortcut = ''

      // Check if a number key (0-9) was pressed
      if (event.code.startsWith('Digit')) {
        const number = event.code.replace('Digit', '')
        if (event.shiftKey) {
          shortcut = `Ctrl + Shift + ${number}` // Ctrl + Shift + number
        } else {
          shortcut = `Ctrl + ${number}` // Ctrl + number
        }
      }

      // Find the QuickType shortcut with the matching shortcut
      if (shortcut) {
        const index = this.getIndexFromShortcut(shortcut)
        if (index !== -1) {
          const symbol = this.quicktype[index]
          if (symbol) {
            event.preventDefault()
            eventDispatcher.dispatch('quicktype-insert', { symbol })
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

  updateQuickTypeDisplay() {
    const quicktypeDisplay = this.shadowRoot.getElementById('quicktype-display')
    quicktypeDisplay.innerHTML = this.quicktype
      .map((symbol, index) => `
        <div>
          <span class="symbol">${symbol}</span>
          <span class="shortcut">${this.generateShortcut(index)}</span>
        </div>
      `)
      .join('')
  }

  generateShortcut(index) {
    if (index < 10) {
      return `Ctrl + ${index + 1}`
    } else {
      return `Ctrl + Shift + ${index - 9}`
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
