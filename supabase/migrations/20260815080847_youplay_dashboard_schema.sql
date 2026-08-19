/*
# Youplay Management Dashboard Schema

1. Overview
This migration creates the complete schema for the Youplay management dashboard — a sports platform
that manages athletes, their connections, events, support tickets, notifications, and system-wide settings.
The app is a single-tenant management dashboard (no sign-in screen), so policies allow the anon-key
client to perform CRUD operations.

2. New Tables
- `athletes` — athletes on the platform (name, sport, status, contact info, stats)
- `connections` — connections between athletes (networking relationships)
- `events` — sporting events (title, date, location, capacity, status)
- `event_registrations` — links athletes to events they're registered for
- `tickets` — support tickets (subject, priority, status, assignee)
- `ticket_messages` — messages within a support ticket thread
- `notifications` — push/in-app notifications sent to users/athletes
- `settings` — system-wide configuration key/value store

3. Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` since this is a no-auth management dashboard.
- CRUD operations are open to the anon-key client (intentionally shared management data).

4. Notes
- `settings` uses a key/value pattern with a JSONB value column for flexible configuration.
- `connections` stores a connection_type (friend, teammate, coach, scout, etc.) and status.
- All timestamps default to now().
*/

-- Athletes table
CREATE TABLE IF NOT EXISTS athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  sport text NOT NULL DEFAULT 'General',
  position text,
  country text,
  avatar_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  connections_count integer NOT NULL DEFAULT 0,
  events_count integer NOT NULL DEFAULT 0,
  bio text,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_athletes" ON athletes;
CREATE POLICY "anon_select_athletes" ON athletes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_athletes" ON athletes;
CREATE POLICY "anon_insert_athletes" ON athletes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_athletes" ON athletes;
CREATE POLICY "anon_update_athletes" ON athletes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_athletes" ON athletes;
CREATE POLICY "anon_delete_athletes" ON athletes FOR DELETE
  TO anon, authenticated USING (true);

-- Connections table (relationships between athletes)
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id_a uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  athlete_id_b uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  connection_type text NOT NULL DEFAULT 'teammate' CHECK (connection_type IN ('friend', 'teammate', 'coach', 'scout', 'mentor', 'rival')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_connection CHECK (athlete_id_a <> athlete_id_b)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_connections" ON connections;
CREATE POLICY "anon_select_connections" ON connections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_connections" ON connections;
CREATE POLICY "anon_insert_connections" ON connections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_connections" ON connections;
CREATE POLICY "anon_update_connections" ON connections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_connections" ON connections;
CREATE POLICY "anon_delete_connections" ON connections FOR DELETE
  TO anon, authenticated USING (true);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sport text NOT NULL DEFAULT 'General',
  location text,
  venue text,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  capacity integer NOT NULL DEFAULT 100,
  registered_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  image_url text,
  organizer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);

-- Event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'attended', 'cancelled')),
  registered_at timestamptz DEFAULT now(),
  UNIQUE(event_id, athlete_id)
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_event_registrations" ON event_registrations;
CREATE POLICY "anon_select_event_registrations" ON event_registrations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_event_registrations" ON event_registrations;
CREATE POLICY "anon_insert_event_registrations" ON event_registrations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_event_registrations" ON event_registrations;
CREATE POLICY "anon_update_event_registrations" ON event_registrations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_event_registrations" ON event_registrations;
CREATE POLICY "anon_delete_event_registrations" ON event_registrations FOR DELETE
  TO anon, authenticated USING (true);

-- Tickets table (support tickets)
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'account', 'event', 'feature_request')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  submitted_by text,
  submitter_email text,
  assigned_to text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tickets" ON tickets;
CREATE POLICY "anon_select_tickets" ON tickets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tickets" ON tickets;
CREATE POLICY "anon_insert_tickets" ON tickets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tickets" ON tickets;
CREATE POLICY "anon_update_tickets" ON tickets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tickets" ON tickets;
CREATE POLICY "anon_delete_tickets" ON tickets FOR DELETE
  TO anon, authenticated USING (true);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT 'Support Agent',
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ticket_messages" ON ticket_messages;
CREATE POLICY "anon_select_ticket_messages" ON ticket_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ticket_messages" ON ticket_messages;
CREATE POLICY "anon_insert_ticket_messages" ON ticket_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ticket_messages" ON ticket_messages;
CREATE POLICY "anon_update_ticket_messages" ON ticket_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ticket_messages" ON ticket_messages;
CREATE POLICY "anon_delete_ticket_messages" ON ticket_messages FOR DELETE
  TO anon, authenticated USING (true);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'event', 'system')),
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'athletes', 'coaches', 'specific')),
  target_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  scheduled_for timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE
  TO anon, authenticated USING (true);

-- Settings table (key-value store for system configuration)
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'branding', 'notifications', 'events', 'security', 'integrations')),
  label text,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_athletes_status ON athletes(status);
CREATE INDEX IF NOT EXISTS idx_athletes_sport ON athletes(sport);
CREATE INDEX IF NOT EXISTS idx_connections_athlete_a ON connections(athlete_id_a);
CREATE INDEX IF NOT EXISTS idx_connections_athlete_b ON connections(athlete_id_b);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_athlete ON event_registrations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
