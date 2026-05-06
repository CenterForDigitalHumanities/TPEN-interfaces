// playwright.config.js
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 1,
    reporter: 'list',
    webServer: {
        // Start Jekyll locally; reuse an already-running server in dev so `jekyll s`
        // doesn't have to be launched twice when iterating.
        command: 'jekyll serve --no-watch',
        url: process.env.E2E_BASE_URL ?? 'http://localhost:4000',
        reuseExistingServer: true,
        timeout: 60_000
    },
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4000',
        trace: 'on-first-retry',
        // Inject a mock JWT into localStorage before each test via storageState
        storageState: './e2e/fixtures/auth.json'
    },
    // Named project for setup — runs before other tests to generate auth.json
    projects: [
        {
            name: 'setup',
            testMatch: '**/setup.js'
        },
        {
            name: 'chromium',
            use: {
                browserName: 'chromium'
            },
            dependencies: ['setup']
        }
    ]
})
