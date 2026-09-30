# Setup

## Project configuration

A project is a directory containing an `intent.toml`. Create the file and the
directory is a project; every command is run from inside the project it is
about and works on the one named by that file.

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

`compiler` is the only AI task, so `[models.compiler]` is how one project runs
on a different model from another. A model is named the way Pi names one:
`provider/model`, with an optional `:thinking` suffix.

Run `intent` and select `Info` to see the project the engine resolved, the
state directory it will use, and the model each AI task resolved to.


## Setup AI

IntentCode runs on [Pi](https://omp.sh), the coding agent. The choice of model
comes from the project's `intent.toml`, falling back to the environment.

```sh
AI_MODEL=google/gemini-3.1-pro-preview
```

The value is `provider/model`, the same form Pi uses, with an optional
`:thinking` suffix (`anthropic/claude-opus-4-5:high`). Every provider Pi knows
is available; ask it what it has with:

```sh
omp --list-models
```

A model id may carry its own namespace, as OpenRouter's do:
`openrouter/anthropic/claude-sonnet-4.5` is OpenRouter serving a Claude. In an
`intent.toml` `[model]` table, state the provider in `provider` and give the
model id as that provider calls it; the two are joined for you.

### Credentials

The engine holds no credentials of its own. Pi resolves the key for whichever
provider a model names, so a key is set wherever Pi expects it — its own
config, or the environment:

```sh
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
OPENROUTER_API_KEY=
COMMANDCODE_API_KEY=
```

To point Pi at a self-hosted or OpenAI-compatible endpoint, configure it in
Pi's own models config rather than in `intent.toml`: the model is then named
the way that provider is named there.

## Skills

An extension carries skills as markdown files under `skills/`. A skill's
front-matter says when it applies:

```yaml
---
name: Bundled TypeScript
description: TypeScript skill
context:
  anyDependency:
    - name: typescript
      minVersion: 5
  fileExts: .ts, .tsx
---
```

- `fileExts` — the skill is about files of those extensions, and is given only
  to a session working on one.
- `anyDependency` — the project has to have one of those dependencies, at or
  above the stated version, read from the project's `package.json`.

A skill declaring neither applies everywhere, which is what a general
convention is.


## Running

The engine runs on [Bun](https://bun.sh), not Node. The Pi packages it is
built on are Bun programs: they are published as TypeScript source, which Node
refuses to load from `node_modules`, and they use Bun's builtins (`bun:sqlite`
for session storage among them). `intent` is a Bun script, so Bun has to be on
the PATH.

To run the cli from source: `bun ./src/cli.ts <command>` from `src/engine`,
or `npm run cli -- <command>`.
For an install: `npm install -g intentcode-compiler`, then run
`intent <command>`. There is no menu; run `intent` with no command and it
prints the commands it takes.


## Upgrading an existing install

The engine no longer uses a database. Everything it derived for a project used
to live in a SQLite file; it now lives under `.intent/` in the project
directory, and the projects themselves used to be rows in a table; they are now
the directories holding an `intent.toml`.

The old database can be deleted, and so can the directory that held it. It is
not read by any version of the engine from this release on, and the engine
writes nothing outside a project any more:

- Linux: `~/.local/share/IntentCode`
- macOS: `~/Library/Application Support/IntentCode`
- Windows: `%APPDATA%\IntentCode`

The bundled extensions are the one thing that used to live there, as a System
project every project inherited from. They are read out of the engine's own
directory instead and written into a project like any other extension, when
the project's `deps.json` names them.

A project created before the upgrade is a directory again. Create an
`intent.toml` in the project directory to make it a project; the source, the
Intent files and the extensions in the directory are untouched by the upgrade.
