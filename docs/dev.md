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
`src/core/project.ts` resolves a project by reading the one in a directory.
Adding a field
to a project means adding it to `ProjectConfig` and to `normalizeProjectConfig`;
a field that is present but the wrong type is an error naming the field.

### Testing a change

`npm run typecheck` from `src/engine` checks the whole tree. There is no
migration step and no codegen: a record is a JSON object, so adding a field
means adding it to the type and reading it defensively where an older file
might not have it.

## The bundle

`npm run build` from `src/engine` bundles `src/cli.ts` into `dist/cli.js` with
tsup and links it as the `intent` command. The bundle is ESM with a Bun
shebang, and both parts are load-bearing rather than preference:

- ESM, because the engine imports packages that only exist as ESM, and a CJS
  bundle cannot load them. `require` of an ESM-only package hands back the
  module namespace, so a default import of `chalk` arrives as a namespace and
  `chalk.bold` is `undefined` — the crash that made `intent` die on its first
  line of output.
- Bun, because `@oh-my-pi/pi-coding-agent` publishes its entry point as
  TypeScript source for a bundler to compile, and Node will not strip types
  inside `node_modules`. Bundling it is not an option either: it and its
  dependencies are written against Bun's builtins.

Dependencies stay external, so the runtime's own interop decides how each one
loads. `paths-service.ts` finds the engine root from `import.meta.dirname`,
which is the bundle's own directory; under the source tree that is
`src/services/utils`, and walking up from either reaches the same root.


## The AI layer

Everything the engine asks a model to do is a [Pi](https://omp.sh) session.
There is one door onto it, `src/services/ai/pi-service.ts`:

- `request` creates a session, prompts it once, and returns what it said. The
  differences between a compile worker, a chat and a one-shot question are the
  session's lifetime, its tools and its model, so they are parameters rather
  than separate code paths.
- `openSession` is `request` for a caller that keeps talking — a chat, which
  continues one transcript rather than being handed a list of previous
  messages to read.
- `cachedRequest` is a one-shot request whose reply is remembered against its
  prompt.

A worker's session is `SessionManager.inMemory()`: one prompt, then discarded.
A chat's is file-backed, so the transcript outlives the process.

The engine holds no credentials. Pi resolves the key for whichever provider a
model names, which is why `core/ai/model.ts` is only about turning a project's
`[model]` and `[models.<task>]` tables into a `provider/model` selector — and
why the 658-line hand-written CommandCode provider is gone: Pi ships that
provider itself.

`llm-cache-service.ts` is the cached reply, keyed on the prompt hash and the
model id, stored under `.intent/cache/llm.json`. It stays because Pi caches
provider-side prompt prefixes, not replies: a repeated prompt still costs a
round trip. Only `cachedRequest` uses it; a worker that edits files has no
reply worth remembering.
