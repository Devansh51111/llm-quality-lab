# Deliberate next steps

1. Expand from 16 demonstration cases to 50 human-reviewed golden and held-out cases. Add answer/reference rubrics, coverage tags and regression ownership.
2. Run real model outputs through imports without inventing provenance. Keep keys server-side and use only an explicitly approved free route. Do not put API keys in GitHub Pages.
3. Add and calibrate a semantic evaluator (DeepEval/Ragas/local judge) against human labels. Report uncertainty and error rates; do not rebrand keywords as faithfulness.
4. Add multi-turn/tool-call schema and failure-recovery tests with explicit state assertions.
5. Add performance trials with repeated latency distributions, real token accounting and transport error rates.
6. Add Appium companion tests only after an Android emulator/device and test application are available. AWS/Device Farm are not needed for the free MVP.
7. Consider PostgreSQL, authentication and a hosted backend when multi-user storage is a real requirement and hosting terms are approved.
