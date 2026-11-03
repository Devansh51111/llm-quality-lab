# LLM QualityLab

A working, local-first QA framework for saved LLM responses. It makes test expectations explicit, compares runs, and blocks a release when a critical case fails, even when the average pass rate is high.

**Version 0.1 is a deterministic contract evaluator, not an automatic truth detector.** The bundled baseline and candidate responses are hand-authored synthetic fixtures, NOT outputs from two real models or prompts. No paid API is required. No API key belongs in the browser demo.

## Studio 0.3 integrated source and private real-AI preview

The [`studio/`](studio/) folder adds the dark React/TypeScript dashboard and server-side Gemini adapter used in the private owner-only AI Studio preview. Two genuine Gemini 3.5 Flash-Lite responses were observed on fictional inputs; this is connection evidence, not a benchmark. Historical evidence and its original weak duration-check caveat are preserved in [`studio/evidence/`](studio/evidence/). Source now integrates all eight module areas at a prototype level: response checks, datasets, human claim review, heuristic safety, provider-native multi-turn transport, sequential performance experiments, regression and analytics. New unit and browser checks cover their real functions; live multi-turn/performance certification and standalone owner-only inference hosting remain pending.

Live inference remains private. The public Pages demo below is still synthetic-only. The exported server is local-only by default and must not be exposed publicly without real access controls. See [Studio setup, honest limits and interview demo](studio/README.md).

## Try without installing anything

**Browser demo:** https://devansh51111.github.io/llm-quality-lab/

**CI:** https://github.com/Devansh51111/llm-quality-lab/actions

The demo is a public static site. No account, install, API key or payment is needed to try its fixture evaluations.

1. Inspect the broken baseline and improved fixture.
2. Expand **Try a regression yourself**.
3. Choose `PII-01` and change its answer to `Contact synthetic.person@example.invalid`.
4. Re-evaluate. The case pass rate is **93.75%**, yet the release is **BLOCKED** by a critical privacy-pattern failure.
5. Expand the failed case to inspect its actual output and every rule/reason.
6. Download a JSON report. Imports and edits in the public demo stay in your browser tab and reset on refresh. Do not import real customer data on a shared device.

The browser is a client-side evaluator. It does not invoke a model and does not connect to the Python backend. The full backend/API is included below for developers.

## What works

- 16 version-controlled, fictional golden cases covering declared fact contracts, citation IDs, missing-evidence refusal, instruction boundaries, privacy patterns, output schema, required content, recovery and electrical-safety wording.
- Eight explicit check types: required/all/any text, exclusions, schema subset, citation ID validity, numeric allowlists, email/phone-like patterns, latency budgets.
- Case-level pass/fail with reasons; category summaries; 90% + zero-critical-failure release policy.
- Dataset SHA-256 fingerprints: comparisons reject changed datasets instead of pretending runs are comparable.
- Saved-run comparison with newly passing/failing case IDs.
- SQLite run history, JSON reports, read-only dashboard and optional FastAPI endpoints with Swagger UI.
- Real promptfoo **0.125.1** Python provider/assertion bridge exercised against fixtures.
- Pytest suite covering evaluator, SQLite, API, promptfoo adapter and mocked Ollama contract.
- GitHub Actions test workflow and free static Pages deployment workflow. Live workflow status, not this README, is the source of truth for a particular commit.

## Small architecture

```text
cases + saved outputs -> Python evaluator -> per-check reasons -> JSON + SQLite
                               |                        |
                         release policy           FastAPI/dashboard

same case contracts -> promptfoo Python adapter -> promptfoo reports

public Pages demo -> browser evaluator twin -> temporary reports (no backend)
```

Python package is named `evalforge` for CLI continuity; the project/UI is LLM QualityLab. Runtime CLI uses Python standard library only. FastAPI and Pytest are optional development/API dependencies. SQLite is intentional for this small local project, not a claim of PostgreSQL/AWS experience.

## Developer quick start

