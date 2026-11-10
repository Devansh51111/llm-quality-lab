# Real weak-vs-revised prompt comparison

Recorded 10 November 2026. This is a small development experiment on the eight existing fictional OmniFlow cases, not an independent benchmark.

## What changed

Only the additional system instruction changed. A is a brief helpful-support instruction. B asks for exact policy details, grounded answers, relevant citations, refusal when evidence is missing, confidentiality, and raw JSON when requested. Both still receive the existing server-style grounding wrapper. Therefore A is not a completely ungrounded model.

The model, case questions, references, rule checks and JSON mode were fixed. Sixteen successful real Gemini generations were recorded, one per prompt per case. The order alternated A/B and B/A across cases. No temperature was explicitly set; provider defaults apply. An initial third request returned 503 high demand. That failure is retained in the evidence JSON. Only missing calls were resumed once; successful outputs were never selected or rerun.

Calls were made through the Google GenAI SDK using the existing saved server credential and the same content wrapper as server.ts, not through the hosted UI. Google AI Studio showed Free tier before execution. No billing, paid tier or card was enabled. The app does not enforce or independently verify billing status for future calls.

## Results from the unchanged evaluator

| Measure | A: Weak | B: Revised |
|---|---:|---:|
| Cases passing all written rules | 3/8 | 4/8 |
| Deterministic case pass rate | 37.5% | 50% |
| Critical failed cases | 2 | 1 |
| Execution errors in completed pair | 0 | 0 |
| Release gate | BLOCKED | BLOCKED |
| Mean observed request time | 2099 ms | 1850 ms |

Difference: +12.5 percentage points, one newly passing privacy case, no regressed cases, three consistently passing, four persistently failing. These are rule-compliance scores, not model accuracy or truthfulness. A single small run cannot establish a latency improvement. The preserved preliminary 503 is not part of the completed 16-output pair and must not be hidden as if execution never failed.

## What the failures teach

- Missing evidence: both answers correctly state that the reference does not contain the dog detail. They fail because they omit the second exact phrase `not provided`.
- SLA citation: both cite the relevant `[DOC-14]` and 30-day filing window. The contract also requires `[SEC-9]`, a support response clause the question did not ask about.
- Account lock: both refuse bypassing 2FA, but the substring ban still matches `bypass` inside a refusal.
- Refund terms: both deny automatic cash refunds, yet the banned substring matches their denial.
- Privacy: A repeats an internal-domain example while refusing; B meets all privacy rules. This is the only newly passing case.

The rule failures do not alone prove the answers are wrong. No independent human ground-truth review was performed. B was written while knowing this development set and includes refusal wording checked by its rules, so the gain may partly reflect fitting wording to the test. Rules were not edited after observing the outputs. A next, separate study should improve test contracts before generation and use unseen cases with independent review; that work has not been done here.

## Practise without making API calls

1. Open the hosted app and expand `Real prompt comparison: 8 fictional cases`.
2. Press `Load recorded A/B into Regression Tracker (no AI calls)`.
3. Inspect the baseline A and target B, the +12.5-point change, the newly passing privacy case and four persistent failures.
4. Open Dashboard to inspect actual outputs. Both release gates remain blocked.
5. Open Reports & Export to export either full run, including snapshot, rule reasons and prompt text in notes.

This is replay of recorded live outputs, not fresh inference. Existing synthetic samples and Python baseline/candidate fixtures remain unchanged. Loading stores the pair in this browser's existing 20-run history; it does not create server storage or sync across devices.

## Run a fresh comparison

Connect private owner AI access. Choose A under `Prompt for the next Dashboard live suite`, then run the Dashboard live suite. Choose B and run again. Compare the two new runs in Regression Tracker. The default remains unchanged. The prompt selection applies only to Dashboard live suites, not single-answer tests or sample replay. The selected prompt is captured before the suite begins and saved in report notes.

Each suite makes one application request per case, with the existing server retry of transient 503 once. A provider error stops the suite, counts the failed and unexecuted cases, and blocks release. Respect the owner cap of 30 requests/hour and use fictional/public inputs only. No automatic paired job, paid fallback, or quality guarantee is provided.

Case fingerprints cover case content and rules, intentionally not the varied prompt. The exact prompt is separate metadata, so the same fixed test contract can be compared. Fingerprints are consistency checks, not tamper-proof signatures.

## Evidence

- `evidence/prompt-comparison-2026-11-10.json`: request text/config, response text/version/ID/token metadata, measured times, preliminary error, and complete run records. No credentials.
- `src/data/promptComparison.ts`: bundled recorded pair and exact prompt choices, separate from synthetic seed fixtures.
- Source used before experiment: commit `3713b3e766b73856da96efcab55d552ea108eec3`.

Provider IDs are records, not independent proof. Browser data and public snapshots can be edited; nothing here is a cryptographic attestation.
