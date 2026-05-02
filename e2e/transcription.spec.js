// e2e/transcription.spec.js
// Smoke test: transcription interface loads and renders key structural elements.

import { test, expect } from '@playwright/test'

test.describe('Transcription interface', () => {
    test('loads the simple transcription page without JS errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => errors.push(err.message))

        await page.goto('/interfaces/transcription/simple.html')
        await page.waitForLoadState('networkidle')

        expect(errors, `Unexpected JS errors: ${errors.join(', ')}`).toHaveLength(0)
    })

    test('renders the tpen-simple-transcription element', async ({ page }) => {
        await page.goto('/interfaces/transcription/simple.html')
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
        await page.goto('/interfaces/transcription/simple.html')
        await page.waitForLoadState('networkidle')

        const hasShadowContent = await page.evaluate(() => {
            const el = document.querySelector('tpen-simple-transcription')
            return el?.shadowRoot?.innerHTML?.length > 0
        })

        expect(hasShadowContent).toBe(true)
    })
})
