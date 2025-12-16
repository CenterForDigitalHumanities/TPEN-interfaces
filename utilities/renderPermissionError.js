/**
 * Utility function to render a permission error message.
 * Used by interfaces when a user lacks the required permissions.
 * @param {HTMLElement} shadowRoot - The shadow root to render the error in
 * @param {string} projectInQuery - The project ID from the query string
 */
export function renderPermissionError(shadowRoot, projectInQuery = '') {
  shadowRoot.innerHTML = `
    <style>
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background-color: #f8f9fa;
      }
      .error-content {
        max-width: 600px;
        text-align: center;
        background: white;
        padding: 3rem;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .error-title {
        color: #d63031;
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      .error-message {
        color: #2d3436;
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
      }
      .error-link {
        background-color: #00b894;
        color: white;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        border-radius: 5px;
        display: inline-block;
        margin: 0.5rem;
        font-weight: bold;
        transition: background-color 0.3s;
      }
      .error-link:hover {
        background-color: #00a383;
      }
      .error-link.secondary {
        background-color: #0984e3;
      }
      .error-link.secondary:hover {
        background-color: #0770c7;
      }
    </style>
    <div class="error-container">
      <div class="error-content">
        <h1 class="error-title">Permission Denied</h1>
        <p class="error-message">
          You do not have the appropriate permissions to view this transcription interface.
        </p>
        <div>
          <a href="/project?projectID=${projectInQuery}" class="error-link">
            Back to Project
          </a>
          <a href="/" class="error-link secondary">
            Go to Home
          </a>
        </div>
        <img src="/assets/logo/logo-350w.png" alt="Permission Denied Illustration" style="margin-top: 1.5rem; max-width: 100%; height: auto;" />
      </div>
    </div>
  `
}
