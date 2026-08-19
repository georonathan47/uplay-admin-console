import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Filter,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type Event, type EventInsert, type EventUpdate, type EventStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const SPORTS = ['Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'Volleyball', 'Boxing', 'Rugby', 'Hockey', 'General'];
const STATUSES: EventStatus[] = ['upcoming', 'ongoing', 'completed', 'cancelled'];

const statusVariant = (status: string): 'primary' | 'success' | 'neutral' | 'error' => {
  const map: Record<string, 'primary' | 'success' | 'neutral' | 'error'> = {
    upcoming: 'primary',
    ongoing: 'success',
    completed: 'neutral',
    cancelled: 'error',
  };
  return map[status] || 'neutral';
};

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });
      if (err) throw err;
      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase()) ||
      e.sport.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCreate = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleSave = async (formData: EventInsert | EventUpdate) => {
    setSaving(true);
    try {
      if (editingEvent) {
        const { error: err } = await supabase
          .from('events')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingEvent.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('events').insert(formData as EventInsert);
        if (err) throw err;
      }
      setModalOpen(false);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('events').delete().eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleStatusChange = async (event: Event, newStatus: EventStatus) => {
    try {
      const { error: err } = await supabase
        .from('events')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', event.id);
      if (err) throw err;
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <PageHeader
        title="Events"
        description={`${events.length} events · ${events.filter((e) => e.status === 'upcoming').length} upcoming`}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={18} /> Create Event
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-error-500/10 border border-error-500/30 flex items-center justify-between">
          <p className="text-sm text-error-300">{error}</p>
          <button onClick={() => setError(null)} className="text-error-400 hover:text-error-300 text-sm">Dismiss</button>
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Search size={18} className="text-dark-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-dark-100 placeholder-dark-400 focus:outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Filter size={16} className="text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-dark-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-dark-900">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading events..." />
      ) : error && events.length === 0 ? (
        <ErrorState message={error} onRetry={loadEvents} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarDays size={28} />}
            title="No events found"
            description="Create a new sporting event"
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus size={18} /> Create Event
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((event) => {
            const fillPct = Math.min(100, Math.round((event.registered_count / event.capacity) * 100));
            return (
              <div key={event.id} className="card overflow-hidden hover:border-dark-700 transition-all duration-300 group">
                <div className="h-2 bg-gradient-to-r from-primary-500 to-secondary-500" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg leading-tight">{event.title}</h3>
                      <p className="text-sm text-dark-400 mt-1">{event.sport}</p>
                    </div>
                    <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                  </div>

                  {event.description && (
                    <p className="text-sm text-dark-300 mb-4 line-clamp-2">{event.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-dark-300">
                      <CalendarDays size={14} className="text-dark-500" />
                      <span>{formatDate(event.start_date)}</span>
                      <Clock size={12} className="text-dark-500 ml-1" />
                      <span className="text-dark-400">{formatTime(event.start_date)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <MapPin size={14} className="text-dark-500" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.organizer && (
                      <div className="flex items-center gap-2 text-sm text-dark-300">
                        <Users size={14} className="text-dark-500" />
                        <span>{event.organizer}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-dark-400">Registration</span>
                      <span className="text-xs font-medium text-dark-200">
                        {event.registered_count}/{event.capacity}
                      </span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          fillPct >= 90 ? 'bg-error-500' : fillPct >= 60 ? 'bg-warning-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-dark-800">
                    <select
                      value={event.status}
                      onChange={(e) => handleStatusChange(event, e.target.value as EventStatus)}
                      className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-dark-100 focus:outline-none focus:ring-1 focus:ring-primary-500/50 cursor-pointer"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(event)}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-primary-400 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteId(event.id)}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-error-500/20 text-dark-300 hover:text-error-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={editingEvent}
        onSave={handleSave}
        saving={saving}
      />

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Event"
        description="This action cannot be undone."
        size="sm"
      >
        <p className="text-sm text-dark-300 mb-6">
          Are you sure you want to delete this event? All registrations will also be removed.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  event: Event | null;
  onSave: (data: EventInsert | EventUpdate) => void;
  saving: boolean;
}

function EventFormModal({ open, onClose, event, onSave, saving }: EventFormModalProps) {
  const [form, setForm] = useState<EventInsert>({
    title: '',
    description: '',
    sport: 'General',
    location: '',
    venue: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    capacity: 100,
    registered_count: 0,
    status: 'upcoming',
    image_url: '',
    organizer: '',
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description || '',
        sport: event.sport,
        location: event.location || '',
        venue: event.venue || '',
        start_date: new Date(event.start_date).toISOString().slice(0, 16),
        end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
        capacity: event.capacity,
        registered_count: event.registered_count,
        status: event.status,
        image_url: event.image_url || '',
        organizer: event.organizer || '',
      });
    } else {
      setForm({
        title: '',
        description: '',
        sport: 'General',
        location: '',
        venue: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        capacity: 100,
        registered_count: 0,
        status: 'upcoming',
        image_url: '',
        organizer: '',
      });
    }
  }, [event, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EventInsert = {
      ...form,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
    };
    onSave(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit Event' : 'Create New Event'}
      description={event ? 'Update event details' : 'Set up a new sporting event'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field">Event Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field"
            placeholder="Summer Championship 2026"
          />
        </div>
        <div>
          <label className="label-field">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field min-h-[80px] resize-y"
            placeholder="Event description..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Sport *</label>
            <select
              value={form.sport}
              onChange={(e) => setForm({ ...form, sport: e.target.value })}
              className="input-field cursor-pointer"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s} className="bg-dark-900">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
              className="input-field cursor-pointer capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input-field"
              placeholder="London, UK"
            />
          </div>
          <div>
            <label className="label-field">Venue</label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="input-field"
              placeholder="Wembley Stadium"
            />
          </div>
          <div>
            <label className="label-field">Start Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">End Date & Time</label>
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Capacity *</label>
            <input
              type="number"
              required
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Organizer</label>
            <input
              type="text"
              value={form.organizer}
              onChange={(e) => setForm({ ...form, organizer: e.target.value })}
              className="input-field"
              placeholder="Youplay Sports"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
