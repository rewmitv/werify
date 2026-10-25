# Current API boundary

`GET /api/health`: 200, `{ "status": "ok", "liveVerification": false, "version": "0.1.0" }`.

`POST /api/verify`: JSON `{ "claim": "...", "lang": "fr" }`.
`lang` must be `fr`, `en` or `es`; claim must have 1–1,000 characters after
whitespace validation. Current response: 503, `{ "error": "VERIFICATION_NOT_CONFIGURED" }`.
Invalid JSON/input: 400. Body over 8 KiB: 413. No screenshot bytes are accepted.

Before enabling live verification, implement and validate a shared result schema
for verdict, conclusion, uncertainty, evidence references and source metadata.
Only retrieved source IDs may be cited; search snippets must be identified as
snippets rather than as full articles. Missing dates must stay unknown.
Source content and claims are untrusted data, never model instructions.
Do not derive a verdict from a successful model response alone.

The browser intentionally does not handle a future success response yet. Replace
that branch together with the new schema and corresponding tests when the real
integration is implemented. Preserve the fictional example as a separate route.
