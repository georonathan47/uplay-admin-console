export type AthleteStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface Athlete {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sport: string;
  position: string | null;
  country: string | null;
  avatar_url: string | null;
  status: AthleteStatus;
  rating: number;
  connections_count: number;
  events_count: number;
  bio: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export type AthleteInsert = Omit<Athlete, 'id' | 'created_at' | 'updated_at' | 'joined_at' | 'connections_count' | 'events_count'> & {
  joined_at?: string;
  connections_count?: number;
  events_count?: number;
};

export type AthleteUpdate = Partial<AthleteInsert>;

export type ConnectionType = 'friend' | 'teammate' | 'coach' | 'scout' | 'mentor' | 'rival';
export type ConnectionStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

export interface Connection {
  id: string;
  athlete_id_a: string;
  athlete_id_b: string;
  connection_type: ConnectionType;
  status: ConnectionStatus;
  created_at: string;
  athlete_a?: Athlete;
  athlete_b?: Athlete;
}

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  location: string | null;
  venue: string | null;
  start_date: string;
  end_date: string | null;
  capacity: number;
  registered_count: number;
  status: EventStatus;
  image_url: string | null;
  organizer: string | null;
  created_at: string;
  updated_at: string;
}

export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at' | 'registered_count'> & {
  registered_count?: number;
};

export type EventUpdate = Partial<EventInsert>;

export type RegistrationStatus = 'registered' | 'confirmed' | 'attended' | 'cancelled';

export interface EventRegistration {
  id: string;
  event_id: string;
  athlete_id: string;
  status: RegistrationStatus;
  registered_at: string;
  athlete?: Athlete;
  event?: Event;
}

export type TicketCategory = 'general' | 'technical' | 'billing' | 'account' | 'event' | 'feature_request';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  submitted_by: string | null;
  submitter_email: string | null;
  assigned_to: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export type TicketInsert = Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'resolved_at'> & {
  resolved_at?: string | null;
};

export type TicketUpdate = Partial<TicketInsert>;

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'event' | 'system';
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationAudience = 'all' | 'athletes' | 'coaches' | 'specific';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  target_audience: NotificationAudience;
  target_id: string | null;
  is_read: boolean;
  is_published: boolean;
  scheduled_for: string | null;
  sent_count: number;
  created_at: string;
  updated_at: string;
}

export type NotificationInsert = Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'is_read' | 'sent_count'> & {
  is_read?: boolean;
  sent_count?: number;
};

export type NotificationUpdate = Partial<NotificationInsert>;

export type SettingCategory = 'general' | 'branding' | 'notifications' | 'events' | 'security' | 'integrations';

export interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: SettingCategory;
  label: string | null;
  description: string | null;
  updated_at: string;
}
