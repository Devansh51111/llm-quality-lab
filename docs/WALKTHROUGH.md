# Five-minute demo and learning guide

## 1. Problem (30 seconds)
"An LLM can produce a different answer after a prompt or model change. Manually checking a few answers misses regressions. This project makes expectations explicit and reruns the same cases."

## 2. Dataset (45 seconds)
Open `data/cases.json`. A golden case contains a stable ID, question, reference context, severity and checks. `FACT-01` expects the fictional 14-day trial and `[POLICY]` citation. Explain that you curated synthetic cases, not company data. The responses in both fixtures were written to demonstrate the pipeline, not collected from an LLM.

## 3. Pipeline (45 seconds)
Open `evalforge/evaluator.py`. Validate dataset IDs and rule definitions, collect an output, evaluate each check, aggregate each case, then apply the release gate. A missing response or provider error fails instead of being dropped from the denominator. Reports retain outputs and reasons so a reviewer can disagree with the test.

## 4. Critical failure (60 seconds)
In the browser demo choose `PII-01` under the editable fixture. Replace its response with `Contact synthetic.person@example.invalid`. Re-evaluate. Fifteen cases pass and one fails: 93.75%, but BLOCK because the failed case is critical. Expand the case to show that it is an email-pattern match, not a claim that the system detects every kind of PII.

## 5. Regression (45 seconds)
Compare to the improved fixture. A new failure is a regression. Dataset fingerprints prevent comparing runs whose test cases or rules changed. Explain why blindly comparing averages from different datasets is misleading.

## 6. Tests and CI (45 seconds)
Open `tests/test_evaluator.py`, especially the high-average/critical-failure test and the keyword-negation limitation. Show the real GitHub Actions result. Promptfoo's custom Python assertion invokes the same evaluator. A configuration file alone would not prove integration, so the bridge was actually executed against all fixtures.

## Questions to practise

**Is this a hallucination detector?** No. It detects declared contract violations. It can catch listed unsupported numbers and prohibited phrases, but cannot prove semantic faithfulness.

**How would you add semantic evaluation?** Collect human-labelled examples, define claim-level support/relevance rubrics, choose a local or explicitly approved model judge, calibrate against human labels, measure false positives/negatives, repeat runs and version the judge prompt. Keep deterministic safety gates separate from average semantic scores.

**Why no LLM-as-judge now?** To keep the first version reproducible and free without a paid key or requiring the user to download a model. The optional local-provider adapter is not a claimed completed model benchmark.

**What does 100% mean?** The improved synthetic fixture satisfies the 16 declared cases. It is not production accuracy and not a demonstrated prompt/model improvement.

**What happens on timeout?** The provider records an error, every check for that case fails, and the report keeps the error. Retrying indiscriminately would hide reliability problems and distort latency.

**Would you deploy this API publicly?** Not as-is. It binds to localhost; authentication, request-body limits at transport level, rate limits, encryption/retention and multi-user isolation are later work. The public Pages demo has no API/backend and imports stay in the tab.

**What did you use?** Python, SQLite, FastAPI, Pytest, a custom promptfoo provider/assertion and GitHub Actions; JavaScript for the no-install demo. Do not claim DeepEval, Ragas, Appium or AWS hands-on use from this project.

## Resume wording, only after you have run and understood it

"Built a local-first LLM QA framework with versioned synthetic cases, deterministic response contracts, regression comparison and critical-failure release gates. Added FastAPI/SQLite reporting, a promptfoo Python integration, automated tests and a browser-based demo."

Avoid hiring guarantees, invented metrics, "reduced hallucinations by X%", or claiming ownership of model training. Be ready to modify a case live rather than memorize the demo.
