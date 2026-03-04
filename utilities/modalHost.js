/**
 * Opens a dialog host in the browser top-layer if it is not already open.
 * @param {HTMLDialogElement} hostDialog - Dialog element used as the modal host.
 */
export function openModalHost(hostDialog) {
    if (!hostDialog?.showModal || hostDialog.open) return
    hostDialog.showModal()
}

/**
 * Closes a dialog host and removes its visible state class.
 * @param {HTMLDialogElement} hostDialog - Dialog element used as the modal host.
 */
export function closeModalHost(hostDialog) {
    hostDialog?.classList.remove('show')
    if (hostDialog?.open) {
        hostDialog.close()
    }
}

/**
 * Closes a dialog host once no matching modal elements remain.
 * Retries briefly to avoid animation timing races.
 *
 * @param {HTMLDialogElement} hostDialog - Dialog element used as the modal host.
 * @param {string} itemSelector - Selector for dialog items that may still be animating out.
 * @param {object} [options] - Timing options.
 * @param {number} [options.initialDelay=550] - Delay before first empty-check.
 * @param {number} [options.interval=120] - Delay between retries.
 * @param {number} [options.attempts=6] - Number of retries before giving up.
 */
export function closeModalHostWhenEmpty(hostDialog, itemSelector, options = {}) {
    const {
        initialDelay = 550,
        interval = 120,
        attempts = 6
    } = options

    const closeWhenEmpty = (attemptsRemaining = attempts) => {
        const hasItems = hostDialog?.querySelector(itemSelector)
        if (hasItems && attemptsRemaining > 0) {
            setTimeout(() => closeWhenEmpty(attemptsRemaining - 1), interval)
            return
        }

        if (hasItems) return
        closeModalHost(hostDialog)
    }

    setTimeout(() => closeWhenEmpty(), initialDelay)
}
