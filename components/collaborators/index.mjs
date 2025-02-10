import TPEN from "../../api/TPEN.mjs"
import { eventDispatcher } from "../../api/events.mjs"
import { renderProjectCollaborators } from "../project-collaborators/index.mjs"
import { Invitation } from "../invitation/index.mjs"
import { rolesHandler } from "../roles-handler/index.mjs"

let groupMembersElement = document.querySelector(".group-members")
const inviteForm = document.getElementById("invite-form")

eventDispatcher.on('tpen-project-loaded', () => renderProjectCollaborators())
TPEN.attachAuthentication(content)

inviteForm.addEventListener("submit", Invitation)

groupMembersElement.addEventListener("click", rolesHandler)
