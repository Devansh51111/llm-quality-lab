# Offline Ragas integration

This is a real, executed Ragas 0.4.1 adapter using ExactMatch, Levenshtein NonLLMStringSimilarity and ROUGE-L F1. It does not call a model, require an account/key/card, use embeddings or install anything on the deployed web service. Telemetry is disabled. A test blocks socket connections while metrics execute.

```sh
python -m venv .venv-ragas
.venv-ragas/bin/pip install -r integrations/ragas/requirements.txt
RAGAS_DO_NOT_TRACK=true .venv-ragas/bin/python integrations/ragas/run_offline.py
RAGAS_DO_NOT_TRACK=true .venv-ragas/bin/python -m pytest integrations/ragas/test_offline.py -q
```

Input defaults to the captured reviewer development set. `--input` accepts the same JSON shape with `cases` containing reference, answer, category, expected and id. `--out` chooses output. The output records library/version, exact input SHA256, per-case numbers and label-group diagnostics. The output JSON is available under `studio/evidence/ragas-offline-2026-11-03.json` and in Reviewer checks. Ragas runs in its own CI job.

These are **text-overlap diagnostics**, not semantic faithfulness, factual correctness or calibrated hallucination metrics. On the warranty contradiction (two years vs five years), Levenshtein is about0.889 and ROUGE-L about0.833 despite the wrong number. That counterexample is asserted in tests. No overlap score is used in the release gate. Case labels are AI-authored, not independent human labels.

Ragas 0.4.1 requires a compatible legacy langchain-community import; this optional environment pins0.3.31. It is isolated from the core FastAPI/Studio dependencies. DeepEval and Ragas model-based Faithfulness are NOT integrated. Running those with a new provider or billing is not authorized by this adapter.

Official metric semantics: https://docs.ragas.io/en/v0.4.1/concepts/metrics/available_metrics/traditional/
