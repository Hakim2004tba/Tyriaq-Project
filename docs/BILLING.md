# Billing

## What exists

`plans`, `workspace_subscriptions` and `billing_events`. A workspace with
no subscription row is on **Free** — which is every workspace today, so
nothing changed for anybody when this shipped.

The Free plan allows **3 people** and **2 projects**, and the app enforces
both: inviting somebody or creating a project checks first and refuses
with a sentence naming the plan and the number. The check fails **open**
— if the limit cannot be read, the work is allowed. Refusing somebody's
project because billing is broken is the worse of the two mistakes.

## What does not exist: taking money

Stripe does not operate in Algeria, so no provider is named anywhere in
the schema or the code.

Pressing **Upgrade** records a `billing_events` row and emails
`BILLING_NOTIFY_EMAIL`. It does **not** move the workspace onto the plan.
A button that granted Pro because somebody clicked it would be giving the
product away while looking like billing.

Moving a workspace is one call, made by whoever confirms the payment:

```sql
select public.set_workspace_plan(
  '<workspace-uuid>', 'team', 'active', 10,
  now() + interval '1 month'
);
```

It is `security definer` with no `authenticated` grant, so it can only be
called by the service role or by somebody holding database credentials —
never from a browser session.

### Adding a provider later

One function to call, from one place: a webhook route that verifies the
provider's signature and then calls `set_workspace_plan` with
`provider` and `provider_ref` filled in. Nothing else in the product
needs to know which provider it is.

The realistic options for Algeria, in the order worth considering:

- **Chargily Pay** — Algerian, takes CIB and Edahabia cards, API-based.
  The only one that lets a local customer pay with the card they have.
- **Paddle** — merchant of record, handles international VAT. Whether
  they onboard an Algerian seller depends on the business registration.
- **Bank transfer / CCP** — no integration at all. For B2B in Algeria
  this is not a fallback, it is often what customers prefer.

The current flow is the third one, made explicit rather than pretended
away: the screen says payment is arranged by conversation.

## The back office

`/admin` is staff only, via `platform_admins`. It was gated on being
signed in, which was harmless while every page drew sample data and a
hole the moment one read a real subscription.

No policy lets a session write that table. The first staff member is
added with SQL:

```sql
insert into public.platform_admins (user_id, note)
select id, 'founder' from auth.users where email = 'you@example.com';
```

Until you run that, `/admin` is a 404 for everybody — including you.

The Subscriptions page shows real rows when any exist and the sample set
when none do, with a note saying which. Every other admin page is still
sample data.
