// e2e/setup.js
// Generates e2e/fixtures/auth.json with a mock JWT in localStorage.
// Playwright runs this before other e2e tests (see playwright.config.js).

import { test as setup } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, 'fixtures')

// A minimal non-expiring mock JWT (header.payload.signature — not verified by the UI layer)
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtb2NrLXVzZXItMDAxIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature'

setup('generate mock auth storage state', async ({ page }) => {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })

    // Navigate to the base URL so we can write to localStorage for the right origin
    await page.goto('/')

    await page.evaluate((token) => {
        localStorage.setItem('userToken', token)
    }, MOCK_JWT)

    await page.context().storageState({ path: path.join(FIXTURES_DIR, 'auth.json') })
})
