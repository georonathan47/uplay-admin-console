import { supabase } from '@/lib/supabase';
import type { Person, PersonRef, PersonStatus, ProfileRow } from '@/lib/types';

/** Columns the console reads. Kept explicit so a schema change fails loudly. */
const PROFILE_COLUMNS =
  'id, email, first_name, last_name, avatar_url, user_type, sport, phone, ' +
  'country_code, about_me, is_verified, is_profile_complete, is_uplay_admin, ' +
  'rating_score, rating_tier, suspended_at, created_at';

export function displayName(row: Pick<ProfileRow, 'first_name' | 'last_name' | 'email'>): string {
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  // Falling back to the local part of the email keeps rows identifiable while a
  // profile is still incomplete.
  return full || row.email?.split('@')[0] || 'Unnamed';
}

/**
 * `profiles` has no status column. Suspension wins over completeness so a
 * suspended account never reads as merely "pending".
 */
function deriveStatus(row: ProfileRow): PersonStatus {
  if (row.suspended_at) return 'suspended';
  if (!row.is_profile_complete) return 'pending';
  return 'active';
}

export function toPersonRef(row: ProfileRow): PersonRef {
  return {
    id: row.id,
    name: displayName(row),
    avatarUrl: row.avatar_url,
    userType: row.user_type,
    sport: row.sport,
  };
}

export function toPerson(row: ProfileRow): Person {
  return {
    ...toPersonRef(row),
    email: row.email,
    phone: row.phone,
    countryCode: row.country_code,
    bio: row.about_me,
    status: deriveStatus(row),
    isVerified: row.is_verified ?? false,
    isProfileComplete: row.is_profile_complete ?? false,
    isAdmin: row.is_uplay_admin ?? false,
    ratingScore: row.rating_score,
    ratingTier: row.rating_tier,
    joinedAt: row.created_at,
    suspendedAt: row.suspended_at,
  };
}

export async function fetchPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  // The column list is concatenated, so supabase-js can't infer a row type from
  // it and falls back to GenericStringError. The shape is asserted here instead.
  return (data as unknown as ProfileRow[]).map(toPerson);
}

export async function fetchPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toPerson(data as unknown as ProfileRow) : null;
}

/**
 * Every write below goes through the "UPlay admins can update any profile" policy.
 * `.select()` is chained on so RLS filtering surfaces as an empty result we can
 * detect, rather than a silent no-op that looks like success.
 */
async function updateProfile(id: string, patch: Partial<ProfileRow>): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Update was blocked — this account may not have admin rights.');
  }
}

export function setVerified(id: string, isVerified: boolean): Promise<void> {
  return updateProfile(id, { is_verified: isVerified });
}

export function setSuspended(id: string, suspended: boolean): Promise<void> {
  return updateProfile(id, { suspended_at: suspended ? new Date().toISOString() : null });
}

/** Used by the Account page for the signed-in admin's own row. */
export function updateOwnProfile(
  id: string,
  patch: Pick<ProfileRow, 'first_name' | 'last_name' | 'phone' | 'avatar_url' | 'about_me'>
): Promise<void> {
  return updateProfile(id, patch);
}
