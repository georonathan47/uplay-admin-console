import { supabase } from '@/lib/supabase';
import { toPersonRef } from '@/lib/api/profiles';
import type {
  EventCreatable,
  EventEditable,
  EventItem,
  EventRow,
  EventStatus,
  ProfileRow,
} from '@/lib/types';

/**
 * `organizer` is embedded via the events_created_by_fkey relationship. The
 * constraint is named explicitly so the embed keeps resolving if another
 * events → profiles foreign key is ever added.
 */
const EVENT_COLUMNS =
  'id, title, description, image_url, location, sport, start_date, end_date, ' +
  'event_date, event_type, target_audience, age_range, registration_fee, ' +
  'max_participants, is_application_closed, is_draft, created_by, created_at, ' +
  'organizer:profiles!events_created_by_fkey(id, email, first_name, last_name, avatar_url, user_type, sport)';

type EventRowWithOrganizer = EventRow & { organizer: ProfileRow | null };

/**
 * `events` has no status column — it is derived from the draft flag and the
 * date window. `event_date` is the fallback for rows that predate start/end.
 */
export function deriveEventStatus(row: EventRow, now = Date.now()): EventStatus {
  if (row.is_draft) return 'draft';

  const start = row.start_date ?? row.event_date;
  if (!start) return 'upcoming';

  const startMs = new Date(start).getTime();
  if (now < startMs) return 'upcoming';

  // Without an end date, an event is treated as lasting that single day.
  const endMs = row.end_date
    ? new Date(row.end_date).getTime()
    : startMs + 24 * 60 * 60 * 1000;

  return now <= endMs ? 'ongoing' : 'completed';
}

function toEventItem(row: EventRowWithOrganizer): EventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sport: row.sport,
    location: row.location,
    imageUrl: row.image_url,
    startDate: row.start_date ?? row.event_date,
    endDate: row.end_date,
    capacity: row.max_participants,
    registrationFee: row.registration_fee,
    eventType: row.event_type,
    targetAudience: row.target_audience,
    ageRange: row.age_range,
    status: deriveEventStatus(row),
    isDraft: row.is_draft ?? false,
    isApplicationClosed: row.is_application_closed ?? false,
    organizer: row.organizer ? toPersonRef(row.organizer) : null,
    createdAt: row.created_at,
  };
}

export async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .order('start_date', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data as unknown as EventRowWithOrganizer[]).map(toEventItem);
}

export async function fetchUpcomingEvents(limit: number): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('is_draft', false)
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as EventRowWithOrganizer[]).map(toEventItem);
}

/**
 * Two policies permit this: the platform's own "Event managers can insert events"
 * (which requires `created_by = auth.uid()`) and the console's additive
 * "UPlay admins can insert any event", which is what makes the organizer picker
 * work. `.select('id')` is chained on for the same reason as the writes below.
 */
export async function createEvent(input: EventCreatable): Promise<string> {
  const { data, error } = await supabase.from('events').insert(input).select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Create was blocked — this account may not have admin rights.');
  }

  return data[0].id;
}

export async function updateEvent(id: string, patch: Partial<EventEditable>): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) throw error;
  // The base policy only lets event managers write their own rows; admin access
  // comes from an additive policy. An empty result means neither applied, which
  // Postgres reports as success rather than an error.
  if (!data || data.length === 0) {
    throw new Error('Update was blocked — this account may not have admin rights.');
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Delete was blocked — this account may not have admin rights.');
  }
}
