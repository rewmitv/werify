# API

GET /api/health returns status, version and liveVerification (whether a server key is configured, not a successful account test).

POST /api/verify accepts JSON {"claim":"...","lang":"en"}; locales en/fr/es, claim 1–1000 characters, body max 8 KiB. No screenshot uploads.

200 returns {grounded, text, sources, claim, lang, model}. Each source has url, title, passage. Passage is the cited span of the AI answer, not a quote from a fetched source. With no completed search or usable native citations, grounded=false, text="", sources=[]. UI withholds the answer in that case. Source links are HTTP/HTTPS only. Model content renders as plain text.

Errors: 400 invalid input/JSON; 413 oversized body; 503 missing key; 429 concurrent/rate-limited; 502 provider/auth/billing/network/incomplete/invalid response. Raw provider error details and keys never go to the browser. Cross-origin browser submissions are refused.

meta.mjs uses https://api.meta.ai/v1/responses with server-side Bearer auth, muse-spark-1.3, web_search and native url_citation annotations. It makes one request without retries, with a 90-second timeout. The client waits up to 100 seconds. Data lives only in memory within the app. Provider processing is separate.

Version 0.3 may also return report: {assessment, correction, evidence, uncertainty, draft}. Assessment is supported, contradicted or insufficient. This optional object is offered only for the complete expected section format with cited evidence and draft. It is model-generated, not an independent truth check. Without this object the client falls back to cited research notes without a verdict badge. Explicit final messages take priority over commentary. Native citations remain numbered in each field; sources are shared.

Version 0.3.1 distinguishes META_TIMEOUT, META_UNREACHABLE, META_SERVICE_ERROR (upstream 5xx), META_REQUEST_REJECTED (upstream 400/422), META_INVALID_RESPONSE and INCOMPLETE_RESEARCH. The interface displays only allowlisted error codes (or the local HTTP status), never raw provider messages. A provider failure is not an insufficient-evidence verdict.

Version 0.3.2 can return {grounded:false, text:"", sources:[], clarification, claim, lang, model}. Clarification requests missing input and is not a verification report; do not offer it as a corrected post. Only completed outputs qualify. The output allowance is 6,000 tokens. META_OUTPUT_LIMIT is returned only when an incomplete response explicitly reports max_output_tokens as its reason. Other unfinished statuses retain INCOMPLETE_RESEARCH.
