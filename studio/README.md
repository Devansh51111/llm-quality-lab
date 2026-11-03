# QualityLab Studio 0.2

Dark React/TypeScript dashboard with a Node/Express Gemini adapter. This is the source export of the working owner-only AI Studio preview, with additional locally tested fixes. Public source is not a public model endpoint.

## Two separate demos

- Public GitHub Pages remains a static, synthetic fixture evaluator. It makes no model calls.
- Private AI Studio preview supports real Gemini 3.5 Flash-Lite calls under the owner's Google account. It requires Google sign-in and access to that private project. The preview may lag this source: see `evidence/README.md` for exactly what was observed.

No paid API, card, billing or Cloud deployment was enabled for this project. Free service capacity is not guaranteed. 503/quota failures are shown as failures, never replaced with fixtures. The app cannot independently verify an account's billing status.

## Run source locally (optional)

Use Node 22.12+:

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
```

The server binds `127.0.0.1:3000` by default. With no key, synthetic replay works and generation returns an explicit unavailable error. The owner-only AI Studio runtime supplies its own server environment. A separate local development key, if used, belongs only in `.env`, never the frontend or a commit. A key can incur costs depending on its account; this project does not establish a budget cap. Do not enable paid service as part of this demo.

**Do not host `server.ts` on a public URL.** It has no authentication, authorization, durable rate limiting or production abuse controls. AI Studio's Restricted project sharing is the current access boundary. Local source has not been deployed as a public inference service.

## Implemented

- Eight fictional editable cases with severity, required/prohibited phrases, citation markers, strict JSON, privacy patterns and optional day-duration contracts.
- Explicit real generation vs synthetic replay, actual output and per-check reasons.
- Empty/no-rule/transport-error failures; critical failures block release.
- Case-level pass rate and exact 90% gate, not semantic accuracy.
- Local browser persistence, exact case snapshots, noncryptographic content fingerprints, run history and JSON/CSV exports.
- Distinct-run regression comparison with identical snapshots and complete case IDs required.
- Measured wall-clock latency for live calls only. No synthetic performance figures.
- Optional uncalibrated model-judge code path. It is not a validated truth metric and was not certified end-to-end in the private preview.
- Source tests, typecheck and production frontend build.

## Honest limits

Required and prohibited phrases are substring rules. The day-duration contract accepts digit/day forms (`14 days`, `14-day`) and rejects conflicting units/durations and selected explicit negations. It rejects spelled numbers and can reject irrelevant additional durations. It can miss indirect negation, quoted claims and more complex semantics. Positive and negative tests prove the stated narrow contract only.

Citation marker presence does not prove entailment or support. Privacy regexes miss real identifiers and can flag innocent text. The model judge is an uncalibrated estimate. Browser localStorage is editable by its owner, not a tamper-proof audit ledger. A content fingerprint is not cryptographic provenance. No real customer data, PII or production secrets belong in this demo.

Native multi-turn sessions, conversational memory evaluation, calibrated hallucination scoring, concurrent load testing, Appium/mobile automation and AWS deployment remain roadmap work. This is a working portfolio prototype, not a complete enterprise platform.

## Interview demonstration

1. Start with synthetic replay and say clearly that it uses hand-authored fixtures.
2. Open a failed case and explain every declared rule and its limitation.
3. In the private preview, run one fresh fictional case with real generation. Inspect the actual answer, execution time and per-rule result, including genuine failures.
4. Replay twice on identical criteria to compare stored runs. Edit a criterion and show that mismatched contracts cannot be compared.
5. Export JSON and identify the case snapshot, origin, requested model, actual model version (or `not reported`), timing and release reason.
6. Explain why a high average pass rate must not override a critical failure and why rule compliance is different from truth.

Historical real generation evidence is under `evidence/`, with the weak original duration check disclosed. Do not describe it as a full-suite benchmark or fabricated improvement claim.
