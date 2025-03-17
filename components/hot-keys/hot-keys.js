import { eventDispatcher } from "../../api/events.mjs"
import TPEN from "../../api/TPEN.mjs"

class TpenHotKeys extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._hotkeys = []
    this.projectId = new URLSearchParams(window.location.search).get("projectID")
    TPEN.attachAuthentication(this)
  }


  get hotkeys() {
    return this._hotkeys
  }

  set hotkeys(value) {
    this._hotkeys = value
    this.updateHotkeysDisplay()
  }

  async saveHotkeys(updatedKeys) {
    try {
      const AUTH_TOKEN = TPEN.getAuthorization()

      if (!AUTH_TOKEN) {
        TPEN.login()
        return
      }

      const method = this.hotkeys.length ? "PUT" : "POST" // Use PUT if hotkeys exist, POST otherwise
      const response = await fetch(`${TPEN.servicesURL}/project/${this.projectId}/hotkeys`, {
        method,
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols: updatedKeys }),
      })

      let toast = { message: "", status: "" }

      if (!response.ok) {
        const error = await response.json()
        toast.message = `Failed to save hotkeys: ${error.message}`
        toast.status = "error"
      } else {
        this.hotkeys = updatedKeys
        toast.message = "Hotkeys updated successfully"
        toast.status = "info"
      }

      eventDispatcher.dispatch("tpen-toast", toast)
    } catch (error) {
      eventDispatcher.dispatch("tpen-toast", {
        message: error.toString(),
        status: "error"
      })
    }
  }


  connectedCallback() {
    this.render()
    this.setupEventListeners()

    eventDispatcher.on('tpen-project-loaded', (event) => {
      const project = event.detail
      this.hotkeys = project.options.hotkeys ?? []
    })
  }

  render() {
    this.shadowRoot.innerHTML = `
        <style>
          .hotkeys-container {
            font-family: Arial, sans-serif;
            padding: 20px;
            border-radius: 8px;
            margin: 20px auto;
            display:flex;
            gap:20px;
            align-items:flex-start;
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

          .hotkey-row{
          display:flex;
          gap:10px;
          align-items:center;
          }

          .hotkey{
          display:flex;
          flex-direction:column;
          align-items:center;
          }

          .symbol {
          font-weight:700;
          font-size:18px
        }
        .shortcut {
          font-size:10px;
        }
  .delete {
    width: 20px;
    font-weight: 600;
    color: red;
    user-select: none;
    cursor: pointer;
  }

          .special-characters {
            margin-top: 20px;
          }
          .accordion {
            margin-bottom: 10px;
          }
          .accordion-header {
            padding: 10px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }
          .accordion-content {
            padding: 10px;
            border: 1px solid #ccc;
            border-top: none;
            border-radius: 0 0 4px 4px;
            display: none;
          }
          .accordion-content.open {
            display: block;
          }
          .special-character {
            display: inline-block;
            margin: 5px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }
          .special-character:hover {
            background-color: #f0f0f0;
          }

            .special-characters{
            width:100%
            }
        </style>
        <div class="hotkeys-container">
        <section>
          <h2>Hot Keys Manager</h2>
          <div class="hotkeys-form">
            <input type="text" id="symbol-input" maxLength="2" placeholder="Enter a symbol (UTF-8)">

            <button id="add-hotkey">Add Hotkey</button>
          </div>
          <div class="hotkeys-list">
            <h3>Saved Hotkeys</h3>
            <div id="hotkeys-display">
            ${this.hotkeys ? '<div class="loading">Loading hotkeys...</div>' : ''}</div>
          </div>
        </section>

          <div class="special-characters">
            <h3>Special Characters for Paleography in UTF-8</h3>
            ${this.renderSpecialCharacters()}
          </div>
        </div>
      `
  }

  renderSpecialCharacters() {
    const specialCharacters = [
      {
        title: "Medieval English and Old Norse",
        characters: [
          { symbol: "Þ", description: "Thorn (Þ, þ): Represents 'th' sounds." },
          { symbol: "ð", description: "Eth (Ð, ð): Another 'th' sound, used interchangeably with thorn." },
          { symbol: "Ȝ", description: "Yogh (Ȝ, ȝ): Represents 'gh' or 'y' sounds." },
          { symbol: "Ƿ", description: "Wynn (Ƿ, ƿ): Represents 'w' sounds." },
          { symbol: "Æ", description: "Ash (Æ, æ): A ligature of 'a' and 'e.'" },
          { symbol: "⁊", description: "Tironian et (⁊): Used as an abbreviation for 'and.'" },
        ],
      },
      {
        title: "Latin Manuscripts",
        characters: [
          { symbol: "¯", description: "Macron (¯): Indicates a long vowel." },
          { symbol: "˘", description: "Breve (˘): Indicates a short vowel." },
          { symbol: "Œ", description: "Ligatures (Œ, œ): Common in Latin texts." },
          { symbol: "·", description: "Overdots (·): Used for abbreviation or punctuation." },
        ],
      },
      {
        "title": "Greek Manuscripts",
        "characters": [
          { "symbol": "Ϙ", "description": "Koppa (Ϙ, ϙ): An archaic Greek letter." },
          { "symbol": "Ϝ", "description": "Digamma (Ϝ, ϝ): Represents a \"w\" sound in early Greek." },
          { "symbol": "ϴ", "description": "Theta with a dot (ϴ): Variant of theta." },
          { "symbol": "Ϲ", "description": "Lunate Sigma (Ϲ, ϲ): A variant of sigma." }
        ]
      },
      {
        "title": "Hebrew and Aramaic Manuscripts",
        "characters": [
          { "symbol": "א", "description": "Aleph (א): Represents a glottal stop." },
          { "symbol": "שׁ", "description": "Shin with dot (שׁ): Differentiates \"sh\" from \"s.\"" },
          { "symbol": "ך", "description": "Final forms (ך, ם, ן, ף, ץ): Special forms of letters at the end of words." },
          { "symbol": "ם", "description": "Final forms (ך, ם, ן, ף, ץ): Special forms of letters at the end of words." },
          { "symbol": "ן", "description": "Final forms (ך, ם, ן, ף, ץ): Special forms of letters at the end of words." },
          { "symbol": "ף", "description": "Final forms (ך, ם, ן, ף, ץ): Special forms of letters at the end of words." },
          { "symbol": "ץ", "description": "Final forms (ך, ם, ן, ף, ץ): Special forms of letters at the end of words." }
        ]
      },
      {
        "title": "Arabic Manuscripts",
        "characters": [
          { "symbol": "ء", "description": "Hamza (ء): Represents a glottal stop." },
          { "symbol": "آ", "description": "Alef with Madda (آ): A long \"a\" sound." },
          { "symbol": "ة", "description": "Teh Marbuta (ة): A feminine ending." },
          { "symbol": "ّ", "description": "Shadda (ّ): Indicates gemination." }
        ]
      },
      {
        "title": "Runic Scripts",
        "characters": [
          { "symbol": "ᚠ", "description": "Fehu (ᚠ): Represents \"f.\"" },
          { "symbol": "ᚦ", "description": "Thurisaz (ᚦ): Represents \"th.\"" },
          { "symbol": "ᚨ", "description": "Ansuz (ᚨ): Represents \"a.\"" },
          { "symbol": "ᛟ", "description": "Othala (ᛟ): Represents \"o.\"" }
        ]
      },
      {
        "title": "Cyrillic Manuscripts",
        "characters": [
          { "symbol": "Ѣ", "description": "Yat (Ѣ, ѣ): Represents a historical vowel." },
          { "symbol": "Ѵ", "description": "Izhitsa (Ѵ, ѵ): Represents \"v.\"" },
          { "symbol": "Ъ", "description": "Hard Sign (Ъ): A silent letter or separator." },
          { "symbol": "Ь", "description": "Soft Sign (Ь): Indicates palatalization." }
        ]
      },
      {
        "title": "Miscellaneous Symbols",
        "characters": [
          { "symbol": "¶", "description": "Pilcrow (¶): Marks a new paragraph." },
          { "symbol": "§", "description": "Section Sign (§): Used for sections or divisions." },
          { "symbol": "÷", "description": "Obelus (÷): Indicates a doubtful passage." },
          { "symbol": "†", "description": "Dagger (†): Marks footnotes or annotations." }
        ]
      }
    ]

    return specialCharacters
      .map(
        (category) => `
          <div class="accordion">
            <div class="accordion-header">${category.title}</div>
            <div class="accordion-content">
              ${category.characters
            .map(
              (char) => `
                    <div class="special-character" data-symbol="${char.symbol}">
                      <span>${char.symbol}</span> - ${char.description}
                    </div>
                  `
            )
            .join("")}
            </div>
          </div>
        `
      )
      .join("")
  }

  setupEventListeners() {
    const addButton = this.shadowRoot.getElementById('add-hotkey')
    addButton.addEventListener('click', () => this.addHotkey())


    // Event listeners for accordions
    const accordionHeaders = this.shadowRoot.querySelectorAll('.accordion-header')
    accordionHeaders.forEach((header) => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling
        content.classList.toggle('open')
      })
    })

    // Add event listeners for special characters
    const specialCharacters = this.shadowRoot.querySelectorAll('.special-character')
    specialCharacters.forEach((char) => {
      char.addEventListener('click', () => {
        const symbol = char.getAttribute('data-symbol')
        navigator.clipboard.writeText(symbol).then(() => {

          const toast = {
            message: `Copied ${symbol} to clipboard!`,
            status: 'info'
          }
          eventDispatcher.dispatch("tpen-toast", toast)
        })
      })
    })
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
    const symbol = symbolInput.value.trim()

    if (symbol) {
      let updatedKeys = [...this.hotkeys, symbol]
      await this.saveHotkeys(updatedKeys)
      symbolInput.value = ''
    } else {
      alert('Please enter a valid UTF-8 symbol.')
    }
  }

  updateHotkeysDisplay() {
    const hotkeysDisplay = this.shadowRoot.getElementById('hotkeys-display')
    hotkeysDisplay.innerHTML = this.hotkeys
      .map((symbol, index) => `
          <div class="hotkey-row">
          <div class="hotkey">
            <span class="symbol">${symbol}</span> 
            <span class="shortcut">${this.generateShortcut(index)}</span>
          </div>
          <div onclick="this.getRootNode().host.deleteHotkey(${index})" class="delete">&#128465;</div>
          </div>
        `)
      .join('')
  }

  async deleteHotkey(index) {
    let updatedHotkeys = this.hotkeys.filter((_, i) => i !== index)

    if(updatedHotkeys.length){
      return await this.saveHotkeys(updatedHotkeys)
    }

    try {
      const AUTH_TOKEN = TPEN.getAuthorization()

      if (!AUTH_TOKEN) {
        TPEN.login()
        return
      } 
 
      const response = await fetch(`${TPEN.servicesURL}/project/${this.projectId}/hotkeys`, {
        method:"DELETE",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          "Content-Type": "application/json",
        }
      })

      let toast = { message: "", status: "" }

      if (!response.ok) {
        const error = await response.json()
        toast.message = `Failed to delete hotkeys: ${error.message}`
        toast.status = "error"
      } else {
        this.hotkeys = updatedKeys
        toast.message = "Hotkeys deleted successfully"
        toast.status = "info"
      }

      eventDispatcher.dispatch("tpen-toast", toast)
    } catch (error) {
      eventDispatcher.dispatch("tpen-toast", {
        message: error.toString(),
        status: "error"
      })
    }

  }
}

customElements.define('tpen-hot-keys', TpenHotKeys)