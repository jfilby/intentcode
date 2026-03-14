IntentCode is an AI compiler that works with Intent files that are specs (in
Markdown). The Intent files are compiled into source. This is done by utilizing
the tech stack and extensions you've specified.

Extensions contain hook and skills files, used to give detailed prompting to
the compiler.


## Installing

For the moment you have to clone the IntentCode repo. An installable NPM is
coming soon.


## Running

To run cli, for setup and running the compiler, type `npm run cli`.


## Setup

The core setup should be run automatically on start, but you can rerun it
anytime by selecting `Setup` from the main menu. This defaults to using the
Gemini 3.1 Pro model (free tier).

To select another model choose `Manage AI models` from the main menu. To enter
a key for your AI API select `Manage AI keys` from the menu.


## Extensions

IntentCode currently ships with only two bundled extensions, for
Next.js/TypeScript and Node.js/TypeScript. Once you've created a project you
can install relevant extensions into it for the compiler to utilize them.


## Projects and their structure

Every project you build with IntentCode must be registered first. In the cli go
to Projects and add the project. The project root will be referred to as
PRJ_ROOT in this doc.

There's an `intent` directory in your project root where the Intent files go.

PRJ_ROOT/intent/tech-stack.md is a special file that specifies your tech stack.
You should create this file before proceeding. List your framework and any
preferred libraries in this file.

They are named with their compiled file extension and .md at the end. For
example the target PRJ_ROOT/index.ts should be PRJ_ROOT/intent/index.ts.md.

In the cli, under projects, select compile. Your Intent files will be compiled
to source.


## Compiler validation & suggestion

The compiler a feature that both validates your Intent files and suggests
improvements and fixes. This runs as part of the compiler (before compiling
each individual Intent file).


## Project chat

You can chat with the compiler about your projects. This chat makes use of the
compiler validation & suggestion feature.

