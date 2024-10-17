/**
 * @module AuthButton Adds custom element for login/logout of TPEN3 Centralized Login
 * @author thehabes
 */

const CENTRAL = "http://localhost:3000"

class AuthButton extends HTMLElement {

  constructor() {
    super(); // Always call the superconstructor first
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
    // Add your custom logic here
    button.addEventListener('click', () => {
      if(button?.getAttribute("loggedIn")) {
        this.logout()
        return
      }
      this.login()
    });
    this.shadowRoot.append(button)
  }

  login() {
    const redirect = location.href
    location.href = `${CENTRAL}/login?returnTo=${encodeURIComponent(redirect)}`
    return
  }

  logout() {
    const redirect = document.location.origin + document.location.pathname
    // Have to use this logout page if you want to kill the session in Auth0 and truly logout this token.
    location.href = `${CENTRAL}/logout?returnTo=${encodeURIComponent(redirect)}`
    
    // UGH if only.  Centralized logout can only returnTo CENTRAL
    //location.href = `${CENTRAL}/logout?returnTo=${encodeURIComponent(redirect)}`

    // If we only care that the component/app forgets the token, this is all we need to do here to accomplish that for this interface.
    // Loading the page without the ?idToken makes this forget everything.
    //location.href = location.pathname


    // Can we logout in a new tab, then close that tab somehow, and also do the redirect trick?  Probably thinking too hard.
    // const page = `${CENTRAL}/logout?returnTo=${encodeURIComponent(redirect)}`
    // let logoutWindow = window.open(page, '_blank')
    // location.href = location.pathname
  }
}

customElements.define('auth-button', AuthButton);
