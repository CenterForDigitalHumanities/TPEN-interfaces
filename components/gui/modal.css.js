/**
 * Shared modal dialog stylesheet for alert/confirm containers.
 * Defines common CSS custom properties, button styles, and backdrop patterns.
 * 
 * Import with: new CSSStyleSheet(); sheet.replaceSync(sharedModalStyles)
 * or: const style = document.createElement('style'); style.textContent = sharedModalStyles
 */
export const sharedModalStyles = `
  :host {
    --primary-color: var(--primary-color, hsl(186, 84%, 40%));
    --primary-light: var(--primary-light, hsl(186, 84%, 60%));
    --light-color  : var(--light-color, hsl(186, 84%, 90%));
    --dark         : var(--dark, #2d2d2d);
    --white        : var(--white, hsl(0, 0%, 100%));
    --gray         : var(--gray, hsl(0, 0%, 60%));
    --light-gray   : var(--light-gray, hsl(0, 0%, 90%));
  }

  /* Modal host dialog — invisible until open */
  dialog[class*="area"] {
    position: fixed;
    inset-block-start: 0;
    inset-inline: 0;
    justify-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    margin: 0;
    padding: 0;
    border: none;
    background-color: transparent;
    opacity: 0;
    transition: all 0.5s ease-in-out;
    /* Define color variables directly so they're available to all children */
    --primary-color: hsl(186, 84%, 40%);
    --primary-light: hsl(186, 84%, 60%);
    --light-color  : hsl(186, 84%, 90%);
    --dark         : #2d2d2d;
    --white        : hsl(0, 0%, 100%);
    --gray         : hsl(0, 0%, 60%);
    --light-gray   : hsl(0, 0%, 90%);
  }

  /* Only show grid layout when dialog is open */
  dialog[class*="area"][open] {
    display: grid;
    place-items: center;
  }

  dialog[class*="area"]::backdrop {
    background-color: rgba(0, 0, 0, 0.7);
  }

  /* Fade in backdrop when shown */
  dialog[class*="area"].show {
    opacity: 1;
  }

  /* Modal message/content element (tpen-alert, tpen-confirm, etc) */
  tpen-alert,
  tpen-confirm,
  [role="alert"],
  [role="alertdialog"] {
    display: block;
    position: relative;
    background-color: #333;
    color: #fff;
    padding: 10px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    opacity: 0;
    height: fit-content;
    min-width: 25vw;
    max-width: 35vw;
    transition: all 0.3s ease-in-out;
    font-size: 14pt;
  }

  /* Links inside modal message */
  tpen-alert a,
  tpen-confirm a,
  [role="alert"] a,
  [role="alertdialog"] a {
    color: var(--primary-color);
    text-decoration: underline;
  }

  /* Position message in top-right during animation */
  dialog[class*="area"] tpen-alert,
  dialog[class*="area"] tpen-confirm,
  dialog[class*="area"] [role="alert"],
  dialog[class*="area"] [role="alertdialog"] {
    top: 0px;
    right: 0px;
  }

  /* Reduced motion: show directly without animation */
  @media (prefers-reduced-motion: reduce) {
    dialog[class*="area"] tpen-alert,
    dialog[class*="area"] tpen-confirm,
    dialog[class*="area"] [role="alert"],
    dialog[class*="area"] [role="alertdialog"] {
      opacity: 1;
      height: fit-content;
      top: 5vh;
    }
  }

  /* Button container for modal actions */
  .button-container {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 1.5vh;
    flex-wrap: wrap;
  }

  /* Message becomes visible when .show class added */
  dialog[class*="area"] tpen-alert.show,
  dialog[class*="area"] tpen-confirm.show,
  dialog[class*="area"] [role="alert"].show,
  dialog[class*="area"] [role="alertdialog"].show {
    opacity: 1;
    height: fit-content;
    top: 5vh;
  }

  /* Modal action buttons */
  dialog[class*="area"] button {
    position: relative;
    display: inline-block;
    cursor: pointer;
    border: none;
    padding: 10px 20px;
    background-color: var(--primary-color);
    outline: var(--primary-light) 1px solid;
    outline-offset: -3.5px;
    color: var(--white);
    border-radius: 5px;
    transition: all 0.2s ease;
    font-size: 12pt;
    font-weight: 500;
    min-width: 80px;
    text-align: center;
  }

  dialog[class*="area"] button:hover {
    background-color: var(--primary-light);
    outline: var(--primary-color) 2px solid;
    outline-offset: -1px;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  dialog[class*="area"] button:focus-visible {
    background-color: var(--primary-light);
    outline: var(--white) 2.5px solid;
    outline-offset: 1px;
  }

  dialog[class*="area"] button:active {
    transform: translateY(0px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  /* Mobile responsive: wider dialogs on small screens */
  @media (max-width: 768px) {
    tpen-alert,
    tpen-confirm,
    [role="alert"],
    [role="alertdialog"] {
      min-width: 80vw;
      max-width: 90vw;
    }
  }
`;
