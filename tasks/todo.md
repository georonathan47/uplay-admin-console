# Add "Invite person" and "Create event" to the admin console

Plan: `~/.claude/plans/this-is-the-knowledge-transient-liskov.md`

Previous task (wiring the console to the real UPlay Dev schema) is complete — its review is at the
bottom of this file.

## Tasks

- [x] 1. Migration — additive `UPlay admins can insert any event` policy
- [x] 2. Edge function `admin-invite-person` — service-role invite behind an is_uplay_admin check
- [x] 3. Deploy the function to UPlay Dev (v2; MCP, not the CLI — see notes)
- [x] 4. `src/lib/types.ts` — `NewPersonInput`, `InviteResult`, `EventCreatable`
- [x] 5. `src/lib/api/profiles.ts` — `invitePerson()`
- [x] 6. `src/lib/api/events.ts` — `createEvent()`
- [x] 7. `EventsPage.tsx` — "Create event" button, `EventFormModal` for create + edit
- [x] 8. `PeoplePage.tsx` — "Invite person" button, `InvitePersonModal`
- [x] 9. Verify — typecheck, lint, build, function authorization, end-to-end invite, event create

## Review

### What changed

**Events** gained a "Create event" button. The existing `EditEventModal` became one `EventFormModal`
serving both modes — the fields are identical, so the only difference is an organizer picker (create
only, since `created_by` is not something the console reassigns) and a default of `is_draft: true`, so
a new event is not live the moment it is saved.

**People** gained an "Invite person" button. This could not be done from the browser: `profiles.id`
is a foreign key to `auth.users(id)` and the only INSERT policy is `WITH CHECK (auth.uid() = id)`, so
an auth user has to exist first — which needs the service role key. That work lives in a new edge
function, `supabase/functions/admin-invite-person`, documented in its own README.

**Migration (additive).** One policy, `UPlay admins can insert any event`. The platform's own
`Event managers can insert events` is untouched; without the new one, `created_by` could only ever be
the signed-in admin.

### The thing worth knowing

`public.validate_athlete_registration()` is a BEFORE INSERT trigger on `profiles` that rejects
`user_type = 'athlete'` unless `organization_invitations` already holds a pending/accepted row for
that address. This was found by testing, not by reading — GoTrue reports it only as
"Database error saving new user".

So **athletes cannot be invited from this console**, and that is a platform invariant rather than a
gap: creating one here would need an `organization_id` and an `invited_by`, i.e. the whole
organizations domain the console does not model. The invite form omits `athlete` and says why; the
function still pre-checks the same condition and returns an actionable 422 if it is ever called
directly.

### Security notes

- The service role key is never configured or stored — Supabase injects it into the function runtime.
  Nothing was added to `.env` and nothing reaches the client bundle.
- The function re-verifies the caller itself rather than trusting `verify_jwt`. Proven necessary: the
  project's publishable key satisfies the platform gate but is rejected by the in-function check.
- The request body is an allowlist. `is_uplay_admin`, `is_verified` and `rating_score` are dropped,
  so the console cannot grant admin rights. Verified by sending all three.

### Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 2 pre-existing fast-refresh warnings |
| `npm run build` | succeeds, 352 kB / 99 kB gzipped |
| Policy landed | both INSERT policies present, base one unchanged |
| Security advisors | 101 lints, all pre-existing; none about the new policy, no `auth_rls_initplan` |
| CORS preflight (no auth) | 204 — works despite `verify_jwt: true` |
| Function, no `Authorization` | 401 at the platform gate |
| Function, publishable key as bearer | 401 from the in-function check |
| Function, forged JWT | 401 at the platform gate |
| Function, **non-admin** session | 403, and no `auth.users` row created |
| Function, athlete without org invite | 422 with an actionable message |
| Function, admin session | 200; profile created with metadata, phone and country code |
| Escalation attempt in body | `is_uplay_admin`, `is_verified`, `rating_score` all left at defaults |
| `createEvent` as admin, other organizer | 1 row inserted |
| Same insert as non-admin | blocked, `42501 new row violates row-level security policy` |
| Test data | removed; back to baseline 7 auth users / 5 profiles / 1 event |

### Not verified

Signed-in browser walkthrough — still needs an admin password. Everything above was exercised
against the live database through the same client library and policies the UI uses.

### Notes

- **`ALLOWED_ORIGINS` must be set before deploying the console anywhere but localhost:5173**, or the
  browser will block the invite call. See the function's README.
