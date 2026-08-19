import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Plus,
  Search,
  Trash2,
  Send,
  Filter,
  CheckCircle2,
  Clock,
  Mail,
  Smartphone,
  MessageSquare,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  type Notification,
  type NotificationInsert,
  type NotificationType,
  type NotificationChannel,
  type NotificationAudience,
} from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const TYPES: NotificationType[] = ['info', 'success', 'warning', 'error', 'event', 'system'];
const CHANNELS: NotificationChannel[] = ['in_app', 'push', 'email', 'sms'];
const AUDIENCES: NotificationAudience[] = ['all', 'athletes', 'coaches', 'specific'];

const typeVariant = (t: string): 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'accent' => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'accent'> = {
    info: 'primary',
    success: 'success',
    warning: 'warning',
    error: 'error',
    event: 'accent',
    system: 'neutral',
  };
  return map[t] || 'neutral';
};

const channelIcon: Record<string, typeof Bell> = {
  in_app: Globe,
  push: Smartphone,
  email: Mail,
  sms: MessageSquare,
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<NotificationInsert>({
    title: '',
    message: '',
    type: 'info',
    channel: 'in_app',
    target_audience: 'all',
    is_published: false,
    scheduled_for: '',
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filtered = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: NotificationInsert = {
        ...form,
        scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
        is_published: !form.scheduled_for,
      };
      const { error: err } = await supabase.from('notifications').insert(payload);
      if (err) throw err;
      setCreateOpen(false);
      setForm({
        title: '', message: '', type: 'info', channel: 'in_app',
        target_audience: 'all', is_published: false, scheduled_for: '',
      });
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (notif: Notification) => {
    try {
      const { error: err } = await supabase
        .from('notifications')
        .update({
          is_published: true,
          sent_count: notif.sent_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notif.id);
      if (err) throw err;
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish notification');
    }
  };

  const handleToggleRead = async (notif: Notification) => {
    try {
      const { error: err } = await supabase
        .from('notifications')
        .update({ is_read: !notif.is_read, updated_at: new Date().toISOString() })
        .eq('id', notif.id);
      if (err) throw err;
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('notifications').delete().eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null);
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatDateTime = (date: string) => new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const stats = {
    total: notifications.length,
    published: notifications.filter((n) => n.is_published).length,
    scheduled: notifications.filter((n) => n.scheduled_for && !n.is_published).length,
    unread: notifications.filter((n) => !n.is_read).length,
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${stats.total} notifications · ${stats.published} sent · ${stats.scheduled} scheduled`}
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={18} /> New Notification
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-error-500/10 border border-error-500/30 flex items-center justify-between">
          <p className="text-sm text-error-300">{error}</p>
          <button onClick={() => setError(null)} className="text-error-400 hover:text-error-300 text-sm">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-dark-400">Total</p>
          <p className="text-2xl font-display font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-dark-400">Published</p>
          <p className="text-2xl font-display font-bold text-success-400 mt-1">{stats.published}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-dark-400">Scheduled</p>
          <p className="text-2xl font-display font-bold text-accent-400 mt-1">{stats.scheduled}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-dark-400">Unread</p>
          <p className="text-2xl font-display font-bold text-primary-400 mt-1">{stats.unread}</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Search size={18} className="text-dark-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-dark-100 placeholder-dark-400 focus:outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Filter size={16} className="text-dark-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-sm text-dark-100 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-dark-900">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t} className="bg-dark-900 capitalize">{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading notifications..." />
      ) : error && notifications.length === 0 ? (
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bell size={28} />}
            title="No notifications found"
            description="Create a new notification to send"
            action={
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus size={18} /> New Notification
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => {
            const ChannelIcon = channelIcon[notif.channel] || Bell;
            return (
              <div
                key={notif.id}
                className={`card p-4 hover:border-dark-700 transition-all duration-300 ${
                  !notif.is_read ? 'border-primary-500/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      notif.is_published ? 'bg-success-500/15' : 'bg-dark-800'
                    }`}>
                      <ChannelIcon size={18} className={notif.is_published ? 'text-success-400' : 'text-dark-400'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-dark-100">{notif.title}</h3>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-dark-300 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant={typeVariant(notif.type)} className="capitalize">{notif.type}</Badge>
                        <span className="text-xs text-dark-400 capitalize">{notif.channel.replace('_', ' ')}</span>
                        <span className="text-xs text-dark-400 capitalize">→ {notif.target_audience}</span>
                        <span className="text-xs text-dark-400 flex items-center gap-1">
                          <Clock size={10} /> {formatDate(notif.created_at)}
                        </span>
                        {notif.scheduled_for && !notif.is_published && (
                          <span className="text-xs text-accent-400 flex items-center gap-1">
                            <Clock size={10} /> Scheduled: {formatDateTime(notif.scheduled_for)}
                          </span>
                        )}
                        {notif.is_published && (
                          <span className="text-xs text-success-400 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Sent to {notif.sent_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!notif.is_published && (
                      <button
                        onClick={() => handlePublish(notif)}
                        className="p-2 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 transition-colors"
                        title="Publish now"
                      >
                        <Send size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleRead(notif)}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                      title={notif.is_read ? 'Mark unread' : 'Mark read'}
                    >
                      {notif.is_read ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => setDeleteId(notif.id)}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-error-500/20 text-dark-400 hover:text-error-400 transition-colors"
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Notification"
        description="Create and send a notification"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label-field">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="label-field">Message *</label>
            <textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="Notification message..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as NotificationType })}
                className="input-field cursor-pointer capitalize"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} className="bg-dark-900 capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as NotificationChannel })}
                className="input-field cursor-pointer capitalize"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c} className="bg-dark-900 capitalize">{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Target Audience</label>
              <select
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value as NotificationAudience })}
                className="input-field cursor-pointer capitalize"
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a} className="bg-dark-900 capitalize">{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Schedule for later (optional)</label>
            <input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
              className="input-field"
            />
            <p className="text-xs text-dark-400 mt-1">Leave empty to send immediately</p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creating...' : form.scheduled_for ? 'Schedule' : 'Send Now'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Notification"
        size="sm"
      >
        <p className="text-sm text-dark-300 mb-6">Are you sure you want to delete this notification?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
