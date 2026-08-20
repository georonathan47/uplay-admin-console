/**
 * admin-invite-person — create a UPlay account on an admin's behalf and email an invite.
 *
 * Why this has to be a server function: `public.profiles.id` is a foreign key to
 * `auth.users(id)`, and the only INSERT policy on `profiles` is
 * `WITH CHECK (auth.uid() = id)` — you may create your own row and nobody else's.
 * Creating another person's account therefore needs `auth.admin.*`, which needs
 * the service role key, which must never reach a browser bundle.
 *
 * The service role key is not configured anywhere. Supabase injects
 * SUPABASE_SERVICE_ROLE_KEY into the function runtime and it never leaves this file.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * Browser callers are held to an allowlist. Defence in depth only — CORS stops a
 * page, not a script, so the is_uplay_admin check below is the real boundary.
 */
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** Where the invite link lands. Undefined falls back to the project's Site URL. */
const INVITE_REDIRECT_URL = Deno.env.get('INVITE_REDIRECT_URL') || undefined;

const USER_TYPES = ['athlete', 'coach_scout', 'org_admin'];
const GENDERS = ['Male', 'Female', 'Other'];

/** Deliberately loose — real validation is the invite email arriving. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Metadata keys read by the `handle_new_user()` trigger. */
interface ProfileMetadata {
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
  sport: string | null;
  gender: string | null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/** Trims, collapses empty to null, and caps length so nothing unbounded is stored. */
function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

/**
 * Distinguishes "the account could not be created" from "the account was created
 * but the mail did not go out". Only the latter is worth a fallback link — if the
 * database rejected the row, no link exists to hand over.
 */
function isMailFailure(error: { message: string; status?: number; code?: string }): boolean {
  if (error.status === 429) return true;
  const text = `${error.code ?? ''} ${error.message}`.toLowerCase();
  return (
    text.includes('rate limit') ||
    text.includes('smtp') ||
    text.includes('error sending') ||
    text.includes('email provider')
  );
}

/**
 * Produces a usable link when the mailer refuses to send one.
 *
 * `invite` creates the account if it does not exist yet. If the failed send had
 * already created it, that call is rejected as a duplicate, so `recovery` is
 * tried next — it yields an equivalent set-password link for an existing account.
 */
async function generateFallbackLink(
  admin: SupabaseClient,
  email: string,
  metadata: ProfileMetadata
): Promise<{ link: string | null; userId: string | null; reason: string | null }> {
  const invite = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: metadata, redirectTo: INVITE_REDIRECT_URL },
  });
  if (!invite.error) {
    return {
      link: invite.data.properties?.action_link ?? null,
      userId: invite.data.user?.id ?? null,
      reason: null,
    };
  }

  const recovery = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: INVITE_REDIRECT_URL },
  });
  if (!recovery.error) {
    return {
      link: recovery.data.properties?.action_link ?? null,
      userId: recovery.data.user?.id ?? null,
      reason: null,
    };
  }

  return { link: null, userId: null, reason: recovery.error.message };
}

