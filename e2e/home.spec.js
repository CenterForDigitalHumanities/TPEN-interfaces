// e2e/home.spec.js
// Smoke test: the landing/home page loads and renders expected structure.

import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
    test('loads without JavaScript errors', async ({ page }) => {
        const errors = []
        page.on('pageerror', err => {
            // Filter out "Response" errors — these are unhandled fetch rejections from
            // components that throw the raw Response object on API failure (expected with mock auth)
            if (err.message !== 'Response') errors.push(err.message)
        })

        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // No uncaught JS errors on load (excluding expected network/API errors)
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

        // Intercept the external TPEN login URL so the navigation resolves immediately
        // rather than stalling on a real network request to three.t-pen.org
        await context.route('https://three.t-pen.org/**', route =>
            route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>mock login</body></html>' })
        )

        try {
            // /project (tpen-project-details) calls TPEN.attachAuthentication which redirects
            // to the auth provider when no token is present in localStorage
            await page.goto('/project', { waitUntil: 'domcontentloaded' })
            // TPEN.login() sets location.href to the auth provider; wait for that redirect
            await page.waitForURL('https://three.t-pen.org/login**', { timeout: 10000 })

            expect(page.url()).toContain('three.t-pen.org/login')
        } finally {
            await context.close()
        }
    })
})