- The local `supabase` CLI is authenticated as an account without deploy rights (403), so the
  function was deployed through the Supabase MCP tool instead.
- GoTrue validates the invite domain, so `example.com` is rejected — testing needs a deliverable
  address.
- One invitation email was sent to `georonathan47+uplayconsoleprobe@outlook.com` during testing
  (an alias of the project owner's own inbox, so no mail could reach anyone else). That account has
  been deleted.
- Still open from the previous task: 7 `auth.users` rows but only 5 `profiles` — 2 OAuth users have
  no profile.

---

# Previous task — wire uplay-admin-console to the real UPlay Dev schema

## Tasks

- [x] 0. Environment — `.env`, `.env.example`, fail-fast in `src/lib/supabase.ts`
- [x] 1. Additive migration to UPlay Dev — admin policies + realtime publication
- [x] 2. `src/lib/types.ts` — rewrite against real columns
- [x] 3. `src/lib/api/*` — one module per domain, owns DB→view-model mapping
- [x] 4. `src/lib/useLiveQuery.ts` — fetch + postgres_changes subscription
- [x] 5. Admin gate — `auth.tsx` isAdmin, `App.tsx` gate, remove signup from `AuthPage.tsx`
- [x] 6. Pages — People, Events, Connections, Support, Activity, Account, Overview
- [x] 7. Nav — `Sidebar.tsx` / `Topbar.tsx` PageId rename
- [x] 8. Remove misleading files — stale migration (the `get-anon-key` edge function had already
       been removed by commit `f45c84a`, made outside this session)
- [x] 9. Verify — typecheck, lint, build, MCP policy/publication check, live-update test

## Review

### What changed

The console previously could not start (`createClient(undefined, undefined)` threw at module load)
and queried eight tables, five of which existed nowhere. It now reads UPlay Dev's real schema.

**Data layer (new).** `src/lib/api/{profiles,events,connections,support,activity,overview}.ts` own
every DB→UI mapping, so no component knows a column name. `src/lib/useLiveQuery.ts` fetches once and
refetches on any `postgres_changes` event for the tables a page names, debounced 250 ms, with a
request-sequence guard so a slow early response can't overwrite a newer one.

**Silent-failure guard.** Every mutation chains `.select('id')` and throws if zero rows come back.
Under RLS a blocked UPDATE succeeds with 0 rows affected and no error — without this, edits would
appear to save and silently do nothing.

**Migration (additive, applied to UPlay Dev).** Three policies — admin SELECT on `notifications`,
admin UPDATE/DELETE on `events` — plus five tables added to the `supabase_realtime` publication and
set to `REPLICA IDENTITY FULL`. No policy was restricted, no table or column changed.

**Scope reductions, all forced by the real schema:** Connections and Activity are read-only (no admin
write policy exists, and `notifications` is a per-user feed with no broadcast columns). Support drops
subject/priority/assignee/tags and the message thread — those columns and `ticket_messages` don't
exist. Settings became Account (no `settings` table). Events drops `registered_count` — there is no
registration table.

### Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors, 2 pre-existing fast-refresh warnings |
| `npm run build` | succeeds, 343 kB / 97 kB gzipped |
| Dev server module graph | all 10 page/lib modules compile and serve |
| Query syntax vs live PostgREST | all 5 embeds/column lists → HTTP 200 |
| Admin RLS (JWT impersonation, rolled back) | sees 5 profiles, 1 event, 1 connection, 1 notification |
| Non-admin RLS | sees 0 notifications — gate is load-bearing |
| Admin write (rolled back) | event UPDATE and profile UPDATE both affect 1 row |
| **Realtime end-to-end** | external `UPDATE` → `PUSH RECEIVED UPDATE on public.events` |

### Not verified

Signed-in browser walkthrough of all seven pages — needs an admin password. The two admin accounts
are `georonathan47@outlook.com` and `georonathan47@gmail.com`.

### Notes

- UPlay Dev is nearly empty (5 profiles — none with `user_type = 'athlete'` — 1 event, 1 connection,
  1 notification, 0 support requests). Sparse pages are correct. The People page therefore lists all
  profiles with a `user_type` facet rather than filtering to athletes, which would always be empty.
- `events.updated_at` on "Regional Championships" was bumped twice by the realtime test. No other
  live data was modified; every RLS probe ran inside a rolled-back transaction.
