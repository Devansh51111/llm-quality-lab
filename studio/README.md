# QualityLab Studio 0.3

Dark React/TypeScript dashboard with a Node/Express Gemini adapter. This is the source export of the working owner-only AI Studio preview, with additional locally tested fixes. Public source is not a public model endpoint.

## Two separate demos

- Public root GitHub Pages remains the original static synthetic fixture evaluator. The additional `/studio/` deployment is the integrated dark dashboard, with synthetic replay and unverified report import/recomputed checks. Neither public static deployment calls a model.
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

Multi-turn transport, sequential performance experiments and human claim review are implemented in source. Actual live multi-turn/performance provider certification remains pending. Calibrated hallucination scoring, concurrent load testing, Appium/mobile automation and AWS deployment remain roadmap work. This is a working portfolio prototype, not a complete enterprise platform.

## Interview demonstration

1. Start with synthetic replay and say clearly that it uses hand-authored fixtures.
2. Open a failed case and explain every declared rule and its limitation.
3. In the private preview, run one fresh fictional case with real generation. Inspect the actual answer, execution time and per-rule result, including genuine failures.
4. Replay twice on identical criteria to compare stored runs. Edit a criterion and show that mismatched contracts cannot be compared.
5. Export JSON and identify the case snapshot, origin, requested model, actual model version (or `not reported`), timing and release reason.
6. Explain why a high average pass rate must not override a critical failure and why rule compliance is different from truth.

Historical real generation evidence is under `evidence/`, with the weak original duration check disclosed. Do not describe it as a full-suite benchmark or fabricated improvement claim.

## 0.3 integrated modules

| Module | Actual function | Verification and limits |
| --- | --- | --- |
| Response evaluation | Real-output or fixture checks, per-rule reasons, critical gate | Core tests and real private single-turn evidence. Rule compliance is not truth. |
| Golden datasets | CRUD/import/export, exact snapshots, duration contracts | Shape checks, empty-state and migration tests. Local storage, not enterprise version control. |
| Unsupported claims | Split candidate text, suggest lexical evidence, explicit human verdicts/reasons and export | Browser interaction verified. Human review, no automatic hallucination accuracy. |
| Safety | Configured pattern and phrase scanner with inspectable matches | Heuristic only, no preventative guarantee. |
| Multi-turn | Provider-native prior user/model contents, locally saved transcript and export | Payload-order tests and no-key error verified. Live multi-turn answer not yet certified. |
| Performance | 1-5 sequential requests, measured client time, nearest-rank p50/p95/errors, stop-on-error | Stats/error workflow tested. Not concurrent load/TTFT/tokens per second. Live multi-request run pending. |
| Regression | Two distinct runs, exact matching snapshots, complete case IDs, pass/fail deltas | Contract consistency tests. Not tamper-proof audit history. |
| Analytics | Active-run category counts, actual stored ledger and JSON export | Unit tests, no fake trend data or cross-contract improvement claim. |

Static Studio supports full-report import. Imported origin/model/timing are unverified claims and are labelled as such; declared checks are recomputed from the snapshot, never trusted from imported `passed:true`. Old reports lacking a full dataset snapshot are rejected. Backend-dependent buttons show honest unavailable errors on a static site, not synthetic stand-ins. A private backend/owner-only access and service consent are still needed for standalone live inference.

## Private hosted backend
Production fails closed: set OWNER_PASSWORD (at least16characters, use a generated secret) and a server-only GEMINI_API_KEY. Never put either in a VITE_ variable or commit. Owner sessions use signed HttpOnly Secure SameSite=Strict cookies (8hours); cross-origin POST is denied; login capped5attempts/15min/IP and owner model requests30/hour (in-memory, resets on restart). This is a single-owner portfolio prototype, not enterprise identity management or durable abuse accounting. Do not share the owner password.
Render free configuration: Node, root studio, build `npm ci --include=dev && npm run build`, start `HOST=0.0.0.0 npm start`, Free$0compute, no payment method. Idle sleep/cold start applies.
Integration proof: `python tests/owner-auth-integration.py`. No real key is required; the test checks anonymous denial, owner cookie, cross-origin denial, invalid input, no-key error and logout.
