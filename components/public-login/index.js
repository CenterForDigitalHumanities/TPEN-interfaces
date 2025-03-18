/**
 * @module AuthButton Adds custom element for login/logout of TPEN3 Centralized Login
 * @author thehabes, cubap
 */

import TPEN from "../../api/TPEN.js"
import { eventDispatcher } from "../../api/events.js"

class AuthButton extends HTMLElement {

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    const button = document.createElement("button")
    button.innerText = "LOGIN"
    eventDispatcher.on("tpen-authenticated", ev => {
      button.setAttribute("loggedIn", true)
      button.innerText = "LOGOUT"
    })
    button.addEventListener('click', () => this[button.getAttribute("loggedIn") ? 'logout' : 'login']())
    TPEN.attachAuthentication(this)
    this.shadowRoot.append(button)
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
