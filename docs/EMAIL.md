# Email

Tyriaq sends two kinds of mail:

**Straight away** — an invitation, a request to join a space, and the
answer to one. These are the moments where waiting until tomorrow is the
wrong answer, and they are sent by the action that causes them.

**Once a day** — everything else unread, in a single message per person.
One message rather than one per notification: a product that sends eleven
emails about eleven comments is one people filter into a folder they
never open.

## Turning it on

Three environment variables, all on the server — none of them start with
`NEXT_PUBLIC_`, and none of them may:

| Variable | What it is for | Needed by |
|---|---|---|
| `RESEND_API_KEY` | Sending at all | Everything |
| `MAIL_FROM` | The From address, e.g. `Tyriaq <no-reply@your-domain>` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Reading other people's notifications and addresses | The daily digest |
| `CRON_SECRET` | Proving a request came from the scheduler | The daily digest |

With none of them set, nothing breaks: mail is written to the server log
instead, and every screen that sends it says "ready to send" rather than
"sent".

### Without a domain

Resend will send from `onboarding@resend.dev` without any domain — but
only to the address that owns the Resend account. That is enough to see
the mail working, and not enough for real users. Once you have a domain,
verify it in Resend and set `MAIL_FROM`.

### The service-role key

It bypasses every row policy, which is why only one thing uses it: the
digest, which has to read unread notifications for everybody in order to
mail them. It lives in `lib/supabase/admin.ts` behind `server-only`, so
importing it from a client component fails the build rather than shipping
the key to a browser.

Nothing else should use it. A request made on behalf of a signed-in
person has a session; going around the policies turns a bug into a data
leak.

## The schedule

`vercel.json` runs `/api/cron/digest` at 07:00 UTC daily. Vercel's Hobby
plan allows one cron a day, which is why this is a daily digest rather
than an hourly one — the immediate mails above are what cover anything
that cannot wait.

The job is idempotent: every row it sends is stamped `email_sent_at`, so
a retry after a timeout, or a second run, mails nobody twice.

To run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/digest
```

It answers with what it did: `{"people":3,"sent":2,"skipped":1,"rows":11}`.
