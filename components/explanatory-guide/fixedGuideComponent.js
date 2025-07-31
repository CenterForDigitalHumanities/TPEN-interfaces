export class FixedExplanatoryGuide extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()

    const toggleButton = this.shadowRoot.querySelector(".toggle-button")
    const sidebar = this.shadowRoot.querySelector(".sidebar")
    const overlay = this.shadowRoot.querySelector(".overlay")

    const slotItems = this.querySelectorAll("li")
    const list = this.shadowRoot.querySelector(".guide-list")
    slotItems.forEach(li => list.appendChild(li.cloneNode(true)))

    const toggleSidebar = () => {
      const isOpen = sidebar.classList.toggle("open")
      overlay.classList.toggle("visible", isOpen)
      toggleButton.classList.toggle("open", isOpen)
    }

    toggleButton.addEventListener("click", toggleSidebar)
    overlay.addEventListener("click", toggleSidebar)
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 3.5rem;
          right: 0;
          z-index: 5;
        }

        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 4;
        }

        .overlay.visible {
          opacity: 0.4;
          pointer-events: auto;
        }

        .sidebar {
          position: fixed;
          top: 3.5rem;
          right: 0;
          height: calc(100vh - 3.5rem);
          width: max(300px, 30vw);
          background: #f9f9f9;
          transform: translateX(100%);
          transition:
            transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.4s ease;
          display: flex;
          flex-direction: column;
          z-index: 5;
          border-radius: 8px 0 0 8px;
          will-change: transform, opacity;
        }

        .sidebar.open {
          transform: translateX(0);
          opacity: 1;
        }

        .sidebar-header {
          background-color: var(--primary-color, #e57373);
          color: white;
          padding: 0.75rem 1rem;
          font-size: 1.25rem;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .toggle-button {
          position: absolute;
          top: 0;
          left: -80px;
          background: var(--primary-color, #e57373);
          border: none;
          margin: 0;
          cursor: pointer;
          padding: 15px 20px;
          height: 4.2em;
          border-radius: 4px 0 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 6;
          box-sizing: border-box;
          transition: background-color 0.3s;
          box-shadow: 0 0 10px rgba(0, 120, 215, 0.6),
                      0 0 20px rgba(0, 120, 215, 0.4);
          animation: glow-pulse 2s infinite;
        }

        .toggle-button.open {
          box-shadow: none;
          animation: none;
        }

        .toggle-button img {
          width: 40px;
          height: 40px;
          user-select: none;
          pointer-events: none;
          filter: drop-shadow(0 0 4px rgba(0, 120, 215, 0.6));
        }

        .toggle-button.open img {
          filter: none;
        }

        @keyframes glow-pulse {
          0% {
            box-shadow: 0 0 15px rgba(255, 140, 0, 0.8),
                        0 0 30px rgba(255, 140, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 140, 0, 1),
                        0 0 50px rgba(255, 140, 0, 0.8);
          }
          100% {
            box-shadow: 0 0 15px rgba(255, 140, 0, 0.8),
                        0 0 30px rgba(255, 140, 0, 0.6);
          }
        }

        .guide-list {
          padding: 1rem 3rem;
          margin: 0 auto;
          font-size: 16px;
          color: #333;
          overflow-y: auto;
          flex-grow: 1;
        }

        .guide-list li {
          margin: 0.5rem 0;
          font-size: 14px;
          color: #555;
          margin-left: 5px;
        }
      </style>

      <div class="overlay"></div>

      <aside class="sidebar" role="complementary">
        <button class="toggle-button" type="button">
          <img src="../../assets/icons/info.png" alt="Open guide sidebar" />
        </button>
        <header class="sidebar-header">
          <span>${this.getAttribute("heading") || "Guide"}</span>
        </header>
        <ol class="guide-list"></ol>
      </aside>
    `
  }
}

customElements.define("tpen-fixed-explanatory-guide", FixedExplanatoryGuide)