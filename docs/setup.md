# Setup

## Project configuration

A project is a directory containing an `intent.toml`. There is nothing to
register: create the file and the directory is a project. The engine finds the
project for a command by walking up from the working directory, so running it
anywhere inside a project binds to that project.

A minimal `intent.toml`:

```toml
name = "my-app"
```

Everything else is optional:

```toml
name = "my-app"

# The slug the project is addressed by. Defaults to the name.
key = "my-app"

# Your framework and preferred libraries. This is the tech stack the compiler
# builds against.
techStack = """
Next.js 16, TypeScript 5.9, Postgres via Prisma
"""

# Extension directories to load into this project.
extensions = ["./extensions"]

# The model every AI task uses.
[model]
provider = "google"
model = "gemini-3.1-pro-preview"

# A different model for one AI task.
[models.compiler]
provider = "openai"
model = "gpt-5"
```

The compiler and the indexer are separate AI tasks, so `[models.compiler]` and
`[models.indexer]` let a project run them on different models.

Run `intent` and select `Info` to see the project the engine resolved, the
state directory it will use, and the model each AI task resolved to.


## Setup AI

IntentCode talks to models through the Vercel AI SDK. The credentials come
from the environment; the choice of model comes from the project's
`intent.toml`, falling back to the environment.

Put the key in `src/engine/.env`:

```sh
AI_API_KEY=
```

To use a provider's own key instead of the generic one:

```sh
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
COMMANDCODE_API_KEY=
```


A model with no `[model]` table in `intent.toml` is taken from the
environment:

```sh
AI_MODEL=google/gemini-3.1-pro-preview
```

The value is `provider/model`. The providers are `openai`, `anthropic`,
`google`, `openrouter`, `openai-compatible` and `commandcode`.

A model id may carry its own namespace, as OpenRouter's and CommandCode's do:
`openrouter/anthropic/claude-sonnet-4.5` is OpenRouter serving a Claude, and
`commandcode/stealth/space-bunny-alpha` is one CommandCode model. In an
`intent.toml` `[model]` table, state the provider in `provider` and give the
model id as that provider calls it; the two are joined for you.

### CommandCode

CommandCode is not an OpenAI-shaped gateway — it has a transport of its own
(`POST /alpha/generate`, a stream of JSON events) — so it is named as a
provider rather than as an endpoint. Set `COMMANDCODE_API_KEY` (or
`COMMAND_CODE_API_KEY`):

```toml
[model]
provider = "commandcode"
model = "stealth/space-bunny-alpha"
```

### Pointing at a different provider

Anything that speaks the OpenAI chat-completions API works, including LiteLLM
and a local vLLM server. Use the `openai-compatible` provider and name the
endpoint:

```sh
AI_MODEL=openai-compatible/my-model
AI_BASE_URL=http://localhost:8000/v1
AI_API_KEY=anything
```

For OpenRouter, attribution headers are sent when these are set:

```sh
OPENROUTER_SITE_URL=https://example.com
OPENROUTER_APP_NAME=MyApp
```


## Running

To run the cli: `npm run cli` from `src/engine`.
For an install: `npm install -g intentcode-compiler`, then run `intent`.


## Upgrading an existing install

The engine no longer uses a database. Everything it derived for a project used
to live in a SQLite file; it now lives under `.intent/` in the project
directory, and the projects themselves used to be rows in a table; they are now
the directories holding an `intent.toml`.

The old database can be deleted. It is not read by any version of the engine
from this release on:

- Linux: `~/.local/share/IntentCode/data.db`
- macOS: `~/Library/Application Support/IntentCode/data.db`
- Windows: `%APPDATA%\IntentCode\data.db`

A project that was registered before the upgrade is no longer registered,
because registration was the database row. Create an `intent.toml` in the
project directory to make it a project again; the source, the Intent files and
the extensions in the directory are untouched by the upgrade.
