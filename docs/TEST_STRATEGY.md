# Test strategy

## Scope
A small QA harness, not a chatbot. Input: test cases + saved answers or optional local model outputs. Output: inspectable rule results, regression diff and release policy.

## Layers
- Unit: each rule boundary, malformed/empty/missing outputs, invalid definitions, duplicate IDs, unknown responses, numerical/JSON/latency edge cases.
- Policy: one critical failure overrides >90% average; provider errors cannot disappear.
- Integration: SQLite roundtrip with parameterized SQL; FastAPI POST/GET lifecycle; promptfoo adapter; mocked local Ollama contract.
- Browser: 320/390/1280px; no overflow; baseline comparison; failure/critical filters; search; drilldown; JSON import; editable critical case; download. Python and JS contract parity checked against the synthetic suite.
- CI: run Pytest and fixture smoke checks, enforce expected blocked baseline and passing candidate. Promptfoo bridge runs in a separate job. Pages deploys static source with read-only site content.

## Data discipline
All examples are fictional. No private user or employer data. A dataset fingerprint hashes full cases, including rules. Reports include fixture/import/model mode and provenance. Do not use a self-authored passing candidate as evidence of model quality.

## Limits / next validation
There is an experimental semantic reviewer and a recorded 24-case development run with confusion matrix and model provenance. Its AI-authored labels are not independent human labels or a held-out benchmark. No adversarial coverage guarantee, concurrent inference load test or Android/Appium test is established. A representative unseen dataset, independent labels and repeated stochastic runs are still needed before model-quality claims.

Current Studio CI includes typecheck/unit/build/auth checks and production-build Chromium E2E for replay, editing/persistence, contract-aware regression, denied anonymous access, import rejection, report export, controlled mocked provider errors and published no-call evidence. Mocked browser tests are not live model validation. Offline Ragas metrics have their own pinned environment and socket-blocked tests.
