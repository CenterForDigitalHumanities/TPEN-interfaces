/**
 * @module AuthButton Adds custom element for login/logout of TPEN3 Centralized Login
 * @author thehabes
 */

const CENTRAL = "https://three.t-pen.org"

class AuthButton extends HTMLElement {

  constructor() {
    super() // Always call the superconstructor first
    this.attachShadow({mode: "open"})
    
    const incomingToken = new URLSearchParams(window.location.search).get("idToken")
    const userToken = incomingToken ?? ""
    const button = document.createElement("button")
    button.innerText = "LOGIN"
    
    // Redirect to login if no userToken
    if(userToken) {
      button.setAttribute("loggedIn", userToken)
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
    // You can tell it where you would like to redirect.  In our case, back to this page without any URL parameters is good.
    const redirect = document.location.origin + document.location.pathname
    // Have to use this logout page if you want to kill the session in Auth0 and truly logout this token.
    location.href = `${CENTRAL}/logout?returnTo=${encodeURIComponent(redirect)}`
    return
  }
}

customElements.define('auth-button', AuthButton)
