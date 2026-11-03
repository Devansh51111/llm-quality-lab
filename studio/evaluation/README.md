# Reviewer checks: reproducible evaluation, not calibration

Open **Reviewer checks** in the current Studio app. Run 4 cases (one per class) or all 24 using owner-only inference. Export the exact dataset, predictions, evidence, actual model version, timing and recomputed metrics. No key is sent to the browser. No billing is enabled by this workflow.

## Provenance and scope

The 24 fictional examples and expected labels were authored with AI assistance. They are development fixtures, publicly visible and **not independent human annotations, not held out and not a real-world accuracy benchmark**. No empirical model result is bundled until a real run is recorded. The source of truth is `src/data/reviewerCases.ts` and version `synthetic-reviewer-checks-v1`.

The cases test exact support, paraphrase, negation, numeric equivalence/contradiction, wrong-subject quotes, missing facts, ambiguous/conflicting policies and embedded candidate instructions. Embedded instructions are deliberately untrusted test data. The API receives reference + candidate only, never expected labels or rationales. The evaluator prompt is unchanged by this fixture set.

## Metrics

- Expected rows / predicted columns confusion matrix.
- Per-class precision, recall and F1; undefined values remain null, never fake 0% or 100%.
- Macro F1 over classes represented in the scored subset. Unsupported/unattempted classes must not be interpreted as tested.
- Agreement = correct labels / successfully scored cases. This is agreement with authored labels, not factual accuracy.
- Separate errors, missing cases and correct / attempted including errors, so failed requests cannot disappear.
- A deliberately narrow exact-answer-in-reference baseline. Compare only identical cases; the UI also reports the baseline on the attempted subset.
- Answer-level aggregation: contradiction, then absent evidence, then uncertain, else supported. This does not measure whether every factual claim was extracted.

## Free use and reproducibility

All requests are sequential. The experiment stops on the first error; stop can also be requested after the current call. No automatic retries. The full suite uses up to 24 of the server's 30 requests/hour limit, shared with other model features. Provider free-tier quotas can stop it sooner. A small partial run must not be presented as the full benchmark. Export results before closing or changing browsers.

Imported model/provenance fields are unverified. The exact dataset/version is required and all metrics are recomputed; a forged exported score is ignored. `npm test` covers counts, duplicate/missing/error cases, perfect and wrong predictions and snapshot validation. `npm run test:e2e` covers the current UI, denial and persistence, not live semantic correctness.

## Independent validation still required

1. Freeze the evaluator prompt and dataset version.
2. Have a person other than the evaluator author independently label references and answers. Store reviewer identity/role, date, rationale and disagreements separately. Do not rename AI-authored expectations as human labels.
3. Create a separate, unseen test set before tuning. Do not view/tune on it and later call it held out.
4. Run a fixed evaluator version, disclose missing/error cases and publish failure examples. Report uncertainty; 24 small synthetic cases cannot establish general reliability.
5. Do not use the semantic reviewer as an automatic safety release gate until supported by independent evaluation. Keep deterministic rule-pass rate separate.

## Tool-name gaps

DeepEval/Ragas are not integrated, Appium/native mobile testing is not implemented, and AWS deployment is not implemented. The project instead has a dependency-light metric harness, current-app Chromium Playwright automation, SQLite query assertions for the optional Python service, and a working free Render deployment. These are explicit scope choices, not claims that the omitted skills are irrelevant to an employer.
