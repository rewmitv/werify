# Wérify

Check before you share. / Vérifiez avant de partager. / Verifica antes de compartir.

First source-code package for https://github.com/rewmitv/werify.
Prepared October 24, 2026. This is a UI starter, not the completed hackathon submission.

## Run

Install Node.js 22 or later. No packages or API keys are needed for this version.

```sh
npm start
```

Open http://localhost:3000. To change the port, set the `PORT` environment variable.
Do not open index.html directly: the browser modules and API need the server.

```sh
npm run check
npm test
```

## Included

- Responsive mobile and desktop interface in the approved white/navy/emerald direction.
- French, English and Spanish switching; entered claim text is preserved.
- Claim input with a 1,000-character limit.
- JPG, PNG and WebP screenshot preview with a 10 MB limit.
- An explicitly fictional report illustrating uncertainty and source details.
- Editable example drafts in all three languages, copy and TXT download.
- Node server, input validation, health endpoint and verification API boundary.
- Automated checks for API behavior, file exposure and translation coverage.
- GitHub Actions checks on pushes and pull requests.

## What is not connected yet

**Live Meta AI, evidence retrieval, automatic OCR and production hosting are not connected.**
`POST /api/verify` returns HTTP 503 with `VERIFICATION_NOT_CONFIGURED` for valid
claims. It never silently substitutes the example for a real verification.
The example is opened only through the separate “Explore an example” button.
The screenshot currently stays in browser memory; users type or paste its text.
The browser sends only the claim and chosen language to the local API.

This starter contains no fabricated live sources, external scripts, databases,
accounts, persistent uploads, saved history, or analytics. Language and draft
state are held in memory and reset on reload. The backend does not log claim
bodies. Hosting infrastructure and future provider retention are separate concerns.

## Add these files to GitHub

Extract the ZIP and put the **contents of `werify/`** at the repository root,
beside/replacing the initial README.md. Include `.github/`, `.gitignore` and
`.env.example`; mobile file pickers may hide dotfiles, so a connected GitHub
workflow or a computer is preferable to uploading each file manually.
The source has not been pushed by creating this package.

## Next development steps

1. Check the final hackathon rules, permitted models, build window and submission requirements.
2. Connect the authorized Meta model on the server, using the competition's actual API contract.
3. Retrieve evidence from real sources, retaining links, publication dates and retrieval times.
4. Validate model output against retrieved evidence; preserve uncertainty and source attribution.
5. Connect screenshot extraction with editable text review, explicit upload handling and limits.
6. Add reports and drafts based on the returned evidence. The current demo must remain separate.
7. Test end-to-end in Chrome and Safari, then deploy a live jury-accessible URL.

Keep API keys in server environment variables. Never put credentials under `public/`
or commit `.env`. Use deployment-level rate limits before enabling paid APIs publicly.

## Repository structure

```text
public/              Browser UI, styles and translations
server.mjs           Static server and API boundary
tests/               API and localization checks
.github/workflows/   GitHub automated checks
docs/                Implementation status and API contract
```

The original design ZIP remains separate and unchanged by this source package.
No working Android or iOS app is included. Browser visual QA and real-provider
integration tests have not yet been performed.
