# Current evidence and deliberate next steps

Current Studio: https://llm-quality-lab.onrender.com/ . Public UI, owner-only model calls, free Render and browser-local data.

Implemented: rule contracts, 8 editable Studio fixtures (16 separate Python fixture cases), Promptfoo synthetic bridge, native multi-turn, small sequential timing experiment, human evidence review, experimental AI claim suggestions, regression/exports, and a reviewer experiment with 24 AI-authored development cases. Current-Studio Chromium Playwright and owner-auth integration run in CI. Optional Python backend has API and SQL tests.

Next, in priority order:
1. Obtain independent human labels and a genuinely unseen evaluation set. The recorded 19/24 development agreement is not calibration. Preserve all five disagreements and version the evaluator before any tuning.
2. Expand real prompt/model comparison with matching case snapshots; do not invent improvement percentages or model provenance.
3. Broader multi-turn/tool-call state assertions and safety checks; current pattern scans and a few instruction-in-candidate cases are not a jailbreak guarantee.
4. Larger performance samples only within approved free limits. Current sequential p95 is not concurrency/throughput/TTFT evidence.
5. Appium companion tests need a real target app and a device/emulator. Browser viewport checks are not native-mobile tests. AWS/Device Farm and paid providers are not enabled.
6. Consider database-backed multi-user storage, durable auth/rate limits, deployment approval/rollback and independent security review only when requirements justify them. Render Free plus unit/E2E CI is not production-grade certification.

Offline Ragas text-overlap metrics are integrated in an isolated reproducible adapter; model-based Ragas Faithfulness and DeepEval are not integrated. The dependency-light metric harness is explicit about that; adding a library does not replace independent validation.
