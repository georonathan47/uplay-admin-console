import { supabase } from '@/lib/supabase';
import { toPersonRef } from '@/lib/api/profiles';
import type { ConnectionItem, ConnectionRow, ProfileRow } from '@/lib/types';

const PERSON_FIELDS = 'id, email, first_name, last_name, avatar_url, user_type, sport';

/**
 * Both sides must name their foreign key explicitly — `connections` has two
 * relationships to `profiles`, so a bare `profiles(...)` embed is ambiguous and
 * PostgREST rejects it.
 *
 * Reads rely on the "UPlay admins can view all connections" policy; without
 * admin rights this returns only the signed-in user's own rows.
 */
const CONNECTION_COLUMNS =
  'id, status, created_at, requester_id, addressee_id, ' +
  `requester:profiles!connections_requester_id_fkey(${PERSON_FIELDS}), ` +
  `addressee:profiles!connections_addressee_id_fkey(${PERSON_FIELDS})`;

type ConnectionRowWithPeople = ConnectionRow & {
  requester: ProfileRow | null;
  addressee: ProfileRow | null;
};

function toConnectionItem(row: ConnectionRowWithPeople): ConnectionItem {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    requester: row.requester ? toPersonRef(row.requester) : null,
    addressee: row.addressee ? toPersonRef(row.addressee) : null,
  };
}

/**
 * Read-only by design. The live policies let only the addressee update a
 * connection and only a participant delete one, so there is no admin-side
 * mutation to expose here.
 */
export async function fetchConnections(): Promise<ConnectionItem[]> {
  const { data, error } = await supabase
    .from('connections')
    .select(CONNECTION_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as ConnectionRowWithPeople[]).map(toConnectionItem);
}
