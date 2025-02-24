import TPEN from "../../api/TPEN.mjs";
import { eventDispatcher } from "../../api/events.mjs";

class ProjectPermissions extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({mode:"open"})
        eventDispatcher.on("tpen-project-loaded", () => this.render())
    }

    render() {
    }
}

customElements.define("project-permissions", ProjectPermissions)