import TPEN from "../../api/TPEN.mjs"

class TpenHotKeys extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._hotkeys = [] // Internal hotkeys array
    this.projectId = "676315c95f0dde3ba56ec54b" // Replace with the actual project ID
    this.tpen = TPEN // Use the shared TPEN instance
    TPEN.attachAuthentication(this) // Attach authentication
    this.loadHotkeys() // Load hotkeys from the database
  }

  // Getter and setter for hotkeys to trigger updates
  get hotkeys() {
    return this._hotkeys
  }

  set hotkeys(value) {
    this._hotkeys = value
    this.updateHotkeysDisplay() // Re-render the hotkeys list whenever the array changes
  }

  async loadHotkeys() {
    try {
      const AUTH_TOKEN = this.tpen.getAuthorization()
      if (!AUTH_TOKEN) {
        this.tpen.login() // Redirect to login if no token is found
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
      const AUTH_TOKEN = this.tpen.getAuthorization()
      if (!AUTH_TOKEN) {
        this.tpen.login() // Redirect to login if no token is found
        return
      }

      const method = this.hotkeys.length > 0 ? "PUT" : "POST" // Use PUT if hotkeys exist, POST otherwise
      const response = await fetch(`${this.tpen.servicesURL}/project/${this.projectId}/hotkeys`, {
        method,
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols: this.hotkeys }), // Send symbols array in the request body
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Failed to save hotkeys:", error.message)
        alert(`Failed to save hotkeys: ${error.message}`) // Show error message to the user
      }
    } catch (error) {
      console.error("Error saving hotkeys:", error)
      alert("An error occurred while saving hotkeys. Please try again.") // Show generic error message
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

    return null // No valid symbol detected
  }

  generateShortcut(index) {
    // Generate shortcuts like Ctrl + 1, Ctrl + 2, etc.
    if (index < 10) {
      return `Ctrl + ${index + 1}`
    } else {
      return `Ctrl + Shift + ${index - 9}` // For indices >= 10, use Ctrl + Shift + 1, etc.
    }
  }

  async addHotkey() {
    const symbolInput = this.shadowRoot.getElementById('symbol-input')
    const inputValue = symbolInput.value.trim()

    // Parse the input to get the symbol
    const symbol = this.parseUtf8Symbol(inputValue)

    if (symbol) {
      this.hotkeys = [...this.hotkeys, symbol] // Use the setter to trigger a re-render
      await this.saveHotkeys() // Save to the database
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
    this.hotkeys = this.hotkeys.filter((_, i) => i !== index) // Use the setter to trigger a re-render
    await this.saveHotkeys() // Save to the database
  }
}

customElements.define('tpen-hot-keys', TpenHotKeys)