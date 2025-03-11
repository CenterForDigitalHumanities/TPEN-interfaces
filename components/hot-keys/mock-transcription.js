class TpenTestHotkeys extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.hotkeys = JSON.parse(localStorage.getItem('tpen-hotkeys')) || [] // Load hotkeys from localStorage
  }

  connectedCallback() {
    this.render()
    this.setupEventListeners()
    this.updateHotkeysDisplay()
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
        }
        .hotkeys-list div {
          padding: 8px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }
        .hotkeys-list div:last-child {
          border-bottom: none;
        }
        .hotkeys-list div:hover {
          background-color: #f0f0f0;
        }
      </style>
      <div class="test-container">
        <h2>Transciption Block</h2>
        <textarea id="test-input" rows="5" placeholder="Type here..."></textarea>
        <div class="hotkeys-list" id="hotkeys-display"></div>
      </div>
    `
  }

  setupEventListeners() {
    // Listen for clicks on the hotkeys list
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.addEventListener('click', (event) => {
      if (event.target.tagName === 'DIV') {
        const index = Array.from(hotkeysDisplay.children).indexOf(event.target)
        const hotkey = this.hotkeys[index]
        if (hotkey) {
          this.insertSymbol(hotkey.symbol)
        }
      }
    })

    // Listen for global keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleHotkey(e))
  }

  updateHotkeysDisplay() {
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.innerHTML = this.hotkeys
      .map((hotkey) => `
        <div>
          <span>${hotkey.symbol}</span> - 
          <span>${hotkey.shortcut}</span>
        </div>
      `)
      .join('')
  }

  insertSymbol(symbol) {
    const testInput = this.shadowRoot.getElementById('test-input')
    if (testInput) {
      testInput.value += symbol
    }
  }

  handleHotkey(event) {
    if (event.ctrlKey && !isNaN(event.key)) {
      const index = parseInt(event.key) - 1
      if (index >= 0 && index < this.hotkeys.length) {
        const hotkey = this.hotkeys[index]
        this.insertSymbol(hotkey.symbol)
        event.preventDefault()
      }
    }
  }
}

customElements.define('tpen-mock-transcriptions', TpenTestHotkeys)