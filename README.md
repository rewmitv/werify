# Wérify

Check before you share. / Vérifiez avant de partager. / Verifica antes de compartir.

## Run locally on Windows

1. Install Node.js 22 or later.
2. In this folder, create a private file named `.env`, containing `MODEL_API_KEY=` followed by your full Meta secret key. Never upload this file or put it under public/.
3. Run `npm start` and open http://localhost:3000.

The server reads `.env` automatically. No npm dependencies are needed. It binds to 127.0.0.1 for local use. Close any older running Wérify server before restarting. A success message about finding a saved key only confirms that a value was read; a successful real API request is required to confirm the credentials.

## Current features

- English by default, with French and Spanish language buttons.
- Text claim research through Meta Responses API using muse-spark-1.3 and built-in web_search.
- Reports with numbered native citation annotations, source links and the passages those citations support. These passages are from the AI answer, not quotations of the source pages.
- An answer is withheld unless an actual search call and safe citation annotations are returned. This checks grounding metadata, not whether a conclusion is true. Users must inspect the sources.
- Concise assessment, correction, evidence and uncertainty sections when the model returns the required format. A separate short cited post can be edited, copied and downloaded as TXT. If the format is missing, the app shows the cited research without a verdict badge and reuses it as research notes.
- Intermediate provider messages marked as commentary are excluded. Assessment labels are model judgments, not independently verified truth.
- A clearly separate fictional example, still usable without an API key.
- Screenshot preview only; screenshot text must be entered manually. Images stay in the browser.

Claims go to Meta for research under Meta's applicable data policy. The app has no database, accounts, claim logs or saved app history. `store:false` requests no Responses API storage; this is not a promise about all provider processing or retention.

## Cost and deployment

Real requests consume API usage. Credit balances and spending alerts are managed in Meta Billing. A spending alert is not a hard cap. Each click makes at most one Meta request with a 6,000-output-token limit and no automatic retries. Search and input tokens can also incur costs.

This version is for local testing. Before public hosting, add access controls, robust rate limits and a server-side usage budget. The single concurrent request guard and origin check are not a production abuse-prevention system. Never expose the key in browser code or commit `.env`.

## Development and validation

Run `npm test` and `npm run check`. Tests simulate Meta success, absent grounding, unsafe citations, credential and network errors, and the local HTTP boundary. No real API request is made by the tests. Earlier live text research and TXT download were confirmed on the user's laptop. Version 0.3 report formatting still needs a live laptop check.

Based on Meta's official recipe:
https://github.com/meta-models/meta-model-cookbook/blob/main/01_api_fundamentals/10_search_grounding.ipynb

## Hackathon work provenance

The original interface starter predates the hackathon building period. The Meta integration, citation handling, live report rendering, local environment loading, and associated tests were added October 27, 2026. Structured report formatting and short corrected drafts were added October 31, 2026. Disclose the pre-existing starter and identify new contributions in the submission. Confirm eligibility and scope with organizers; disclosure alone does not establish eligibility. No production hosting, automatic OCR or native mobile app is included.

## Reliability checks (0.3.1)

Live 0.3 testing confirmed a contradicted assessment and corrected draft with an Apple citation. Intermittent failures also occurred, including the ambiguous-claim test. Their cause is not yet established. Version 0.3.1 adds distinct translated errors and safe error codes to diagnose these failures without displaying credentials or raw provider responses. No automatic paid retries are added. The ambiguous-claim acceptance test remains open.

## Clarifications (0.3.2)

The model is instructed to request missing context before searching when the subject or comparison is unspecified. A completed, correctly formatted clarification is displayed separately from researched reports, with no verdict, sources or post draft. The prompt requests no search for this path; actual tool use remains provider-controlled. Unfinished responses are still withheld. When Meta reports incomplete_details.reason=max_output_tokens, a distinct output-limit error is shown. The output allowance was raised from 3,000 to 6,000 tokens; this can increase maximum usage per request. No automatic retries. The live cause of the observed incomplete response is not yet confirmed; version 0.3.2 requires a laptop test.
