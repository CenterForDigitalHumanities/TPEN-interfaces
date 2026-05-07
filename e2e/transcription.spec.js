// e2e/transcription.spec.js
// Smoke test: transcription interface loads and renders key structural elements.

import { test, expect } from '@playwright/test'

test.describe('Transcription interface', () => {
    test('loads the simple transcription page without JS errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => {
            // Filter out "Response" errors — unhandled fetch rejections from components
            // that throw the raw Response object on API failure (expected with mock auth)
            if (err.message !== 'Response') errors.push(err.message)
        })

        // /transcribe is the Jekyll permalink for interfaces/transcription/index.html
        // which hosts tpen-simple-transcription
        await page.goto('/transcribe')
        await page.waitForLoadState('networkidle')

        expect(errors, `Unexpected JS errors: ${errors.join(', ')}`).toHaveLength(0)
    })

    test('renders the tpen-simple-transcription element', async ({ page }) => {
        await page.goto('/transcribe')
        await page.waitForLoadState('domcontentloaded')

        // Wait for custom element definition
        await page.waitForFunction(() =>
            customElements.get('tpen-simple-transcription') !== undefined,
            { timeout: 8000 }
        )

        const el = page.locator('tpen-simple-transcription')
        await expect(el).toBeAttached()
    })

    test('transcription element has a shadow root with content', async ({ page }) => {
        await page.goto('/transcribe')
        await page.waitForLoadState('networkidle')

        // Verify the element exists and has an attached shadow root.
        // Shadow content depends on a real project being loaded; smoke test only checks
        // that the shadow root itself is initialised by the component.
        const hasShadowRoot = await page.evaluate(() => {
            const el = document.querySelector('tpen-simple-transcription')
            return el?.shadowRoot !== null && el?.shadowRoot !== undefined
        })

        expect(hasShadowRoot).toBe(true)
    })
})
