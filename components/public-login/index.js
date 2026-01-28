/**
 * AuthButton - Login/logout button for TPEN3 Centralized Login.
 * @element auth-button
 * @author thehabes, cubap
 */

import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

class AuthButton extends HTMLElement {
  /** @type {Function|null} Handler for authentication events */
  _authHandler = null

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    // Clear shadowRoot to prevent duplicate buttons on reconnection
    this.shadowRoot.innerHTML = ''
    const button = document.createElement("button")
    button.innerText = "LOGIN"
    this._authHandler = () => {
      button.setAttribute("loggedIn", true)
      button.innerText = "LOGOUT"
    }
    eventDispatcher.on("tpen-authenticated", this._authHandler)
    button.addEventListener('click', () => this[button.getAttribute("loggedIn") ? 'logout' : 'login']())
    TPEN.attachAuthentication(this)
    this.shadowRoot.append(button)
  }

  disconnectedCallback() {
    if (this._authHandler) {
      eventDispatcher.off("tpen-authenticated", this._authHandler)
    }
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
