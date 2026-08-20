import { supabase } from '@/lib/supabase';
import { toPersonRef } from '@/lib/api/profiles';
import type { ActivityItem, ActivityType, NotificationRow, ProfileRow } from '@/lib/types';

/**
 * `recipient` is the user the notification was delivered to, embedded through
 * notifications_user_id_fkey.
 *
 * Reading other users' rows depends on the "UPlay admins can view all
 * notifications" policy; without admin rights this returns only your own.
 */
const ACTIVITY_COLUMNS =
  'id, user_id, type, actor_name, actor_avatar_url, related_entity_name, ' +
  'related_entity_id, message, is_read, created_at, ' +
  'recipient:profiles!notifications_user_id_fkey(id, email, first_name, last_name, avatar_url, user_type, sport)';

type NotificationRowWithRecipient = NotificationRow & { recipient: ProfileRow | null };

export function activityTypeLabel(type: ActivityType): string {
  // 'org_post_liked' → 'Org post liked'
  const words = type.replace(/_/g, ' ');
  return words[0].toUpperCase() + words.slice(1);
}

function toActivityItem(row: NotificationRowWithRecipient): ActivityItem {
  return {
    id: row.id,
    type: row.type,
    actorName: row.actor_name,
    actorAvatarUrl: row.actor_avatar_url,
    relatedEntityName: row.related_entity_name,
    message: row.message,
    isRead: row.is_read ?? false,
    createdAt: row.created_at,
    recipient: row.recipient ? toPersonRef(row.recipient) : null,
  };
}

/**
 * Read-only. The console observes the platform's activity feed; it does not
 * write to it — notifications are produced by the app and its edge functions,
 * and there is no admin INSERT or UPDATE policy on this table.
 */
export async function fetchActivity(limit = 200): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(ACTIVITY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as NotificationRowWithRecipient[]).map(toActivityItem);
}