Python 3.10+:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
python -m evalforge run --responses data/baseline.json --label "Synthetic baseline" --out runs/baseline.json
# Exit 1 above is EXPECTED: the fixture deliberately fails the release gate.
python -m evalforge run --responses data/candidate.json --label "Synthetic candidate" --out runs/candidate.json
python -m evalforge compare runs/baseline.json runs/candidate.json
python -m uvicorn evalforge.api:app --host 127.0.0.1 --port 8765
```

Open the localhost address printed by Uvicorn. API documentation is at `/docs` on the same localhost server. Without extra packages, `python -m evalforge serve` offers the read-only viewer; imports require the FastAPI server.

CLI exits: `0` gate pass / no regressions; `1` blocked release / comparison regressions; `2` invalid input or execution error. Failed cases still generate inspectable reports; errors are never silently converted into successful results.

## Promptfoo bridge (tested, fixture mode)

Node.js and Python are needed only for development, not to use the browser demo:

```bash
python -m evalforge export-promptfoo
# Set PROMPTFOO_PYTHON to your virtual environment's Python if necessary.
npx promptfoo@0.125.1 eval -c promptfooconfig.json --no-cache
```

The custom provider returns saved synthetic responses; the assertion reuses the actual Python grading logic. No model provider or LLM judge is configured, and no API key is used. Configure telemetry according to your needs; validation here used `PROMPTFOO_DISABLE_TELEMETRY=1`.

## Optional real local inference

Not required for this project or browser demo. An Ollama adapter calls only `http://127.0.0.1:11434/api/generate`, never a cloud provider. If you independently have Ollama and a model installed:

```bash
python -m evalforge run --ollama YOUR_INSTALLED_MODEL --label "Local model experiment" --out runs/model.json
```

This produces `mode=ollama` reports with measured request wall time, including model load and HTTP overhead. The HTTP contract is unit-tested with a mock. **No real Ollama model run has been completed in this release.** Model errors/timeouts are failed cases. A single low-temperature run does not measure nondeterminism: repeat runs and report distributions before drawing conclusions. No paid hosted inference is included.

## What scores do and do not mean

A pass means the output satisfied the declared checks for that case. It does not mean a fact is true or an answer is semantically safe.

- Keyword checks are brittle: `not 14 days` still contains `14`. This limitation has an explicit test.
- Citation checks verify IDs exist and required IDs are present, not that a source entails every claim.
- Numeric allowlists catch unexpected numbers, not arbitrary hallucinations or incorrect relationships.
- Privacy checks catch email/phone-like patterns, not all personal data or obfuscated leaks; they can have false positives.
- JSON validation is a small required-fields/type subset, not full JSON Schema.
- Refusal checks and canary exclusions exercise declared behaviors, not comprehensive jailbreak resistance.
- Latency checks require actual measurements. Fixture latency is absent, not fabricated. No cost/token estimate is invented.
- Sixteen synthetic cases are pipeline proof, not benchmark coverage. An independent human-labelled held-out set is needed for quality estimates.

Do NOT rename contract pass rate as "accuracy", "faithfulness", or "hallucination rate". DeepEval/Ragas semantic evaluators, a calibrated local judge, multi-turn tool calling, load tests, authentication, hosted API inference and Appium/AWS are **not implemented**. See [roadmap](docs/ROADMAP.md).

## Interview walkthrough

Read [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md), [test strategy](docs/TEST_STRATEGY.md), and [source notes](docs/SOURCES.md). Explain what you can demonstrate, what is synthetic, and the limitations before claiming the project on a resume.


## Honest limits (current demo)

- Rule checks (required and forbidden phrases, JSON, PII patterns) test contracts, not truth. Passing them does not show an answer is correct.
- AI evidence review is experimental: same-model suggestions with exact reference quotes. Quote presence is checked, logical support is not. Observed on 3 fictional labeled cases (3 of 3 matched) plus 1 controlled embedded-instruction case. That is a smoke check, not a benchmark or a hallucination detector.
- The optional model judge is uncalibrated and not ground truth.
- Safety is pattern matching on a few identifiers and prompt-leak markers. There is no jailbreak suite and no safety score.
- Timing is a small sequential sample, not a load test.
- Live AI is owner-only, runs on free tiers, and may hit provider quotas. Free hosting sleeps when idle and the first request can take about 50 seconds.
- Use fictional or public inputs only.
