// e2e/project.spec.js
// Smoke test: project management interface loads expected web components.

import { test, expect } from '@playwright/test'

test.describe('Project interface', () => {
    test('loads the project list page without JS errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => {
            // Filter out "Response" errors — unhandled fetch rejections from components
            // that throw the raw Response object on API failure (expected with mock auth)
            if (err.message !== 'Response') errors.push(err.message)
        })

        // Home page aggregates project-list components (tpen-projects-list-navigation, etc.)
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        expect(errors, `Unexpected JS errors: ${errors.join(', ')}`).toHaveLength(0)
    })

    test('renders at least one <tpen-*> custom element', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')

        // The home page includes tpen-page, tpen-card, tpen-continue-working, etc. in static HTML.
        // Count elements whose tag name starts with 'tpen-'.
        const tpenElements = await page.$$eval('*', els =>
            els.filter(el => el.tagName.toLowerCase().startsWith('tpen-')).length
        )

        // At least one TPEN custom element should render on the page
        expect(tpenElements).toBeGreaterThan(0)
    })
})
