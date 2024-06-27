import { User } from "../User/index.mjs"

document.addEventListener("DOMContentLoaded", async () => {
  const buttons = document.querySelectorAll("header button")
  const content = document.getElementById("content")
  const homeBtn = document.getElementById("home-btn")

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

  document.getElementById("projects").click()

  homeBtn.onclick = ()=>{ 
    location.href = "/"
  }


// GET AND DISPLAY PROJECTS
const localUser = window.TPEN_USER 
const userObj = new User()
userObj.authentication = localUser.authorization

const userProjects = await userObj.getProjects()

let projectList = document.getElementsByClassName("other-projects")[0]

userProjects.forEach((project)=>{
   projectList.innerHTML += `  <li class="project">
            <div class="title"> testtttttt
              ${project.title}
            </div>
            <div class="delete">&#128465;</div>
          </li>`
})

})
