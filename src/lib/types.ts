/**
 * Types for the UPlay Dev database (project dawzzrzxndemtvsctoji).
 *
 * Two layers live here:
 *   - `*Row` types mirror the live Postgres columns exactly. Change them only to
 *     match a migration.
 *   - The view models below are what pages render. The mapping between the two
 *     lives in `src/lib/api/*` so no component has to know a column name.
 */

// ─────────────────────────────── database rows ───────────────────────────────

export type RatingTier =
  | 'emerging_prospect'
  | 'developing_talent'
  | 'high_potential'
  | 'elite_talent';

export interface ProfileRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  sport: string | null;
  gender: string | null;
  is_profile_complete: boolean | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  phone: string | null;
  country_code: string | null;
  date_of_birth: string | null;
  address: string | null;
  about_me: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  current_profile_step: number | null;
  rating_score: number | null;
  rating_tier: RatingTier | null;
  rating_calculated_at: string | null;
  is_uplay_admin: boolean | null;
  suspended_at: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  country_code: string | null;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  date_range_display: string | null;
  event_type: string | null;
  target_audience: string | null;
  age_range: string | null;
  eligibility_criteria: string | null;
  registration_fee: number | null;
  payment_deadline: string | null;
  max_participants: number | null;
  is_application_closed: boolean | null;
  is_draft: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  video_url: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  sport: string | null;
}

/** The live check constraint allows exactly these three — there is no 'blocked'. */
export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface ConnectionRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string | null;
  updated_at: string | null;
}

export type ActivityType =
  | 'profile_view'
  | 'event_invite'
  | 'connection_request'
  | 'connection_accept'
  | 'stat_verified'
  | 'message'
  | 'general'
  | 'post_created'
  | 'post_liked'
  | 'post_commented'
  | 'event_created'
  | 'org_post_created'
  | 'org_post_liked'
  | 'org_post_commented';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: ActivityType;
  actor_name: string | null;
  actor_avatar_url: string | null;
  related_entity_name: string | null;
  related_entity_id: string | null;
  message: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

/** Note: 'new', not 'open' — the check constraint rejects 'open'. */
export type SupportStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export type SupportIssueType =
  | 'account_issues'
  | 'payment_problems'
  | 'technical_support'
  | 'feature_request'
  | 'other';

export interface SupportRequestRow {
  id: string;
  user_id: string;
  email: string;
  issue_type: SupportIssueType;
  description: string;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────── view models ─────────────────────────────────

/** Minimal person shape for avatars and names embedded in other views. */
export interface PersonRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  userType: string | null;
  sport: string | null;
}

/**
 * Derived, not stored. `profiles` has no status column — this is computed from
 * `suspended_at` and `is_profile_complete` in `src/lib/api/profiles.ts`.
 */
export type PersonStatus = 'active' | 'pending' | 'suspended';

export interface Person extends PersonRef {
  email: string;
  phone: string | null;
  countryCode: string | null;
  bio: string | null;
  status: PersonStatus;
  isVerified: boolean;
  isProfileComplete: boolean;
  isAdmin: boolean;
  ratingScore: number | null;
  ratingTier: RatingTier | null;
  joinedAt: string | null;
  suspendedAt: string | null;
}

/** Derived from `is_draft` and the event's date window. */
export type EventStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  sport: string | null;
  location: string | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  registrationFee: number | null;
  eventType: string | null;
  targetAudience: string | null;
  ageRange: string | null;
  status: EventStatus;
  isDraft: boolean;
  isApplicationClosed: boolean;
  organizer: PersonRef | null;
  createdAt: string | null;
}

/** Fields the admin console is allowed to write back to `events`. */
export interface EventEditable {
  title: string;
  description: string | null;
  sport: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  is_draft: boolean;
  is_application_closed: boolean;
}

export interface ConnectionItem {
  id: string;
  status: ConnectionStatus;
  createdAt: string | null;
  requester: PersonRef | null;
  addressee: PersonRef | null;
}

export interface SupportRequestItem {
  id: string;
  email: string;
  issueType: SupportIssueType;
  description: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  submitter: PersonRef | null;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actorName: string | null;
  actorAvatarUrl: string | null;
  relatedEntityName: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string | null;
  recipient: PersonRef | null;
}

export interface OverviewStats {
  totalPeople: number;
  athletes: number;
  verifiedPeople: number;
  acceptedConnections: number;
  upcomingEvents: number;
  openSupportRequests: number;
  unreadActivity: number;
}

export interface OverviewData {
  stats: OverviewStats;
  recentPeople: Person[];
  upcomingEvents: EventItem[];
  recentRequests: SupportRequestItem[];
  sportDistribution: { sport: string; count: number }[];
}
