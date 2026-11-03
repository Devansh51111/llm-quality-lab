# Implementation source notes

Checked 3 November 2026. Product implementation choices are this project's own decisions; documentation is used for integration contracts.

- Promptfoo Python providers: `call_api(prompt, options, context)` and `output`/`error` result shape. https://www.promptfoo.dev/docs/providers/python/
- Promptfoo Python assertions: external `get_assert(output, context)` returning pass/score/reason. https://www.promptfoo.dev/docs/configuration/expected-outputs/python/
- Promptfoo Ollama/local-model support (optional path, no model run claimed). https://www.promptfoo.dev/docs/providers/ollama/
- Ollama generate endpoint: local POST `/api/generate`, `stream:false`, `response` output. https://docs.ollama.com/api/generate

No outside private chats, employer role listings, account screenshots or personal data are bundled in this repository. Synthetic reference snippets are authored examples, not sourced product policies.
