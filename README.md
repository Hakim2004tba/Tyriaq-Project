# Tyriaq

An all-in-one workspace: tasks, projects, documents, chat and reporting,
built on Next.js and Supabase.

## What is here

```
apps/web        the application — Next.js 15, App Router
packages/ui     the design system: primitives, tokens, components
packages/utils  shared helpers
supabase/       schema as migrations, plus paste-ready SQL and tests
```

## Running it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in from Supabase
pnpm --filter web dev
```

The application needs a Supabase project. Paste `supabase/apply-all.sql`
into its SQL editor once, then run `supabase/verify.sql` — every row
should read `OK`, and anything missing names the file to run.

## The database

Authorisation is Row Level Security, not application code. Every policy
is executed against a real Postgres in `supabase/tests/` — nine suites,
covering workspaces, projects, tasks, collaboration, documents, chat,
time tracking, notifications and invitations. See `supabase/README.md`
for how the model is put together and `supabase/tests/README.md` for how
to run the suites.
