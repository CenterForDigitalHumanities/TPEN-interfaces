class TpenHotKeys extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.hotkeys = JSON.parse(localStorage.getItem('tpen-hotkeys')) || [] // Load hotkeys from localStorage
    }

    connectedCallback() {
        this.render()
        this.setupEventListeners()

        // Listen for changes to localStorage from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'tpen-hotkeys') {
                this.hotkeys = JSON.parse(event.newValue)
                this.updateHotkeysDisplay()
            }
        })
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
            <div id="hotkeys-display"></div>
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
        // Use a regular expression to detect HTML entities (e.g., &#9824;) or direct symbols
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

    addHotkey() {
        const symbolInput = this.shadowRoot.getElementById('symbol-input')
        const inputValue = symbolInput.value.trim()

        // Parse the input to get the symbol
        const symbol = this.parseUtf8Symbol(inputValue)

        if (symbol) {
            const shortcut = `Ctrl + ${this.hotkeys.length + 1}`
            this.hotkeys.push({ symbol, shortcut })
            this.saveHotkeys() // Save to localStorage
            this.updateHotkeysDisplay()
            symbolInput.value = ''
            this.shadowRoot.getElementById('character-preview').textContent = ''
        } else {
            alert('Please enter a valid UTF-8 symbol.')
        }
    }

    saveHotkeys() {
        // This implementation will change when services endpoints are ready
        localStorage.setItem('tpen-hotkeys', JSON.stringify(this.hotkeys))
    }

    updateHotkeysDisplay() {
        const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
        hotkeysDisplay.innerHTML = this.hotkeys
            .map((hotkey, index) => `
          <div>
            <span>${hotkey.symbol}</span> - 
            <span>${hotkey.shortcut}</span>
            <button onclick="this.getRootNode().host.deleteHotkey(${index})">Delete</button>
          </div>
        `)
            .join('')
    }

    deleteHotkey(index) {
        this.hotkeys.splice(index, 1)
        this.saveHotkeys() // Save to localStorage
        this.updateHotkeysDisplay()
    }
}

customElements.define('tpen-hot-keys', TpenHotKeys)