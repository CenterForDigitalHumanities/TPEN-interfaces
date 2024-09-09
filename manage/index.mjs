document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("header button")
  const content = document.getElementById("content")

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      
      button.classList.add('active');
      const componentName = button.id
      const response = await fetch(`${componentName}.html`)
      const componentHtml = await response.text()
      content.innerHTML = componentHtml
    })
  })

  document.getElementById("collaboration").click()
})
