import { useCallback, useEffect, useState } from 'react';
import { Network, Plus, Search, Trash2, Link2, Users, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type Athlete, type Connection, type ConnectionType, type ConnectionStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const CONNECTION_TYPES: ConnectionType[] = ['friend', 'teammate', 'coach', 'scout', 'mentor', 'rival'];
const CONNECTION_STATUSES: ConnectionStatus[] = ['pending', 'accepted', 'blocked', 'declined'];

const statusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
  const map: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    accepted: 'success',
    pending: 'warning',
    blocked: 'error',
    declined: 'neutral',
  };
  return map[status] || 'neutral';
};

const typeColor: Record<string, string> = {
  friend: 'text-secondary-400',
  teammate: 'text-primary-400',
  coach: 'text-accent-400',
  scout: 'text-warning-400',
  mentor: 'text-secondary-300',
  rival: 'text-error-400',
};

export function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    athlete_id_a: '',
    athlete_id_b: '',
    connection_type: 'teammate' as ConnectionType,
    status: 'accepted' as ConnectionStatus,
  });

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connRes, athRes] = await Promise.all([
        supabase.from('connections').select('*').order('created_at', { ascending: false }),
        supabase.from('athletes').select('*').order('name', { ascending: true }),
      ]);
      if (connRes.error) throw connRes.error;
      if (athRes.error) throw athRes.error;

      const athleteMap = new Map((athRes.data || []).map((a) => [a.id, a]));
      const enriched = (connRes.data || []).map((c) => ({
        ...c,
        athlete_a: athleteMap.get(c.athlete_id_a),
        athlete_b: athleteMap.get(c.athlete_id_b),
      }));
      setConnections(enriched);
      setAthletes(athRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const filtered = connections.filter((c) => {
    const nameA = c.athlete_a?.name?.toLowerCase() || '';
    const nameB = c.athlete_b?.name?.toLowerCase() || '';
    const matchesSearch = nameA.includes(search.toLowerCase()) || nameB.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.connection_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.athlete_id_a === form.athlete_id_b) {
      setError('An athlete cannot connect with themselves');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await supabase.from('connections').insert({
        athlete_id_a: form.athlete_id_a,
        athlete_id_b: form.athlete_id_b,
        connection_type: form.connection_type,
        status: form.status,
      });
      if (err) throw err;
      setModalOpen(false);
      setForm({ athlete_id_a: '', athlete_id_b: '', connection_type: 'teammate', status: 'accepted' });
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (conn: Connection, newStatus: ConnectionStatus) => {
    try {
      const { error: err } = await supabase
        .from('connections')
        .update({ status: newStatus })
        .eq('id', conn.id);
      if (err) throw err;
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('connections').delete().eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null);
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection');
    }
  };

  const stats = {
    total: connections.length,
    accepted: connections.filter((c) => c.status === 'accepted').length,
    pending: connections.filter((c) => c.status === 'pending').length,
  };

  return (
    <div>
      <PageHeader
        title="Connections"
        description={`${stats.total} connections · ${stats.accepted} active · ${stats.pending} pending`}
        actions={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={18} /> New Connection
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-error-500/10 border border-error-500/30 flex items-center justify-between">
          <p className="text-sm text-error-300">{error}</p>
          <button onClick={() => setError(null)} className="text-error-400 hover:text-error-300 text-sm">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <Network size={20} className="text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">{stats.total}</p>
              <p className="text-sm text-dark-400">Total Connections</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-500/15 flex items-center justify-center">
              <Link2 size={20} className="text-success-400" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">{stats.accepted}</p>
              <p className="text-sm text-dark-400">Active Links</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-500/15 flex items-center justify-center">
              <Users size={20} className="text-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">{stats.pending}</p>
              <p className="text-sm text-dark-400">Pending Requests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Search size={18} className="text-dark-400" />
            <input
              type="text"
              placeholder="Search by athlete name..."
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
                {CONNECTION_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-sm text-dark-100 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-dark-900">All Types</option>
                {CONNECTION_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-dark-900 capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading connections..." />
      ) : error && connections.length === 0 ? (
        <ErrorState message={error} onRetry={loadConnections} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Network size={28} />}
            title="No connections found"
            description="Create a new connection between athletes"
            action={
              <button onClick={() => setModalOpen(true)} className="btn-primary">
                <Plus size={18} /> New Connection
              </button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-dark-800">
            {filtered.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between p-4 hover:bg-dark-800/30 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
                      {conn.athlete_a?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <Link2 size={16} className={typeColor[conn.connection_type] || 'text-dark-400'} />
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-700 flex items-center justify-center text-white font-semibold text-sm">
                      {conn.athlete_b?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark-100 truncate">
                      {conn.athlete_a?.name || 'Unknown'} <span className="text-dark-400">↔</span> {conn.athlete_b?.name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs capitalize ${typeColor[conn.connection_type] || 'text-dark-400'}`}>
                        {conn.connection_type}
                      </span>
                      <span className="text-dark-600">·</span>
                      <span className="text-xs text-dark-400">
                        {new Date(conn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={conn.status}
                    onChange={(e) => handleStatusChange(conn, e.target.value as ConnectionStatus)}
                    className="bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-dark-100 focus:outline-none focus:ring-1 focus:ring-primary-500/50 cursor-pointer"
                  >
                    {CONNECTION_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
                    ))}
                  </select>
                  <Badge variant={statusVariant(conn.status)}>{conn.status}</Badge>
                  <button
                    onClick={() => setDeleteId(conn.id)}
                    className="p-2 rounded-lg hover:bg-error-500/20 text-dark-400 hover:text-error-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Connection"
        description="Link two athletes together"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label-field">Athlete A *</label>
            <select
              required
              value={form.athlete_id_a}
              onChange={(e) => setForm({ ...form, athlete_id_a: e.target.value })}
              className="input-field cursor-pointer"
            >
              <option value="" className="bg-dark-900">Select athlete...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id} className="bg-dark-900">{a.name} ({a.sport})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Athlete B *</label>
            <select
              required
              value={form.athlete_id_b}
              onChange={(e) => setForm({ ...form, athlete_id_b: e.target.value })}
              className="input-field cursor-pointer"
            >
              <option value="" className="bg-dark-900">Select athlete...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id} className="bg-dark-900">{a.name} ({a.sport})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Connection Type</label>
              <select
                value={form.connection_type}
                onChange={(e) => setForm({ ...form, connection_type: e.target.value as ConnectionType })}
                className="input-field cursor-pointer capitalize"
              >
                {CONNECTION_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-dark-900 capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ConnectionStatus })}
                className="input-field cursor-pointer capitalize"
              >
                {CONNECTION_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Connection'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Connection"
        size="sm"
      >
        <p className="text-sm text-dark-300 mb-6">Are you sure you want to remove this connection?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
