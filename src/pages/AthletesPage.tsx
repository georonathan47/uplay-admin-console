import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Mail,
  Phone,
  MapPin,
  Filter,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type Athlete, type AthleteInsert, type AthleteUpdate, type AthleteStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const SPORTS = ['Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'Volleyball', 'Boxing', 'Rugby', 'Hockey', 'General'];
const STATUSES: AthleteStatus[] = ['active', 'inactive', 'suspended', 'pending'];

const statusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
  const map: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    pending: 'warning',
    suspended: 'error',
    inactive: 'neutral',
  };
  return map[status] || 'neutral';
};

export function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('athletes')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAthletes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load athletes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  const filtered = athletes.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.sport.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSport = sportFilter === 'all' || a.sport === sportFilter;
    return matchesSearch && matchesStatus && matchesSport;
  });

  const openCreate = () => {
    setEditingAthlete(null);
    setModalOpen(true);
  };

  const openEdit = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setModalOpen(true);
  };

  const handleSave = async (formData: AthleteInsert | AthleteUpdate) => {
    setSaving(true);
    try {
      if (editingAthlete) {
        const { error: err } = await supabase
          .from('athletes')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingAthlete.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('athletes').insert(formData as AthleteInsert);
        if (err) throw err;
      }
      setModalOpen(false);
      await loadAthletes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save athlete');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase.from('athletes').delete().eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null);
      await loadAthletes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete athlete');
    }
  };

  const handleStatusChange = async (athlete: Athlete, newStatus: AthleteStatus) => {
    try {
      const { error: err } = await supabase
        .from('athletes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', athlete.id);
      if (err) throw err;
      await loadAthletes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div>
      <PageHeader
        title="Athletes"
        description={`${athletes.length} athletes on the platform`}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <UserPlus size={18} /> Add Athlete
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

      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
            <Search size={18} className="text-dark-400" />
            <input
              type="text"
              placeholder="Search by name, email, or sport..."
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
                  <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="bg-transparent text-sm text-dark-100 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-dark-900">All Sports</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s} className="bg-dark-900">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading athletes..." />
      ) : error && athletes.length === 0 ? (
        <ErrorState message={error} onRetry={loadAthletes} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users size={28} />}
            title="No athletes found"
            description="Try adjusting your filters or add a new athlete"
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus size={18} /> Add Athlete
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((athlete) => (
            <div
              key={athlete.id}
              className="card p-5 hover:border-dark-700 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-lg">
                    {athlete.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{athlete.name}</h3>
                    <p className="text-sm text-dark-400">{athlete.sport}{athlete.position ? ` · ${athlete.position}` : ''}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(athlete.status)}>{athlete.status}</Badge>
              </div>

              <div className="space-y-2 mb-4">
                {athlete.email && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <Mail size={14} className="text-dark-500" />
                    <span className="truncate">{athlete.email}</span>
                  </div>
                )}
                {athlete.phone && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <Phone size={14} className="text-dark-500" />
                    <span>{athlete.phone}</span>
                  </div>
                )}
                {athlete.country && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <MapPin size={14} className="text-dark-500" />
                    <span>{athlete.country}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-accent-400 fill-accent-400" />
                  <span className="text-dark-200 font-medium">{athlete.rating.toFixed(1)}</span>
                </div>
                <div className="text-dark-400">
                  <span className="text-dark-200 font-medium">{athlete.connections_count}</span> connections
                </div>
                <div className="text-dark-400">
                  <span className="text-dark-200 font-medium">{athlete.events_count}</span> events
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-dark-800">
                <select
                  value={athlete.status}
                  onChange={(e) => handleStatusChange(athlete, e.target.value as AthleteStatus)}
                  className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-dark-100 focus:outline-none focus:ring-1 focus:ring-primary-500/50 cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => openEdit(athlete)}
                  className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-primary-400 transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteId(athlete.id)}
                  className="p-2 rounded-lg bg-dark-800 hover:bg-error-500/20 text-dark-300 hover:text-error-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AthleteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        athlete={editingAthlete}
        onSave={handleSave}
        saving={saving}
      />

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Athlete"
        description="This action cannot be undone."
        size="sm"
      >
        <p className="text-sm text-dark-300 mb-6">
          Are you sure you want to delete this athlete? All their connections and event registrations will also be removed.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

interface AthleteFormModalProps {
  open: boolean;
  onClose: () => void;
  athlete: Athlete | null;
  onSave: (data: AthleteInsert | AthleteUpdate) => void;
  saving: boolean;
}

function AthleteFormModal({ open, onClose, athlete, onSave, saving }: AthleteFormModalProps) {
  const [form, setForm] = useState<AthleteInsert>({
    name: '',
    email: '',
    phone: '',
    sport: 'General',
    position: '',
    country: '',
    avatar_url: '',
    status: 'active',
    rating: 0,
    bio: '',
  });

  useEffect(() => {
    if (athlete) {
      setForm({
        name: athlete.name,
        email: athlete.email || '',
        phone: athlete.phone || '',
        sport: athlete.sport,
        position: athlete.position || '',
        country: athlete.country || '',
        avatar_url: athlete.avatar_url || '',
        status: athlete.status,
        rating: athlete.rating,
        bio: athlete.bio || '',
      });
    } else {
      setForm({
        name: '',
        email: '',
        phone: '',
        sport: 'General',
        position: '',
        country: '',
        avatar_url: '',
        status: 'active',
        rating: 0,
        bio: '',
      });
    }
  }, [athlete, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={athlete ? 'Edit Athlete' : 'Add New Athlete'}
      description={athlete ? 'Update athlete information' : 'Create a new athlete profile'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="John Doe"
            />
          </div>
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
            <label className="label-field">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="john@youplay.com"
            />
          </div>
          <div>
            <label className="label-field">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="+1 234 567 890"
            />
          </div>
          <div>
            <label className="label-field">Position</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="input-field"
              placeholder="Forward, Goalkeeper, etc."
            />
          </div>
          <div>
            <label className="label-field">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="input-field"
              placeholder="United Kingdom"
            />
          </div>
          <div>
            <label className="label-field">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AthleteStatus })}
              className="input-field cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-dark-900 capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Rating (0-5)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="label-field">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="input-field min-h-[80px] resize-y"
            placeholder="Brief biography..."
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : athlete ? 'Save Changes' : 'Create Athlete'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
