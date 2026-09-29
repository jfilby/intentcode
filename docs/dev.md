# Dev

## Prisma and SQLite

The schema, the migrations and the seed database all live under
`src/engine/prisma/schema`.

Update migrations:
npx prisma migrate dev

Update generated code:
npx prisma generate

Note that `prisma migrate dev` refuses to run while the seed database has
drifted from the migration history. When that happens, bring the database to
the schema without a reset, then mark the migration as applied:

```sh
npx prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema --script \
  -o /tmp/seed-delta.sql
npx prisma db execute --file /tmp/seed-delta.sql
npx prisma migrate resolve --applied <migration_name>
```

`prisma migrate reset` is the alternative, but it is only safe while the seed
database is still empty.


## The AI layer

The engine uses the Vercel AI SDK (`ai` + `@ai-sdk/openai`). Everything model
related lives in `src/engine/src/services/ai`:

- `ai-model-service.ts` resolves the model id and builds the model from the
  environment (see `../docs/setup.md` for the variables).
- `llm-service.ts` owns the cache lookup, the JSON extraction and the retry
  loop. Callers pass a prompt and a `validate` callback; they must not
  re-implement any of that.
- `llm-cache-service.ts` is prisma CRUD over the `llm_cache` table, keyed on
  the model id.

The single-shot `request` path is cached per model id. The `chat` path is not
cached: its message list grows with every turn, so an entry would never be hit
again.
