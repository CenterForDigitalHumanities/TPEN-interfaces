export default function checkUserAuthentication() {
 try {
  return new Promise((resolve, reject) => {
    const authButton = document.querySelector('button[is="auth-button"]')

    if (authButton) {
      authButton.addEventListener("tpen-authenticated", (event) => {
        const TPEN_USER = event.detail
        resolve(TPEN_USER)
      })

    } else { 
      reject(new Error('auth-button not found on the page.'))
    }
  })
 } catch (error) {
  console.log("something happened")
 }
}