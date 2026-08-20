import { supabase } from '@/lib/supabase';
import { toPersonRef } from '@/lib/api/profiles';
import type {
  ProfileRow,
  SupportIssueType,
  SupportRequestItem,
  SupportRequestRow,
  SupportStatus,
} from '@/lib/types';

export const SUPPORT_STATUSES: SupportStatus[] = ['new', 'in_progress', 'resolved', 'closed'];

export const ISSUE_TYPES: SupportIssueType[] = [
  'account_issues',
  'payment_problems',
  'technical_support',
  'feature_request',
  'other',
];

export function issueTypeLabel(type: SupportIssueType): string {
  const labels: Record<SupportIssueType, string> = {
    account_issues: 'Account',
    payment_problems: 'Payment',
    technical_support: 'Technical',
    feature_request: 'Feature request',
    other: 'Other',
  };
  return labels[type] ?? type;
}

export function statusLabel(status: SupportStatus): string {
  return status === 'in_progress' ? 'In progress' : status[0].toUpperCase() + status.slice(1);
}

/**
 * Submitters are resolved in a second query rather than embedded: unlike the
 * other tables, `support_requests.user_id` references `auth.users`, not
 * `profiles`, so there is no PostgREST relationship to traverse.
 */
async function loadSubmitters(rows: SupportRequestRow[]): Promise<Map<string, ProfileRow>> {
  const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, avatar_url, user_type, sport')
    .in('id', ids);

  if (error) throw error;
  return new Map((data as ProfileRow[]).map((row) => [row.id, row]));
}

function toSupportRequestItem(
  row: SupportRequestRow,
  submitters: Map<string, ProfileRow>
): SupportRequestItem {
  const submitter = submitters.get(row.user_id);
  return {
    id: row.id,
    email: row.email,
    issueType: row.issue_type,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submitter: submitter ? toPersonRef(submitter) : null,
  };
}

export async function fetchSupportRequests(limit?: number): Promise<SupportRequestItem[]> {
  let query = supabase
    .from('support_requests')
    .select('id, user_id, email, issue_type, description, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data as SupportRequestRow[];
  const submitters = await loadSubmitters(rows);
  return rows.map((row) => toSupportRequestItem(row, submitters));
}

/**
 * The only mutation the console is permitted: "UPlay admins update support
 * requests". There is no admin INSERT or DELETE policy — requests are filed by
 * users from the app and are never removed from here.
 */
export async function updateSupportStatus(id: string, status: SupportStatus): Promise<void> {
  const { data, error } = await supabase
    .from('support_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Update was blocked — this account may not have admin rights.');
  }
}
