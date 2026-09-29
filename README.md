IntentCode is an AI compiler that works with Intent files that are specs (in
Markdown). The Intent files are compiled into source. This is done by utilizing
the tech stack and extensions you've specified.

Extensions contain hook and skills files, used to give detailed prompting to
the compiler.


## Prerequisites

Install Node.js from: https://nodejs.org

Get/download the latest, or v22 to be on the version IntentCode is developed
for.


## Installing

Install via NPM: `npm install -g intentcode-compiler`

The same command can be used to upgrade to new versions when they're available.

Start the cli by running `intent`.


## Running

To run cli, for setup and running the compiler, type `npm run cli`.


## Projects

A project is a directory with an `intent.toml` in it. There is nothing to
register: create the file and the directory is a project. The engine finds the
project for a command by walking up from the working directory, so running it
anywhere inside a project binds to that project. The project root is referred
to as PRJ_ROOT in this doc.

PRJ_ROOT/intent.toml is the project config. The name is the only required
field:

```toml
name = "my-app"

# Your framework and preferred libraries. Create this before proceeding.
techStack = """
Next.js 16, TypeScript 5.9, Postgres via Prisma
"""

# The model the AI tasks use, and a per-task override.
[model]
provider = "google"
model = "gemini-3.1-pro-preview"

[models.compiler]
provider = "openai"
model = "gpt-5"
```

The API key is configured in the environment rather than in a menu. Set
`AI_API_KEY` in `src/engine/.env`; see [docs/setup.md](docs/setup.md) for the
full list of variables and how to point at a different provider. Select `Info`
from the main menu to see which model each task resolved to.

There's an `intent` directory in your project root where the Intent files go.

They are named with their compiled file extension and .md at the end. For
example the target PRJ_ROOT/index.ts should be PRJ_ROOT/intent/index.ts.md.

In the cli, under projects, select compile. Your Intent files will be compiled
to source.


## Temporary files

Everything the engine derives for a project is written to a `.intent/`
directory in the project root: the source graph, the builds, the chat history
and the cached model replies. It is all disposable — delete the directory and
the next build recreates it. Your Intent files, your source and your
`intent.toml` are the only things you have to keep.


## Compiler validation & suggestion

The compiler a feature that both validates your Intent files and suggests
improvements and fixes. This runs as part of the compiler (before compiling
each individual Intent file).


## Project chat

You can chat with the compiler about your projects. This chat makes use of the
compiler validation & suggestion feature.
