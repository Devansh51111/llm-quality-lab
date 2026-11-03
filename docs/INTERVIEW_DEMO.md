# Five-minute portfolio demonstration

Use https://llm-quality-lab.onrender.com/ . Free hosting may take a while to wake. Do not share your owner login or any API key. Everything below can be shown publicly without making a fresh model call.

1. **Dashboard:** replay the synthetic suite. Say: "These are made-up outputs, not a model benchmark. The 75% is written-rule compliance, not factual accuracy." Open a failed refusal and explain why a keyword can flag a correctly rejected prohibited action. Show the critical-failure release rule and real run history, not a fake trend.
2. **Reviewer checks:** click **View recorded 24-case result (no AI call)**. Say: "This is an actual captured Gemini review of 24 AI-authored fictional development examples, not a fresh run or an independent human-labelled benchmark." Show 19/24 authored-label agreement and the confusion matrix. Open U01/U02/U06 to show overconfident support on ambiguity/conflicting evidence. Explain why an exact quote can be present without logically proving a claim.
3. **Ragas diagnostics:** open the offline scores. Say: "I integrated real Ragas overlap metrics as a reproducible diagnostic, not a hallucination detector." Show C01: changing two years to five years still yields high string similarity. This is why library integration alone does not validate semantics. Export the report with library version and dataset hash.
4. **Datasets and regression:** show editable rules and a full case snapshot, replay twice, then compare two distinct same-contract runs. Explain why changing the dataset or comparing a run with itself is blocked. Export a full run. Browser data is editable/local, not an audit-proof database.
5. **Repository:** open CI. Show Python/API/SQL tests, Promptfoo synthetic integration, Studio unit/typecheck/build/auth checks, Chromium E2E at phone/desktop sizes, and offline Ragas tests. Describe the free Render/Express app and separate optional local FastAPI/SQLite service accurately.

## Claims to avoid

Do not say "79% accurate", "production ready", "zero hallucinations", "human validated", "held-out benchmark", "Appium tested", "AWS deployed", "multi-model improvement", or "Ragas Faithfulness". None is established by this project.

## Strong next step

Ask an independent person to label new reference/answer cases with rationales, freeze the evaluator and reserve genuinely unseen cases before tuning. Keep this development set as development evidence. Larger safety/performance tests need an explicit budget/quota plan; do not enable billing merely to complete a demo.
