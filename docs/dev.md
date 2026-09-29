# Dev

## Storage

There is no database and no ORM. The engine reads and writes JSON under a
project's `.intent/` directory, and every path it touches goes through one
module.

- `src/core/json-store.ts` is the only thing that touches the disk. Paths are
  relative to a store root and may not escape it. Writes go to a temporary
  file and are renamed into place, so a record is never read half written.
- `src/core/collection.ts` is a collection of records backed by one JSON file.
  It speaks the query surface the services use: a `where` of equality tests,
  an `orderBy`, and named `include`s for the two relations the graph services
  read. A field whose expected value is `undefined` is not compared, which is
  what lets a caller pass a column it did not narrow.
- `src/core/store.ts` binds the collections to a project root. A store is
  never shared between projects, so a record name cannot reach another
  project's data.
- `src/core/records.ts` is the shape of every record. Dates on records are ISO
  strings, not `Date`.

`src/core/project-config.ts` reads and writes `intent.toml`, and
`findProjectRoot` resolves the project for a path by walking up. Adding a field
to a project means adding it to `ProjectConfig` and to `normalizeProjectConfig`;
a field that is present but the wrong type is an error naming the field.

### Testing a change

`npm run typecheck` from `src/engine` checks the whole tree. There is no
migration step and no codegen: a record is a JSON object, so adding a field
means adding it to the type and reading it defensively where an older file
might not have it.


## The AI layer

The engine uses the Vercel AI SDK (`ai` plus the provider packages). Model
resolution is in `src/core/ai`:

- `model.ts` turns a `provider/model` spec into a `ModelConfiguration`. The
  provider decides which environment key is read, and which provider package
  is constructed. `resolveModelForTask` layers a project's `[model]` and
  `[models.<task>]` tables over the environment.
- `provider.ts` turns a resolved configuration into an SDK model. Anthropic is
  reached through its own package; the rest go through the OpenAI-compatible
  surface.
- `src/services/ai/llm-service.ts` owns the cache lookup, the JSON extraction
  and the retry loop. Callers pass a prompt and a `validate` callback; they
  must not re-implement any of that.
- `llm-cache-service.ts` is the cached reply, keyed on the prompt hash and the
  model id, stored under `.intent/cache/llm.json`.

The single-shot `request` path is cached per model id. The `chat` path is not
cached: its message list grows with every turn, so an entry would never be hit
again.
