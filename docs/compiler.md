# IntentCode Compiler

## The loop

A build no longer generates source from a prompt. A session is handed an
Intent file and writes the source itself, with its own tools, in a project it
can read. What comes back is a file on disk rather than a string the engine has
to trust is a file.

The stages of a build, in order:

1. `verify-internals` — check the project against its own records
2. `define-tech-stack` — read `tech-stack.md` into the extensions and deps the
   rest of the build needs
3. `update-deps` — sync `deps.json` from the graph
4. `intent-code-analyzer` — read the Intent and report what is wrong with it
5. `compile` — one session per Intent file, each writing its own source
6. `update-deps`
7. `verify-internals`

The analyzer reports and changes nothing. It used to be handed a ranked list of
suggestions and apply the approved ones to the Intent itself, which meant the
engine rewrote a file it had only just read on the strength of a model
agreeing it was wrong. A session now reads the report and decides what to do
with it, holding the whole project as it does.

## Drift

Because a session writes the files, the graph is a record rather than an
oracle: it says what was there the last time the engine looked. The gap between
the two is reported, never repaired.

`ProjectVerifyService` runs `DriftService`, which reads the Intent files from
disk and reports, per file:

- **missing source** — there is no source file, or the engine has no record of
  one having been written.
- **stale source** — the Intent has changed since the source was written.
- **edited source** — the source on disk has changed since the engine recorded
  it. A session wrote it, or a person did.

The record is a map from a source path to two hashes — the Intent it answered
and its own content as last written — held on the *project* node. Not on the
build: each build grows its own source subtree and old ones are aged out, so a
record kept there would be deleted before anything could compare against it.

Reporting rather than repairing is the point. A check that fixed what it found
would leave nothing to show that a file had once been out of step, and would be
making the call about what to do on the engine's own authority.

## What the engine still owns

- **The graph.** `.intent/` says what should exist, and the source record says
  what was last written.
- **Which skills apply.** See `docs/setup.md`.
- **Hooks.** A hook is a script the engine runs; it is not a prompt and does
  not belong to a session.

## What it does not

- Credentials. Pi resolves the key for whichever provider a model names.
- How a request is made. Endpoints, retries and transport are Pi's.
- Rewriting source. That is a session's work, done with the project in view.
