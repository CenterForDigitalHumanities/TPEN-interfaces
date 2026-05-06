// e2e/setup.js
// Generates e2e/fixtures/auth.json with a mock JWT in localStorage.
// Playwright runs this before other e2e tests (see playwright.config.js).
// Written statically to avoid a dependency on the dev server being available at setup time.

import { test as setup } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const AUTH_FILE = path.join(FIXTURES_DIR, 'auth.json')

// A minimal non-expiring mock JWT (header.payload.signature — not verified by the UI layer)
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtb2NrLXVzZXItMDAxIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4000'

setup('generate mock auth storage state', async () => {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })

    // Write the Playwright storage state JSON directly — no live server needed.
    const storageState = {
        cookies: [],
        origins: [
            {
                origin: BASE_URL,
                localStorage: [
                    { name: 'userToken', value: MOCK_JWT }
                ]
            }
        ]
    }

    fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2))
})
