/**
 * @module AuthButton Adds custom element for login/logout of TPEN3 Centralized Login
 * @author thehabes
 */

const CENTRAL = "https://three.t-pen.org"

class AuthButton extends HTMLElement {

  constructor() {
    super() 
    this.attachShadow({mode: "open"})
    const incomingToken = new URLSearchParams(window.location.search).get("idToken")
    const userToken = incomingToken ?? ""
    const button = document.createElement("button")
    button.innerText = "LOGIN"
    // Redirect to login if no userToken
    if(userToken) {
      localStorage.setItem("userToken", userToken)
      window.TPEN_USER = {authorization: userToken}
      this.dispatchEvent(new CustomEvent("tpen-authenticated", {detail: TPEN_USER}))
      button.setAttribute("loggedIn", true)
      button.innerText = "LOGOUT"
    }
    // Button click behavior
    button.addEventListener('click', () => {
      if(button?.getAttribute("loggedIn")) {
        this.logout()
        return
      }
      this.login()
    })
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

  /**
    * Use the TPEN3 Central Logout to retire the current token and redirect back to this page.
    * Make sure to remove the token if you have it stored anywhere, such as in the address bar or in localStorage.
  */
  logout() {
    const where = location.href
    let link = new URL(where)
    link.searchParams.delete("idToken")
    const redirect = link.toString()
    location.href = `${CENTRAL}/logout?returnTo=${encodeURIComponent(redirect)}`
    return
  }
  
}

customElements.define('auth-button', AuthButton)
