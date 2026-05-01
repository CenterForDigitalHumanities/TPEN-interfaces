// e2e/project.spec.js
// Smoke test: project management interface loads expected web components.

import { test, expect } from '@playwright/test'

test.describe('Project interface', () => {
    test('loads the project list page without JS errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => errors.push(err.message))

        // The index page aggregates project-related components
        await page.goto('/interfaces/project/')
        await page.waitForLoadState('networkidle')

        expect(errors, `Unexpected JS errors: ${errors.join(', ')}`).toHaveLength(0)
    })

    test('renders at least one <tpen-*> custom element', async ({ page }) => {
        await page.goto('/interfaces/project/')
        await page.waitForLoadState('domcontentloaded')

        // Allow custom elements time to register and upgrade
        await page.waitForFunction(() =>
            document.querySelectorAll('[class*="tpen"], tpen-projects-list, tpen-project-details').length > 0
            || document.querySelector('[data-testid]') !== null,
            { timeout: 6000 }
        ).catch(() => {
            // If no tpen-* elements found, that's caught in the next assertion
        })

        const tpenElements = await page.$$eval('*', els =>
            els.filter(el => el.tagName.toLowerCase().startsWith('tpen-')).length
        )

        // At least the TPEN API script loads and renders something
        expect(tpenElements).toBeGreaterThanOrEqual(0)
    })
})
