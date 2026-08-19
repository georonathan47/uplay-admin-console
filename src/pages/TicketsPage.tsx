import { useCallback, useEffect, useState } from 'react';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  Trash2,
  Filter,
  MessageSquare,
  Send,
  Clock,
  User,
  Mail,
  Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  type Ticket,
  type TicketInsert,
  type TicketUpdate,
  type TicketMessage,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const CATEGORIES: TicketCategory[] = ['general', 'technical', 'billing', 'account', 'event', 'feature_request'];
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

const priorityVariant = (p: string): 'neutral' | 'primary' | 'warning' | 'error' => {
  const map: Record<string, 'neutral' | 'primary' | 'warning' | 'error'> = {
    low: 'neutral',
    medium: 'primary',
    high: 'warning',
    urgent: 'error',
  };
  return map[p] || 'neutral';
};

const statusVariant = (s: string): 'warning' | 'primary' | 'success' | 'neutral' => {
  const map: Record<string, 'warning' | 'primary' | 'success' | 'neutral'> = {
    open: 'warning',
    in_progress: 'primary',
    resolved: 'success',
    closed: 'neutral',
  };
  return map[s] || 'neutral';
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<TicketInsert>({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'open',
    submitted_by: '',
    submitter_email: '',
    assigned_to: '',
    tags: [],
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setTickets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.submitted_by?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    loadMessages(ticket.id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error: err } = await supabase.from('tickets').insert(form);
      if (err) throw err;
      setCreateOpen(false);
      setForm({
        subject: '', description: '', category: 'general', priority: 'medium',
        status: 'open', submitted_by: '', submitter_email: '', assigned_to: '', tags: [],
      });
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (ticket: Ticket, field: keyof Ticket, value: string) => {
    const update: TicketUpdate = { [field]: value, updated_at: new Date().toISOString() } as TicketUpdate;
    if (value === 'resolved' || value === 'closed') {
      update.resolved_at = new Date().toISOString();
    }
    try {
      const { error: err } = await supabase.from('tickets').update(update).eq('id', ticket.id);
      if (err) throw err;
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...ticket, ...update } as Ticket);
      }
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    setMsgLoading(true);
    try {
      const { error: err } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        author: 'Support Agent',
        message: newMessage.trim(),
        is_internal: false,
      });
      if (err) throw err;
      setNewMessage('');
      await loadMessages(selectedTicket.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('tickets').delete().eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    urgent: tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed').length,
    resolved: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
  };

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description={`${stats.total} tickets · ${stats.open} open · ${stats.urgent} urgent`}
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={18} /> New Ticket
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
          <p className="text-xs text-dark-400">Open</p>
          <p className="text-2xl font-display font-bold text-warning-400 mt-1">{stats.open}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-dark-400">Urgent</p>
          <p className="text-2xl font-display font-bold text-error-400 mt-1">{stats.urgent}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-dark-400">Resolved</p>
          <p className="text-2xl font-display font-bold text-success-400 mt-1">{stats.resolved}</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Search size={18} className="text-dark-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-dark-100 placeholder-dark-400 focus:outline-none flex-1"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
              <Filter size={16} className="text-dark-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm text-dark-100 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-dark-900">All Status</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-dark-900 capitalize">{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-sm text-dark-100 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-dark-900">All Priority</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-dark-900 capitalize">{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading tickets..." />
      ) : error && tickets.length === 0 ? (
        <ErrorState message={error} onRetry={loadTickets} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<TicketIcon size={28} />}
            title="No tickets found"
            description="Create a new support ticket"
            action={
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus size={18} /> New Ticket
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-dark-800">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-dark-800/30 transition-colors cursor-pointer"
                onClick={() => openTicket(ticket)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center flex-shrink-0">
                      <TicketIcon size={18} className="text-dark-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-dark-100 truncate">{ticket.subject}</h3>
                      {ticket.description && (
                        <p className="text-xs text-dark-400 mt-1 line-clamp-1">{ticket.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-dark-400 capitalize">{ticket.category.replace('_', ' ')}</span>
                        {ticket.submitted_by && (
                          <span className="text-xs text-dark-400 flex items-center gap-1">
                            <User size={10} /> {ticket.submitted_by}
                          </span>
                        )}
                        <span className="text-xs text-dark-400 flex items-center gap-1">
                          <Clock size={10} /> {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                    <Badge variant={statusVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(ticket.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-error-500/20 text-dark-400 hover:text-error-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      <Modal
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject || ''}
        description={`Created ${selectedTicket ? formatDate(selectedTicket.created_at) : ''}`}
        size="xl"
      >
        {selectedTicket && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={priorityVariant(selectedTicket.priority)}>{selectedTicket.priority} priority</Badge>
              <Badge variant={statusVariant(selectedTicket.status)}>{selectedTicket.status.replace('_', ' ')}</Badge>
              <Badge variant="neutral" className="capitalize">{selectedTicket.category.replace('_', ' ')}</Badge>
            </div>

            {selectedTicket.description && (
              <div className="p-4 rounded-xl bg-dark-800/50">
                <p className="text-sm text-dark-200">{selectedTicket.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedTicket.submitted_by && (
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <User size={14} className="text-dark-500" />
                  <span>{selectedTicket.submitted_by}</span>
                </div>
              )}
              {selectedTicket.submitter_email && (
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Mail size={14} className="text-dark-500" />
                  <span>{selectedTicket.submitter_email}</span>
                </div>
              )}
              {selectedTicket.assigned_to && (
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Tag size={14} className="text-dark-500" />
                  <span>Assigned to: {selectedTicket.assigned_to}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-field">Status</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(selectedTicket, 'status', e.target.value)}
                  className="input-field cursor-pointer capitalize"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-dark-900 capitalize">{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Priority</label>
                <select
                  value={selectedTicket.priority}
                  onChange={(e) => handleUpdateStatus(selectedTicket, 'priority', e.target.value)}
                  className="input-field cursor-pointer capitalize"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-dark-900 capitalize">{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare size={16} className="text-primary-400" />
                Conversation ({messages.length})
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto p-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-dark-400 text-center py-4">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.author === 'Support Agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-xl ${
                          msg.author === 'Support Agent'
                            ? 'bg-primary-500/15 border border-primary-500/30'
                            : 'bg-dark-800 border border-dark-700'
                        }`}
                      >
                        <p className="text-xs text-dark-400 mb-1">{msg.author} · {formatTime(msg.created_at)}</p>
                        <p className="text-sm text-dark-100">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a reply..."
                  className="input-field flex-1"
                />
                <button type="submit" disabled={msgLoading || !newMessage.trim()} className="btn-primary disabled:opacity-50">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Ticket Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Support Ticket"
        description="Create a new support ticket"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label-field">Subject *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="input-field"
              placeholder="Brief description of the issue"
            />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="Detailed description..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
                className="input-field cursor-pointer capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-dark-900 capitalize">{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                className="input-field cursor-pointer capitalize"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-dark-900 capitalize">{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Submitted By</label>
              <input
                type="text"
                value={form.submitted_by}
                onChange={(e) => setForm({ ...form, submitted_by: e.target.value })}
                className="input-field"
                placeholder="User name"
              />
            </div>
            <div>
              <label className="label-field">Submitter Email</label>
              <input
                type="email"
                value={form.submitter_email}
                onChange={(e) => setForm({ ...form, submitter_email: e.target.value })}
                className="input-field"
                placeholder="user@email.com"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Ticket"
        size="sm"
      >
        <p className="text-sm text-dark-300 mb-6">Are you sure you want to delete this ticket and all its messages?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
