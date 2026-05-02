// e2e/home.spec.js
// Smoke test: the landing/home page loads and renders expected structure.

import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
    test('loads without JavaScript errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => errors.push(err.message))

        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // No uncaught JS errors on load
        expect(errors).toHaveLength(0)
    })

    test('renders a <main> or <body> element with content', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')

        const body = page.locator('body')
        await expect(body).not.toBeEmpty()
    })

    test('unauthenticated user is redirected to login when accessing a protected page', async ({ browser }) => {
        // Use a fresh context with no auth state
        const context = await browser.newContext({ storageState: undefined })
        const page = await context.newPage()

        try {
            await page.goto('/interfaces/project/')
            // After redirect, the URL should no longer be the original protected path
            // (TPEN calls TPEN.login() which redirects to the auth provider)
            await page.waitForURL(url => !url.pathname.startsWith('/interfaces/project/'), { timeout: 8000 })

            await expect(page.url()).not.toContain('/interfaces/project/')
        } finally {
            await context.close()
        }
    })
})
