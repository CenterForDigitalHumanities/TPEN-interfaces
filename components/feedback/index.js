import TPEN from "../../api/TPEN.js"

class TpenFeedback extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: "open" })
    this.render()
  }

  connectedCallback() {
    this.setupEventListeners()
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .feedback-container {
          font-family: Arial, sans-serif;
          padding: 20px;
          margin: 10px auto 0px;
          background-color: var(--light-color);
          color: var(--dark);
        }
        .feedback-container textarea {
          width: calc(100% - 18px);
          padding: 8px;
          margin-bottom: 10px;
          border: 1px solid var(--gray);
          border-radius: 4px;
          background-color: var(--white);
          color: var(--dark);
        }
        .feedback-container select {
          width: 100%;
          padding: 8px;
          margin-bottom: 10px;
          border: 1px solid var(--gray);
          border-radius: 4px;
          background-color: var(--white);
          color: var(--dark);
        }
        .feedback-container button {
          padding: 8px 16px;
          background-color: var(--primary-light);
          color: var(--light-color);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .feedback-container button:disabled {
          background-color: var(--light-gray);
          cursor: not-allowed;
        }
      </style>
      <div class="feedback-container">
        <h3>Submit Feedback</h3>
        <select id="feedback-type">
          <option value="feedback">Feedback</option>
          <option value="bug">Bug Report</option>
        </select>
        <textarea id="feedback-description" rows="5" placeholder="Describe your feedback..."></textarea>
        <button id="submit-feedback">Submit Feedback</button>
      </div>
    `
  }

  setupEventListeners() {
    const submitButton = this.shadowRoot.getElementById("submit-feedback")
    submitButton.addEventListener("click", async () => {
      const description = this.shadowRoot.getElementById("feedback-description").value.trim()
      if (!description) {
        const descriptionField = this.shadowRoot.getElementById("feedback-description")
        descriptionField.setCustomValidity("Please provide a feedback description.")
        descriptionField.reportValidity()
        return
      }

      const currentPage = window.location.href
      const feedbackData = { page: currentPage, description }

      try {
        const feedbackType = this.shadowRoot.getElementById("feedback-type").value
        await this.submitFeedback(feedbackData, feedbackType)
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "Feedback submitted successfully!",
          type: "success"
        })
        this.shadowRoot.getElementById("feedback-description").value = ""
      } catch (error) {
        console.error("Error submitting feedback:", error)
        TPEN.eventDispatcher.dispatch("tpen-toast", {
          message: "Failed to submit feedback. Please try again.",
          type: "error"
        })
      }
    })
  }

  /**
   * Actually create a GitHub Issue containing the feedback using TPEN Services.
  */
  async submitFeedback(data, type) {
    const endpoint = type === "feedback" 
      ? `${TPEN.servicesURL}/beta/feedback`
      : `${TPEN.servicesURL}/beta/bug`

    if (type === "bug") {
      data.bugDescription = data.description
      data.page = window.location.pathname + window.location.search + window.location.hash
      delete data.description
    }
    if (type === "feedback") {
      data.feedback = data.description
      data.page = window.location.pathname + window.location.search + window.location.hash
      delete data.description
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TPEN.getAuthorization()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to submit ${type}: ${response.statusText}`)
    }

    const feedbackModalButton = document.querySelector("tpen-page").shadowRoot.querySelector("tpen-footer").shadowRoot.querySelector("tpen-feedback-button")
    const modal = feedbackModalButton.shadowRoot.querySelector("#feedback-modal")
    const backdrop = feedbackModalButton.shadowRoot.querySelector("#feedback-backdrop")
    const icon = feedbackModalButton.shadowRoot.querySelector(".feedback-icon-container")

    modal.classList.remove("show")
    backdrop.classList.remove("show")
    icon.classList.remove("active")
  }
}

customElements.define("tpen-feedback", TpenFeedback)
