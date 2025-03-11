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
          .symbol{
          font-weight:700;
          font-size:18px
          }
        .shortcut{
        font-size:10px;
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
        <div class="hotkeys-list" id="hotkeys-display"</div>
      </div>
    `
  }

  setupEventListeners() {
    // Listen for clicks on the hotkeys list
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.addEventListener('click', (event) => {
      // Find the closest parent div (hotkey container)
      const hotkeyDiv = event.target.closest('div')
      if (hotkeyDiv) {
        const index = Array.from(hotkeysDisplay.children).indexOf(hotkeyDiv)
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
          <span class="symbol">${hotkey.symbol}</span> 
          <span class="shortcut">${hotkey.shortcut}</span>
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
        const hotkey = this.hotkeys.find(h => h.shortcut === shortcut)
        if (hotkey) {
          event.preventDefault()
          this.insertSymbol(hotkey.symbol)
        }
      }
    }
  }
}

customElements.define('tpen-mock-transcriptions', TpenTestHotkeys)