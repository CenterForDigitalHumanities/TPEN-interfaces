import TPEN from "../../api/TPEN.mjs"

class TpenHotKeys extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._hotkeys = []
    this.projectId = "676315c95f0dde3ba56ec54b" // to be replaced with ID from URL or TPEN.activeProject
    TPEN.attachAuthentication(this)
    this.loadHotkeys()
  }

  // Getter and setter for hotkeys to trigger updates
  get hotkeys() {
    return this._hotkeys
  }

  set hotkeys(value) {
    this._hotkeys = value
    this.updateHotkeysDisplay()
  }

  async loadHotkeys() {
    try {
      const AUTH_TOKEN = TPEN.getAuthorization()
      if (!AUTH_TOKEN) {
        TPEN.login() // Redirect to login if no token is found
        return
      }

      const response = await fetch(`${TPEN.servicesURL}/project/${this.projectId}/hotkeys`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        this.hotkeys = data // Use the setter to trigger a re-render
      } else {
        console.error("Failed to load hotkeys:", response.statusText)
      }
    } catch (error) {
      console.error("Error loading hotkeys:", error)
    }
  }

  async saveHotkeys() {
    try {
      const AUTH_TOKEN = TPEN.getAuthorization()
      if (!AUTH_TOKEN) {
        TPEN.login()
        return
      }

      const method = this.hotkeys.length > 0 ? "PUT" : "POST" // Use PUT if hotkeys exist, POST otherwise
      const response = await fetch(`${TPEN.servicesURL}/project/${this.projectId}/hotkeys`, {
        method,
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols: this.hotkeys }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Failed to save hotkeys:", error.message)
        alert(`Failed to save hotkeys: ${error.message}`)
      }
    } catch (error) {
      console.error("Error saving hotkeys:", error)
      alert("An error occurred while saving hotkeys. Please try again.")
    }
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
  }

  render() {
    this.shadowRoot.innerHTML = `
        <style>
          /* Add your CSS styles here */
          .hotkeys-container {
            font-family: Arial, sans-serif;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 8px;
            max-width: 400px;
            margin: 20px auto;
          }
          .hotkeys-container h2 {
            margin-top: 0;
          }
          .hotkeys-form input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .hotkeys-form button {
            padding: 8px 16px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .hotkeys-list {
            margin-top: 20px;
          }
          .hotkeys-list div {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .hotkeys-list div:last-child {
            border-bottom: none;
          }
          .character-preview {
            font-size: 24px;
            margin-left: 10px;
          }
          .loading {
            color: #888;
            font-style: italic;
          }
        </style>
        <div class="hotkeys-container">
          <h2>Hot Keys Manager</h2>
          <div class="hotkeys-form">
            <input type="text" id="symbol-input" placeholder="Enter a symbol (UTF-8)">
            <span class="character-preview" id="character-preview"></span>
            <button id="add-hotkey">Add Hotkey</button>
          </div>
          <div class="hotkeys-list">
            <h3>Saved Hotkeys</h3>
            <div id="hotkeys-display">
              ${this.hotkeys.length === 0 ? '<div class="loading">Loading hotkeys...</div>' : ''}
            </div>
          </div>
        </div>
      `
  }

  setupEventListeners() {
    const addButton = this.shadowRoot.getElementById('add-hotkey')
    addButton.addEventListener('click', () => this.addHotkey())

    const symbolInput = this.shadowRoot.getElementById('symbol-input')
    symbolInput.addEventListener('input', () => this.updateCharacterPreview())
  }

  updateCharacterPreview() {
    const symbolInput = this.shadowRoot.getElementById('symbol-input')
    const characterPreview = this.shadowRoot.getElementById('character-preview')
    const inputValue = symbolInput.value.trim()

    // Parse the input to detect a valid UTF-8 symbol
    const symbol = this.parseUtf8Symbol(inputValue)
    if (symbol) {
      characterPreview.textContent = symbol // Show the symbol
    } else {
      characterPreview.textContent = '' // Clear the preview if no valid symbol is found
    }
  }

  parseUtf8Symbol(input) {
    // Normalize the input by adding '&#' and ';' if necessary
    if (/^\d+$/.test(input)) {
      input = `&#${input};` // Convert "9728" to "&#9728;"
    } else if (/^&#\d+$/.test(input)) {
      input = `${input};` // Convert "&#9728" to "&#9728;"
    }

    const htmlEntityRegex = /^&#(\d+);$/
    const match = input.match(htmlEntityRegex)

    if (match) {
      // Convert the HTML entity to a symbol
      const codePoint = parseInt(match[1], 10)
      return String.fromCodePoint(codePoint)
    } else if (input.length === 1) {
      // If the input is a single character, assume it's a symbol
      return input
    }

    return null
  }

  generateShortcut(index) {
    // This doesn't really have to be here since we use shortcuts in the transcription interface, we may only render it there as well
    if (index < 10) {
      return `Ctrl + ${index + 1}`
    } else {
      return `Ctrl + Shift + ${index - 9}`
    }
  }

  async addHotkey() {
    const symbolInput = this.shadowRoot.getElementById('symbol-input')
    const inputValue = symbolInput.value.trim()

    const symbol = this.parseUtf8Symbol(inputValue)

    if (symbol) {
      this.hotkeys = [...this.hotkeys, symbol]
      await this.saveHotkeys()
      symbolInput.value = ''
      this.shadowRoot.getElementById('character-preview').textContent = ''
    } else {
      alert('Please enter a valid UTF-8 symbol.')
    }
  }

  updateHotkeysDisplay() {
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.innerHTML = this.hotkeys
      .map((symbol, index) => `
          <div>
            <span>${symbol}</span> - 
            <span>${this.generateShortcut(index)}</span>
            <button onclick="this.getRootNode().host.deleteHotkey(${index})">Delete</button>
          </div>
        `)
      .join('')
  }

  async deleteHotkey(index) {
    this.hotkeys = this.hotkeys.filter((_, i) => i !== index)
    await this.saveHotkeys()
  }
}

customElements.define('tpen-hot-keys', TpenHotKeys)