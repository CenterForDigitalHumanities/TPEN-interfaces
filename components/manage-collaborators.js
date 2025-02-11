import TPEN from "../api/TPEN.mjs"
import { eventDispatcher } from "../api/events.mjs"
import { renderProjectCollaborators } from "../utilities/project-collaborators.js"
import { rolesHandler } from "../utilities/roles-handler.js"

let groupMembersElement = document.querySelector(".group-members")

eventDispatcher.on('tpen-project-loaded', () => renderProjectCollaborators())
TPEN.attachAuthentication(content)

groupMembersElement.addEventListener("click", rolesHandler)
