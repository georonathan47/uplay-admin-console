import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Search, Pencil, Trash2, MapPin, Users, Lock } from 'lucide-react';
import { deleteEvent, fetchEvents, updateEvent } from '@/lib/api/events';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDate, humanise } from '@/lib/format';
import type { EventEditable, EventItem, EventStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const STATUS_VARIANT: Record<EventStatus, 'primary' | 'success' | 'neutral' | 'warning'> = {
  draft: 'neutral',
  upcoming: 'primary',
  ongoing: 'success',
  completed: 'neutral',
};

/** `datetime-local` inputs need `YYYY-MM-DDTHH:mm`, not a full ISO string. */
function toLocalInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function EventsPage() {
  const fetcher = useCallback(() => fetchEvents(), []);
  const { data, loading, error, refetch } = useLiveQuery(fetcher, ['events']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const events = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        !term ||
        event.title.toLowerCase().includes(term) ||
        (event.location?.toLowerCase().includes(term) ?? false) ||
        (event.sport?.toLowerCase().includes(term) ?? false);
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  async function handleSave(patch: EventEditable) {
    if (!editing) return;
    setSaving(true);
    setActionError(null);
    try {
      await updateEvent(editing.id, patch);
      setEditing(null);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setActionError(null);
    try {
      await deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading events..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Events"
        description={`${events.length} ${events.length === 1 ? 'event' : 'events'} on the platform`}
      />

      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300 text-sm">
          {actionError}
        </div>
      )}

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, location or sport"
            className="input-field pl-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-44"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="No events match"
          description={
            events.length === 0
              ? 'No events exist in this project yet.'
              : 'Try clearing the search or filters.'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((event) => (
            <article key={event.id} className="card p-5 hover:border-dark-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-dark-100 truncate">{event.title}</h3>
                  <p className="text-xs text-dark-400 mt-1">
                    {formatDate(event.startDate)}
                    {event.endDate && ` — ${formatDate(event.endDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(event)}
                    className="btn-ghost p-2"
                    aria-label={`Edit ${event.title}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(event)}
                    className="btn-ghost p-2 text-error-400 hover:text-error-300"
                    aria-label={`Delete ${event.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {event.description && (
                <p className="text-sm text-dark-400 mt-3 line-clamp-2">{event.description}</p>
              )}

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Badge variant={STATUS_VARIANT[event.status]}>{humanise(event.status)}</Badge>
                {event.isApplicationClosed && (
                  <Badge variant="warning">
                    <Lock size={11} /> Applications closed
                  </Badge>
                )}
                {event.sport && <Badge variant="secondary">{event.sport}</Badge>}
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-800 text-xs text-dark-400 flex-wrap">
                {event.location && (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={13} className="flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </span>
                )}
                {event.capacity !== null && (
                  <span className="flex items-center gap-1.5">
                    <Users size={13} /> Max {event.capacity}
                  </span>
                )}
                {event.organizer && <span className="truncate">By {event.organizer.name}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <EditEventModal
          event={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete event"
        description="This permanently removes the event for everyone. It cannot be undone."
        size="sm"
      >
        <p className="text-sm text-dark-300">
          Delete <span className="font-medium text-dark-100">{deleteTarget?.title}</span>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={saving} className="btn-danger disabled:opacity-50">
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

interface EditEventModalProps {
  event: EventItem;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: EventEditable) => void;
}

function EditEventModal({ event, saving, onClose, onSave }: EditEventModalProps) {
  const [form, setForm] = useState<EventEditable>({
    title: event.title,
    description: event.description,
    sport: event.sport,
    location: event.location,
    start_date: event.startDate,
    end_date: event.endDate,
    max_participants: event.capacity,
    is_draft: event.isDraft,
    is_application_closed: event.isApplicationClosed,
  });

  return (
    <Modal open onClose={onClose} title="Edit event" description={event.title} size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="space-y-4"
      >
        <div>
          <label className="label-field" htmlFor="title">Title</label>
          <input
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="label-field" htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value || null })}
            className="input-field resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field" htmlFor="sport">Sport</label>
            <input
              id="sport"
              value={form.sport ?? ''}
              onChange={(e) => setForm({ ...form, sport: e.target.value || null })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="location">Location</label>
            <input
              id="location"
              value={form.location ?? ''}
              onChange={(e) => setForm({ ...form, location: e.target.value || null })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="start">Starts</label>
            <input
              id="start"
              type="datetime-local"
              value={toLocalInput(form.start_date)}
              onChange={(e) => setForm({ ...form, start_date: fromLocalInput(e.target.value) })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="end">Ends</label>
            <input
              id="end"
              type="datetime-local"
              value={toLocalInput(form.end_date)}
              onChange={(e) => setForm({ ...form, end_date: fromLocalInput(e.target.value) })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="capacity">Max participants</label>
            <input
              id="capacity"
              type="number"
              min={0}
              value={form.max_participants ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  max_participants: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="input-field"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <label className="flex items-center gap-3 text-sm text-dark-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_draft}
              onChange={(e) => setForm({ ...form, is_draft: e.target.checked })}
              className="w-4 h-4 accent-primary-500"
            />
            Draft — hidden from everyone except admins and its managers
          </label>
          <label className="flex items-center gap-3 text-sm text-dark-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_application_closed}
              onChange={(e) => setForm({ ...form, is_application_closed: e.target.checked })}
              className="w-4 h-4 accent-primary-500"
            />
            Applications closed
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
