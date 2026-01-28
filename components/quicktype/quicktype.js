import TPEN from "../../api/TPEN.js"
import { CleanupRegistry } from '../../utilities/CleanupRegistry.js'

const eventDispatcher = TPEN.eventDispatcher

/**
 * TpenQuickType - Quicktype shortcut panel for transcription interfaces.
 * @element tpen-quicktype
 */
class TpenQuickType extends HTMLElement {
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._quicktype = []
  }

  get quicktype() {
    return this._quicktype
  }

  set quicktype(value) {
    this._quicktype = value
    this.updateQuickTypeDisplay()
  }

  async loadQuickType() {
    const project = TPEN.activeProject
    if (!project) {
      this.quicktype = []
      return
    }

    const incomingKeys = project.interfaces?.quicktype ?? []
    this.quicktype = Array.isArray(incomingKeys) ? [...incomingKeys] : []
  }

  async saveQuickType() {
    const project = TPEN.activeProject
    if (!project?.storeInterfacesCustomization) {
      eventDispatcher.dispatch("tpen-toast", {
        message: "Project must be loaded before saving QuickType shortcuts",
        status: "error"
      })
      return null
    }

    try {
      const interfaces = await project.storeInterfacesCustomization({ quicktype: [...this.quicktype] })
      this.quicktype = interfaces?.quicktype ?? project.interfaces?.quicktype ?? []
      eventDispatcher.dispatch("tpen-toast", {
        message: "QuickType shortcuts updated successfully",
        status: "success"
      })
      return interfaces
    } catch (error) {
      eventDispatcher.dispatch("tpen-toast", {
        message: error?.message ?? error?.toString() ?? "Failed to save QuickType shortcuts",
        status: "error"
      })
      return null
    }
  }


  connectedCallback() {
    TPEN.attachAuthentication(this)
    this.cleanup.onEvent(eventDispatcher, "tpen-project-loaded", () => this.loadQuickType())
    this.render()
    this.addEventListeners()
    if (TPEN.activeProject) {
      this.loadQuickType()
    }
  }

  disconnectedCallback() {
    this.cleanup.run()
  }

  render() {
    this.shadowRoot.innerHTML = `
        <style>
          .quicktype-container {
            font-family: Arial, sans-serif;
            padding: 20px;
            border-radius: 8px;
            margin: 20px auto;
            display:flex;
            gap:20px;
            align-items:flex-start;
          }
          .quicktype-container h2 {
            margin-top: 0;
          }
          .quicktype-form input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .quicktype-form button {
            padding: 8px 16px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .quicktype-list {
            margin-top: 20px;
          }
          .quicktype-list div {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .quicktype-list div:last-child {
            border-bottom: none;
          }

          .quicktype-row{
          display:flex;
          gap:10px;
          align-items:center;
          }

          .quicktype-item{
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

          .quicktype-shortcuts {
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
          .quicktype-shortcut {
            display: inline-block;
            margin: 5px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }
          .quicktype-shortcut:hover {
            background-color: #f0f0f0;
          }

            .quicktype-shortcuts{
            width:100%
            }
        </style>
        <div class="quicktype-container">
        <section>
          <h2>QuickType Manager</h2>
          <div class="quicktype-form">
            <input type="text" id="symbol-input" maxLength="2" placeholder="Enter a symbol (UTF-8)">

            <button id="add-quicktype">Add QuickType Shortcut</button>
          </div>
          <div class="quicktype-list">
            <h3>Saved QuickType Shortcuts</h3>
            <div id="quicktype-display">
            ${this.quicktype ? '<div class="loading">Loading QuickType shortcuts...</div>' : ''}</div>
          </div>
        </section>

          <div class="quicktype-shortcuts">
            <h3>QuickType Characters for Paleography in UTF-8</h3>
            ${this.renderQuickTypeCharacters()}
          </div>
        </div>
      `
  }

  renderQuickTypeCharacters() {
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
                    <div class="quicktype-shortcut" data-symbol="${char.symbol}">
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

  addEventListeners() {
    const addButton = this.shadowRoot.getElementById('add-quicktype')
    this.cleanup.onElement(addButton, 'click', () => this.addQuickType())

    // Event listeners for accordions
    const accordionHeaders = this.shadowRoot.querySelectorAll('.accordion-header')
    accordionHeaders.forEach((header) => {
      this.cleanup.onElement(header, 'click', () => {
        const content = header.nextElementSibling
        content.classList.toggle('open')
      })
    })

    // Add event listeners for QuickType characters
    const quicktypeCharacters = this.shadowRoot.querySelectorAll('.quicktype-shortcut')
    quicktypeCharacters.forEach((char) => {
      this.cleanup.onElement(char, 'click', () => {
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

  async addQuickType() {
    const symbolInput = this.shadowRoot.getElementById('symbol-input')
    const symbol = symbolInput.value.trim()

    if (!symbol) {
      TPEN.eventDispatcher.dispatch("tpen-toast", {
        message: "Please enter a valid UTF-8 symbol.",
        status: "error"
      })
      return
    }
    
    if (this.quicktype.includes(symbol)) {
      TPEN.eventDispatcher.dispatch("tpen-toast", {
        message: "This symbol is already in the QuickType shortcuts list.",
        status: "error"
      })
      return
    }

    const previous = [...this.quicktype]
    this.quicktype = [...this.quicktype, symbol]
    const resp = await this.saveQuickType()
    if (!resp) this.quicktype = previous
    symbolInput.value = ''
  }

  updateQuickTypeDisplay() {
    const quicktypeDisplay = this.shadowRoot.getElementById('quicktype-display')
    if (!quicktypeDisplay) {
      return
    }
    quicktypeDisplay.innerHTML = this.quicktype
      .map((symbol, index) => `
          <div class="quicktype-row">
          <div class="quicktype-item">
            <span class="symbol">${symbol}</span> 
            <span class="shortcut">${this.generateShortcut(index)}</span>
          </div>
          <div onclick="this.getRootNode().host.deleteQuickType(${index})" class="delete">&#128465;</div>
          </div>
        `)
      .join('')
  }

  async deleteQuickType(index) {
    const previous = [...this.quicktype]
    this.quicktype = this.quicktype.filter((_, i) => i !== index)
    const resp = await this.saveQuickType()
    if (!resp) this.quicktype = previous
  }
}


customElements.define('tpen-quicktype', TpenQuickType)
