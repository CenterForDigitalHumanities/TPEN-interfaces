/**
 * AuthButton - Login/logout button for TPEN3 Centralized Login.
 * @element auth-button
 * @author thehabes, cubap
 */

import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"
import { CleanupRegistry } from "../../utilities/CleanupRegistry.js"

class AuthButton extends HTMLElement {
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    // Clear shadowRoot to prevent duplicate buttons on reconnection
    this.shadowRoot.innerHTML = ''
    const button = document.createElement("button")
    button.innerText = "LOGIN"
    this.cleanup.onEvent(eventDispatcher, "tpen-authenticated", () => {
      button.setAttribute("loggedIn", true)
      button.innerText = "LOGOUT"
    })
    button.addEventListener('click', () => this[button.getAttribute("loggedIn") ? 'logout' : 'login']())
    TPEN.attachAuthentication(this)
    this.shadowRoot.append(button)
  }

  disconnectedCallback() {
    this.cleanup.run()
  }

  /**
    * Use the TPEN3 Central Login to redirect back to this page with a valid ID Token.
  */
  login() {
    const redirect = location.href
    location.href = `${CENTRAL}/login?returnTo=${encodeURIComponent(redirect)}`
    return
  }

  logout = TPEN.logout
}

customElements.define('auth-button', AuthButton)
