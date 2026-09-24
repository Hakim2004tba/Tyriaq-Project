# Going live

Everything here needs an account, a card or a domain, so it is yours to
do — the code is already waiting for each one.

## 1. A domain

`tyriaq-project.vercel.app` is not an address you sell from, and two
things depend on owning one:

- **Email.** Resend will only send from a domain you have verified. Until
  then it can reach *your own* address and nobody else's.
- **Trust.** Payment providers and business customers both check.

In Algeria a `.dz` needs a registered business (via NIC.dz); a `.com`
from any registrar takes ten minutes. Then in Vercel → Settings →
Domains, add it, and set `NEXT_PUBLIC_SITE_URL` to it — invitation and
space links are built from that variable, not from the request, so they
keep working when somebody opens a link from their phone.

## 2. Environment variables

In Vercel → Settings → Environment Variables. None of these may start
with `NEXT_PUBLIC_`, and none of them belong in the repository.

| Variable | Where it comes from | Without it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | The admin panel reads nothing; the daily digest does not run |
| `RESEND_API_KEY` | resend.com → API Keys | No mail is sent; it is written to the log instead |
| `MAIL_FROM` | `Tyriaq <no-reply@your-domain>` | Falls back to Resend's shared sender, which only reaches you |
| `CRON_SECRET` | Any long random string | The scheduled digest endpoint is unauthenticated |
| `BILLING_NOTIFY_EMAIL` | Your own address | Upgrade requests are recorded but nobody is told |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | Invitation and space links point at localhost |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Make yourself staff

`/admin` is a 404 for everybody until this runs — including you:

```sql
insert into public.platform_admins (user_id, note)
select id, 'founder' from auth.users where email = 'aissahakim20@gmail.com'
on conflict (user_id) do nothing;
```

## 4. The legal pages

`/terms` and `/privacy` are written and linked from the footer and the
signup form. Two blanks are left in them on purpose, because they are
facts about a business rather than something to invent:

- your registered business name and commercial register number (RC);
- your address.

Add both before selling to a company. Their finance department will ask,
and every payment provider checks the page before approving an account.

## 5. Before the first real customer

- **Backups.** Supabase takes daily backups on paid plans; the free tier
  does not. Know which you are on before somebody's month of work
  depends on it.
- **Error tracking.** Nothing reports a crash today. Sentry's free tier
  takes fifteen minutes and is the difference between a customer telling
  you something broke and you telling them.
- **Uploads.** Files live in Supabase Storage, which a database dump does
  not include. A restore from SQL alone comes back with every attachment
  missing.
