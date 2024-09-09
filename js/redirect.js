function redirect() {
 const hasBeenRedirected = localStorage.getItem("tpen_redirected") // to make sure it only happens once (at login and not on every reload). this also means we have to remove this property from the localstorage on logout
  if (userHasProject() && !hasBeenRedirected) {
    localStorage.setItem("tpen_redirected", true)
    window.location.href = "tpen.org/interfaces/myprojects"
  }
}

async function userHasProject() {
  try {
    const response = await fetch(
      "https://dev.api.tpen-services.org/project/myproject",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${window.TPEN_USER?.authorization}`,
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    )

    return response.ok ? response : false
  } catch (error) {
    return false
  }
}

window.onload = redirect()
