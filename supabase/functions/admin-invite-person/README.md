# admin-invite-person

Creates a UPlay account on an admin's behalf and emails an invitation.

This exists because `public.profiles.id` is a foreign key to `auth.users(id)`, and the only INSERT
policy on `profiles` is `WITH CHECK (auth.uid() = id)` — you may create your own row and nobody
else's. Creating another person's account needs `auth.admin.*`, which needs the service role key,
which must never reach a browser bundle.

## Authorization

`verify_jwt` is enabled, but the real boundary is inside the function: it resolves the caller's
bearer token with `auth.getUser()` and then reads `profiles.is_uplay_admin` through the service role.
Anything short of `true` gets a 403. This matters — the project's publishable key satisfies the
platform's gate but is rejected here, which is verified behaviour, not an assumption.

The request body is an allowlist. `is_uplay_admin` and `is_verified` are **not accepted**, so the
console cannot grant admin rights to anyone including itself. Admin status stays a database-level
grant.

## Configuration

Both are optional secrets, set with `supabase secrets set` or in the dashboard under
Edge Functions → Secrets. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
and must not be set by hand.

| Secret | Default | Notes |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated. **Set this before deploying the console anywhere else** or the browser will block the call. |
| `INVITE_REDIRECT_URL` | project Site URL | Where the invite link lands so the person can set a password. |

## Known constraints

- **Athletes cannot be invited here.** `public.validate_athlete_registration()` is a BEFORE INSERT
  trigger on `profiles` that raises unless `organization_invitations` already holds a
  pending/accepted row for the address. GoTrue surfaces that as an opaque
  "Database error saving new user", so the function pre-checks the same condition and returns a 422
  explaining it. The console's invite form omits `athlete` for this reason.
- **The mailer can refuse the address.** GoTrue validates the domain, so `example.com` and other
  non-deliverable domains are rejected outright.
- **Delivery is rate-limited.** Without custom SMTP, Supabase's built-in sender allows only a couple
  of messages per hour. When a send fails the function falls back to `generateLink` and returns an
  `actionLink` for the admin to pass on by hand, with `invited: false`.
- No rate limiting of its own. The endpoint is admin-only, but a runaway caller could still burn the
  mail quota.

## Response

```jsonc
{
  "invited": true,          // false when the account exists but the email did not send
  "userId": "uuid",
  "email": "name@example.com",
  "actionLink": null,       // set only when invited is false
  "reason": null            // why the mail failed, or a non-fatal problem
}
```
