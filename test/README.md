# TPEN-interfaces Testing Strategy

## Overview
This repo uses a layered, Node-native testing harness with zero impact on the Jekyll build. All test tooling is dev-only and lives in `package.json`.

### Test Layers
- **Unit tests**: `node:test` + `jsdom` for utilities/, js/, api/
- **Component tests**: `node:test` + `jsdom` for web components (run locally, not in CI by default)
- **Contract tests**: `@pact-foundation/pact` (consumer) → PactFlow (provider)
- **E2E tests**: `@playwright/test` (runs against live Jekyll site, with mocked auth)

## Running Tests
- `npm test` — all unit tests
- `npm run test:components` — all component tests
- `npm run test:e2e` — Playwright e2e (requires local `jekyll s` or deployed site)
- `npm run pact:publish` — Publishes latest pact to PactFlow (CI only)

## PactFlow Setup
- Pact files are published to PactFlow, not committed to the repo
- CI must set `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN` secrets
- Provider team (TPEN-Services) verifies contracts via PactFlow dashboard
- See https://docs.pact.io/pact_nirvana/step_5_publish_contracts for details

## Component Test Policy
- New components **must** have a test in `components/<name>/__tests__/`
- Modifying a component? Update/add tests first
- Component tests are not run in CI by default; run locally with `npm run test:components`

## E2E Auth
- E2E tests inject a mock JWT into `localStorage` before navigation
- Only read-path flows are tested; mutating flows require real auth and are out of scope

## Node Version
- Node LTS 24 required (for native `node --test` glob support)

---

For questions, see CLAUDE.md or ask in #dev.
