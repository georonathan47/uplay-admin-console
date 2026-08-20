import { supabase } from '@/lib/supabase';
import { fetchUpcomingEvents } from '@/lib/api/events';
import { fetchSupportRequests } from '@/lib/api/support';
import { toPerson } from '@/lib/api/profiles';
import type { OverviewData, ProfileRow } from '@/lib/types';

const PERSON_COLUMNS =
  'id, email, first_name, last_name, avatar_url, user_type, sport, phone, ' +
  'country_code, about_me, is_verified, is_profile_complete, is_uplay_admin, ' +
  'rating_score, rating_tier, suspended_at, created_at';

/** Unwraps a `head: true` count query, which returns a count and no rows. */
async function count(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>
): Promise<number> {
  const { count: value, error } = await query;
  if (error) throw new Error(error.message);
  return value ?? 0;
}

/** Shorthand for the count-only query shape. */
function rows(table: string) {
  return supabase.from(table).select('*', { count: 'exact', head: true });
}

export async function fetchOverview(): Promise<OverviewData> {
  const nowIso = new Date().toISOString();

  const [
    totalPeople,
    athletes,
    verifiedPeople,
    acceptedConnections,
    upcomingEventCount,
    openSupportRequests,
    unreadActivity,
    recentPeopleRes,
    sportRes,
    upcomingEvents,
    recentRequests,
  ] = await Promise.all([
    count(rows('profiles')),
    count(rows('profiles').eq('user_type', 'athlete')),
    count(rows('profiles').eq('is_verified', true)),
    count(rows('connections').eq('status', 'accepted')),
    count(rows('events').eq('is_draft', false).gte('start_date', nowIso)),
    count(rows('support_requests').in('status', ['new', 'in_progress'])),
    count(rows('notifications').eq('is_read', false)),
    supabase
      .from('profiles')
      .select(PERSON_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('profiles').select('sport'),
    fetchUpcomingEvents(4),
    fetchSupportRequests(5),
  ]);

  if (recentPeopleRes.error) throw recentPeopleRes.error;
  if (sportRes.error) throw sportRes.error;

  const sportCounts = (sportRes.data as { sport: string | null }[]).reduce<Record<string, number>>(
    (acc, row) => {
      if (!row.sport) return acc;
      acc[row.sport] = (acc[row.sport] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const sportDistribution = Object.entries(sportCounts)
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    stats: {
      totalPeople,
      athletes,
      verifiedPeople,
      acceptedConnections,
      upcomingEvents: upcomingEventCount,
      openSupportRequests,
      unreadActivity,
    },
    recentPeople: (recentPeopleRes.data as unknown as ProfileRow[]).map(toPerson),
    upcomingEvents,
    recentRequests,
    sportDistribution,
  };
}
