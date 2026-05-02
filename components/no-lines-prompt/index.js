import TPEN from "../../api/TPEN.js"
import CheckPermissions from "../check-permissions/checkPermissions.js"
import { onProjectReady } from "../../utilities/projectReady.js"
import { CleanupRegistry } from "../../utilities/CleanupRegistry.js"
import { confirmAction } from "../../utilities/confirmAction.js"
import "../../components/splitscreen-tool/index.js"

/**
 * NoLinesPrompt - Shown in the left pane when a page has no line annotations.
 * Dispatches `tpen-load-full-page-view` via TPEN.eventDispatcher on connect to
 * trigger the transcription interface to open the full canvas view.
 * @element tpen-no-lines-prompt
 */
export default class NoLinesPrompt extends HTMLElement {
  /** @type {CleanupRegistry} Registry for cleanup handlers */
  cleanup = new CleanupRegistry()
  /** @type {Function|null} Unsubscribe function for project ready listener */
  _unsubProject = null

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback() {
    TPEN.attachAuthentication(this)
    this._unsubProject = onProjectReady(this, this.authgate)
    // Signal the parent transcription interface to open the full canvas view
    TPEN.eventDispatcher.dispatch("tpen-load-full-page-view")
  }

  disconnectedCallback() {
    try { this._unsubProject?.() } catch {}
    this.cleanup.run()
  }

  authgate() {
    this.render()
    this.addEventListeners()
  }

  render() {
    const projectId = encodeURIComponent(TPEN.screen?.projectInQuery ?? "")
    const pageId = encodeURIComponent(TPEN.screen?.pageInQuery ?? "")
    const annotatorUrl = `/annotator?projectID=${projectId}&pageID=${pageId}`

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
        }

        .no-lines-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 2rem 1.5rem;
          gap: 1.5rem;
          min-height: 100%;
          background-color: var(--light-color, #f8f4ee);
        }

        .no-lines-message {
          text-align: center;
          max-width: 480px;
        }

        .no-lines-message h2 {
          font-size: 1.4rem;
          color: var(--accent, #5a3e2b);
          margin-bottom: 0.5rem;
        }

        .no-lines-message p {
          font-size: 1rem;
          color: var(--text-secondary, #666);
          line-height: 1.5;
        }

        .tools-section {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .tools-label {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--interface-primary, #005a8c);
          letter-spacing: 0.05em;
        }

        .actions-section {
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .action-btn {
          display: block;
          width: 100%;
          max-width: 320px;
          padding: 0.65rem 1.25rem;
          border-radius: 25px;
          border: 2px solid var(--interface-primary, #005a8c);
          background-color: var(--white, white);
          color: var(--interface-primary, #005a8c);
          font-weight: 600;
          font-size: 0.9rem;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .action-btn:hover:not(:disabled),
        .action-btn:focus:not(:disabled) {
          background-color: var(--interface-primary, #005a8c);
          color: var(--white, white);
          outline: none;
        }

        .action-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          border-color: var(--text-muted, #999);
          color: var(--text-muted, #999);
        }

        .action-btn.danger {
          border-color: var(--error-color, #b03030);
          color: var(--error-color, #b03030);
        }

        .action-btn.danger:hover:not(:disabled),
        .action-btn.danger:focus:not(:disabled) {
          background-color: var(--error-color, #b03030);
          color: var(--white, white);
        }
      </style>

      <div class="no-lines-container">
        <div class="no-lines-message">
          <h2>This page has not been transcribed yet.</h2>
          <p>No line annotations are defined for this page. Use the options below to get started.</p>
        </div>

        <div class="actions-section">
          <a class="action-btn" href="${annotatorUrl}">Identify Lines and Columns</a>
          <button class="action-btn danger" id="remove-page-btn" type="button">Remove this Page from the Project</button>
          <button class="action-btn" id="import-annotations-btn" type="button" disabled title="Import Annotations — coming soon">Import Annotations</button>
        </div>
        
        <div class="tools-section">
          <span class="tools-label">Open one of your tools</span>
          <tpen-splitscreen-tool></tpen-splitscreen-tool>
        </div>

      </div>
    `
  }

  addEventListeners() {
    const removeBtn = this.shadowRoot.querySelector("#remove-page-btn")
    if (removeBtn) {
      this.cleanup.onElement(removeBtn, "click", () => this.#removePageFromProject())
    }
  }

  async #removePageFromProject() {
    if (!CheckPermissions.checkDeleteAccess("PAGE", "*")) {
      TPEN.eventDispatcher.dispatch("tpen-toast", {
        status: "error",
        message: "You don't have permission to remove pages from this project."
      })
      return
    }

    const projectId = TPEN.activeProject?._id
    const pageId = TPEN.screen?.pageInQuery
    if (!projectId || !pageId) return

    confirmAction(
      "This page will be removed from the project. This action cannot be undone.",
      async () => {
        try {
          const response = await fetch(`${TPEN.servicesURL}/project/${projectId}/page/${pageId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TPEN.getAuthorization()}`
            }
          })
          if (response.ok) {
            TPEN.eventDispatcher.dispatch("tpen-toast", {
              status: "info",
              message: "Page successfully removed from the project."
            })
            window.location.href = `/project/?projectID=${encodeURIComponent(projectId)}`
          } else {
            TPEN.eventDispatcher.dispatch("tpen-toast", {
              status: "error",
              message: "Failed to remove the page. Please try again."
            })
          }
        } catch {
          TPEN.eventDispatcher.dispatch("tpen-toast", {
            status: "error",
            message: "An error occurred while removing the page."
          })
        }
      },
      null,
      { positiveButtonText: "Remove", negativeButtonText: "Cancel" }
    )
  }
}

customElements.define("tpen-no-lines-prompt", NoLinesPrompt)