Deno.serve(async (request: Request): Promise<Response> => {
  const cors = corsHeaders(request.headers.get('Origin'));

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'Function is misconfigured — missing project credentials' }, 500, cors);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. Identify the caller ────────────────────────────────────────────────
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Missing Authorization header' }, 401, cors);

  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller?.user) {
    return json({ error: 'Invalid or expired session' }, 401, cors);
  }

  // ── 2. Authorize ──────────────────────────────────────────────────────────
  // Read through the service role so the answer does not depend on the caller's
  // own row visibility. This check, not CORS or the platform's JWT gate, is what
  // actually protects the endpoint.
  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('is_uplay_admin')
    .eq('id', caller.user.id)
    .maybeSingle();

  if (profileError) return json({ error: 'Could not verify admin status' }, 500, cors);
  if (!callerProfile?.is_uplay_admin) return json({ error: 'Admin access required' }, 403, cors);

  // ── 3. Validate the payload against an allowlist ──────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be JSON' }, 400, cors);
  }

  const email = cleanText(body.email, 254)?.toLowerCase() ?? null;
  if (!email || !EMAIL_PATTERN.test(email)) {
    return json({ error: 'A valid email address is required' }, 400, cors);
  }

  const userType = cleanText(body.user_type, 32);
  if (userType && !USER_TYPES.includes(userType)) {
    return json({ error: `user_type must be one of: ${USER_TYPES.join(', ')}` }, 400, cors);
  }

  const gender = cleanText(body.gender, 16);
  if (gender && !GENDERS.includes(gender)) {
    return json({ error: `gender must be one of: ${GENDERS.join(', ')}` }, 400, cors);
  }

  // Exactly the keys `handle_new_user()` reads. Everything else in the body is
  // dropped here — `is_uplay_admin` above all, so the console cannot mint admins.
  const metadata: ProfileMetadata = {
    first_name: cleanText(body.first_name, 80),
    last_name: cleanText(body.last_name, 80),
    user_type: userType,
    sport: cleanText(body.sport, 60),
    gender,
  };

  // ── 4. Pre-check the platform's athlete rule ──────────────────────────────
  // `public.validate_athlete_registration()` is a BEFORE INSERT trigger on
  // profiles that raises unless an organization has already invited the address.
  // GoTrue reports that as an opaque "Database error saving new user", so the
  // same condition is checked here to produce a message an admin can act on.
  if (userType === 'athlete') {
    const { data: orgInvites } = await admin
      .from('organization_invitations')
      .select('id')
      .eq('email', email)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (!orgInvites?.length) {
      return json(
        {
          error:
            'Athletes must be invited by an organization first. There is no pending ' +
            `organization invitation for ${email}, so this account cannot be created here.`,
        },
        422,
        cors
      );
    }
  }

  // ── 5. Invite ─────────────────────────────────────────────────────────────
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: metadata,
    redirectTo: INVITE_REDIRECT_URL,
  });

  let userId = invited?.user?.id ?? null;
  let emailSent = true;
  let actionLink: string | null = null;
  const notes: string[] = [];

  if (inviteError) {
    // A rejected row is a dead end — there is no account, so there is no link to
    // offer. Report it and stop.
    if (!isMailFailure(inviteError)) {
      return json({ error: `Could not invite ${email}: ${inviteError.message}` }, 422, cors);
    }

    // The built-in Supabase mailer is rate-limited and, without custom SMTP, may
    // refuse addresses outside the project team. The account itself is fine, so
    // generate the link here for the admin to hand over directly.
    emailSent = false;
    notes.push(inviteError.message);

    const fallback = await generateFallbackLink(admin, email, metadata);
    if (!fallback.link) {
      const detail = [inviteError.message, fallback.reason].filter(Boolean).join('; ');
      return json({ error: `Could not invite ${email}: ${detail}` }, 502, cors);
    }
    actionLink = fallback.link;
    userId = fallback.userId ?? userId;
  }

  // ── 6. Fill in the columns the trigger does not know about ────────────────
  const phone = cleanText(body.phone, 32);
  const countryCode = cleanText(body.country_code, 8);

  if (userId && (phone || countryCode)) {
    const patch: Record<string, string> = { updated_at: new Date().toISOString() };
    if (phone) patch.phone = phone;
    if (countryCode) patch.country_code = countryCode;

    const { error: patchError } = await admin.from('profiles').update(patch).eq('id', userId);
    // The account exists either way; a failed patch is reported, not fatal.
    if (patchError) notes.push(`contact details were not saved: ${patchError.message}`);
  }

  return json(
    {
      invited: emailSent,
      userId,
      email,
      actionLink,
      reason: notes.length ? notes.join('; ') : null,
    },
    200,
    cors
  );
});
