# Deploying Tyriaq to Octenium (cPanel)

Octenium is cPanel hosting, so the app runs as a **Node.js application**
started by Passenger — not as a static site, and not on Vercel's
serverless runtime. That difference decides everything below.

## What gets uploaded

Not the repository. A **self-contained bundle**:

```bash
pnpm --filter @flow/web build     # produces .next/standalone
node scripts/bundle-for-octenium.mjs
```

That writes `dist/octenium/`, which contains the traced server, only the
`node_modules` it actually needs, the static chunks and `public/` — about
80 MB. Upload its **contents** to the application root.

Building on the server is not realistic on shared hosting: the workspace
install is close to a gigabyte and the build wants more memory than the
account is likely to have. Build on your machine, upload the result.

## In cPanel

**Setup Node.js App → Create Application**

| Field | Value |
|---|---|
| Node.js version | **20.x** (18.18 is the floor for Next 15 — if the list stops at 16, this will not run) |
| Application mode | Production |
| Application root | e.g. `tyriaq` |
| Application URL | your domain |
| Application startup file | `server.js` |

Then **Environment variables**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` — invitation links are built from it |
| `NODE_ENV` | `production` |

Do **not** run "Run NPM Install": the bundle already carries its
dependencies, and an install would try to resolve workspace packages
(`@flow/ui` and friends) that exist only in the monorepo.

Press **Restart**.

## Then, in Supabase

Authentication → URL Configuration:

- **Site URL**: `https://your-domain`
- **Redirect URLs**: add `https://your-domain/auth/callback`

Miss this and sign-up confirmations, password resets and invitation links
all point at `localhost:3000`.

## Updating

Rebuild, re-bundle, upload over the top, press Restart. The static chunk
filenames are content-hashed, so old ones can linger harmlessly; delete
`apps/web/.next/static` before uploading if you would rather keep it
clean.

## What to check when something is wrong

- **Blank page, HTML but no styling** — `.next/static` did not make it up.
  That is the failure the bundle script exists to prevent.
- **502 / "passenger could not spawn"** — almost always the Node version,
  or a startup file pointing somewhere that does not exist.
- **Signed in locally but not on the domain** — the Supabase URL
  configuration above.
- Passenger's log is in the cPanel file manager under the application
  root: `stderr.log`.

## Known limits of this kind of hosting

Shared cPanel is a single Node process with a memory ceiling. It will
serve this app, but it does not scale out, and a long build or a memory
spike takes the site with it. Image optimisation and the realtime
features are fine — realtime runs browser-to-Supabase and never touches
this server.
