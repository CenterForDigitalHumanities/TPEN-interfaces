export class ExplanatoryGuide extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    this.render()

    const button = this.shadowRoot.querySelector(".collapse-button")
    const panelTop = this.shadowRoot.querySelector(".tpen-explanation-top")
    const panel = this.shadowRoot.querySelector(".tpen-explanation-body")
    const slot = this.querySelectorAll("li")
    const list = this.shadowRoot.querySelector(".guide-list")

    slot.forEach((li) => {
      list.appendChild(li.cloneNode(true))
    })

    button.addEventListener("click", () => {
      const isCollapsed = panel.classList.toggle("collapsed")
      panelTop.classList.toggle("border-radius-include", isCollapsed)
      button.src = isCollapsed ? "../../assets/icons/arrow-down.png" : "../../assets/icons/arrow-up.png"
      button.alt = isCollapsed ? "Expand section" : "Collapse section"
    })
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .tpen-explanation-header {
          background-color: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .tpen-explanation-body.collapsed {
          max-height: 0;
          opacity: 0;
          padding: 0 40px;
          border-radius: 16px;
          transition: max-height 0.4s ease-in-out;
        }

        ol.guide-list {
          padding: 10px 40px;
          margin: 0;
          font-size: 16px;
          color: #333;
        }

        ol.guide-list li {
          margin: 5px 0;
          font-size: 14px;
          color: #555;
          margin-left: 5px;
        }

        .tpen-explanation-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0px 10px;
          background-color: var(--primary-color);
          border-radius: 8px 8px 0 0;
        }

        .tpen-explanation-top h2 {
          font-size: 18px;
          color: white;
          margin: 5px;
        }

        .collapse-button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-right: 5px;
          width: 35px;
          height: 35px;
        }

        .border-radius-include {
          border-radius: 8px;
        }
      </style>
      <div class="tpen-explanation-header">
        <div class="tpen-explanation-top">
          <h2>${this.getAttribute("heading")}</h2>
          <img class="collapse-button" src="../../assets/icons/arrow-up.png" alt="up-and-down-arrow">
        </div>
        <div class="tpen-explanation-body">
          <ol class="guide-list"></ol>
        </div>
      </div>
    `
  }
}

customElements.define("tpen-explanatory-guide", ExplanatoryGuide)