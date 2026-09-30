IntentCode is an AI compiler that works with Intent files that are specs (in
Markdown). The Intent files are compiled into source. This is done by utilizing
the tech stack and extensions you've specified.

Extensions contain hook and skills files, used to give detailed prompting to
the compiler.


## Prerequisites

Install Bun from: https://bun.sh

The engine runs on Bun, not Node. The Pi packages it is built on are Bun
programs: they are published as TypeScript source, which Node refuses to load
from `node_modules`, and they use Bun's builtins (`bun:sqlite` for session
storage among them). `intent` is a Bun script, so Bun has to be on the PATH.

## Installing

Install via NPM: `npm install -g intentcode-compiler`

The installed `intent` is a Bun script, so Bun has to be installed (see
[Prerequisites](#prerequisites)) for it to run.

The same command can be used to upgrade to new versions when they're available.

There is no menu: every command is an argument. Running `intent` with no
command prints the usage below.


## Running

To run the cli from source, type `bun ./src/cli.ts <command>` (or
`bun run cli -- <command>`) from `src/engine`, for example
`bun ./src/cli.ts build` from a project directory.

Every command runs inside a [bubblewrap](https://github.com/containers/bubblewrap)
sandbox, so `bwrap` has to be installed and on the PATH
(`dnf install bubblewrap`, `apt install bubblewrap`). The project is bound
read-write inside it and the directories above it are not present, so an agent
session cannot read or write outside the project it is working on. There is no
unsandboxed fallback; see [docs/setup.md](docs/setup.md#the-sandbox).

## Commands

    intent <command>  run one command against the project in the working
                     directory, and exit

    build              build the project
    chat               chat about the project's Intent files
    about              print the project the command resolved to
    load-extensions    copy extensions into the project
    manage-extensions  list, load and delete the project's extensions
    setup              set the project up
    tests              run the example builds
    info               print the models and settings in use

A command has to be run from inside the project it is about: the working
directory has to be the one holding the `intent.toml`.


## Projects

A project is a directory with an `intent.toml` in it. Create the file and the
directory is a project; a command run in it reads that file and works on the
project it names. The project root is referred to as PRJ_ROOT in this doc.

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
full list of variables and how to point at a different provider. Run
`intent info` to see which model each task resolved to.

There's an `intent` directory in your project root where the Intent files go.

They are named with their compiled file extension and .md at the end. For
example the target PRJ_ROOT/index.ts should be PRJ_ROOT/intent/index.ts.md.

Run `intent build` from the project directory. Your Intent files will be
compiled to source.


## Temporary files

Everything the engine derives for a project is written to a `.intent/`
directory in the project root: the source graph, the builds, the chat history
and the cached model replies. It is all disposable — delete the directory and
the next build recreates it. Your Intent files, your source and your
`intent.toml` are the only things you have to keep. The engine's own state —
the bundled extensions every project inherits from — is kept in your user
application directory rather than in a project, so it never appears in yours.


## Compiler validation & suggestion

The compiler a feature that both validates your Intent files and suggests
improvements and fixes. This runs as part of the compiler (before compiling
each individual Intent file).


## Project chat

You can chat with the compiler about your projects. This chat makes use of the
compiler validation & suggestion feature.
