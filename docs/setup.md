# Setup

## Setup AI

IntentCode talks to any OpenAI-compatible chat-completions endpoint through
the Vercel AI SDK. The model is chosen in the environment, not in a database
table or a menu.

Put these in `src/engine/.env`:

```sh
# The key for the endpoint
INTENTCODE_AI_API_KEY=

# Any OpenAI-compatible endpoint. The default serves the free Gemini tier.
INTENTCODE_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# The model id to request from that endpoint
INTENTCODE_AI_MODEL=gemini-3.1-pro-preview
```

The compiler and the indexer run as separate AI tasks, so they can use
different models. Set a per-task variable to override the shared one:

```sh
INTENTCODE_AI_COMPILER_MODEL=
INTENTCODE_AI_INDEXER_MODEL=
```

Run `intent` and select `Info` from the main menu to see which model each AI
task resolves to.

### Pointing at a different provider

Any service that speaks the OpenAI chat-completions API works, including
OpenAI, OpenRouter, LiteLLM, and a local vLLM server. Change
`INTENTCODE_AI_BASE_URL`, `INTENTCODE_AI_API_KEY` and `INTENTCODE_AI_MODEL` to
match that provider's values.


## Run the IntentCode engine

To run: `npm run ic`
Or to run with dev checks (slower): `npm run ic-dev`


## Upgrading an existing install

The `llm_cache` and `source_node_generation` tables changed shape: the model
is now identified by a model id string instead of a row in the old model
catalogue, and the `ai_task` / `ai_task_tech` tables are gone. A database
created by an earlier version cannot be migrated in place, so delete it and let
the engine recreate it from the bundled seed on the next run:

- Linux: `~/.local/share/IntentCode/data.db`
- macOS: `~/Library/Application Support/IntentCode/data.db`
- Windows: `%APPDATA%\IntentCode\data.db`

The project graph and the chat history in that file are lost, so re-run a build
after upgrading.
