import { useCallback, useEffect, useState } from 'react';
import { LogOut, Save, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchPerson, updateOwnProfile } from '@/lib/api/profiles';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingState, ErrorState } from '@/components/ui/States';

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
  about_me: string;
}

const EMPTY_FORM: ProfileForm = {
  first_name: '',
  last_name: '',
  phone: '',
  avatar_url: '',
  about_me: '',
};

export function AccountPage() {
  const { user, signOut } = useAuth();
  const userId = user?.id;

  const fetcher = useCallback(
    () => (userId ? fetchPerson(userId) : Promise.resolve(null)),
    [userId]
  );
  const { data: person, loading, error, refetch } = useLiveQuery(fetcher, ['profiles']);

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seed the form once the profile arrives. Splitting the stored display name
  // back apart isn't possible, so first/last come from the row directly.
  useEffect(() => {
    if (!person) return;
    const [first = '', ...rest] = person.name.split(' ');
    setForm({
      first_name: first,
      last_name: rest.join(' '),
      phone: person.phone ?? '',
      avatar_url: person.avatarUrl ?? '',
      about_me: person.bio ?? '',
    });
  }, [person]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateOwnProfile(userId, {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        about_me: form.about_me.trim() || null,
      });
      setSaved(true);
      await refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading your profile..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Account"
        description="Your admin profile and this console's connection"
        actions={
          <button onClick={signOut} className="btn-secondary">
            <LogOut size={16} /> Sign out
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 card p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={person?.name ?? 'Admin'} url={form.avatar_url || person?.avatarUrl} size={56} />
            <div className="min-w-0">
              <p className="font-display font-semibold text-dark-100 truncate">
                {person?.name ?? 'Admin'}
              </p>
              <p className="text-sm text-dark-400 truncate">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field" htmlFor="first_name">First name</label>
                <input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field" htmlFor="last_name">Last name</label>
                <input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label-field" htmlFor="phone">Phone</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field" htmlFor="avatar_url">Avatar URL</label>
              <input
                id="avatar_url"
                type="url"
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://..."
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field" htmlFor="about_me">About</label>
              <textarea
                id="about_me"
                rows={3}
                value={form.about_me}
                onChange={(e) => setForm({ ...form, about_me: e.target.value })}
                className="input-field resize-none"
              />
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300 text-sm">
                {saveError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
              </button>
              {saved && !saving && (
                <span className="text-sm text-success-400 flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 size={15} /> Saved
                </span>
              )}
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display font-semibold text-dark-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-400" /> Access
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Role">
                <Badge variant="primary">UPlay admin</Badge>
              </Row>
              <Row label="Verified">
                <Badge variant={person?.isVerified ? 'success' : 'neutral'}>
                  {person?.isVerified ? 'Yes' : 'No'}
                </Badge>
              </Row>
              <Row label="Joined">
                <span className="text-dark-300">{formatDate(person?.joinedAt ?? null)}</span>
              </Row>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display font-semibold text-dark-100 flex items-center gap-2">
              <Database size={18} className="text-secondary-400" /> Connection
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              {/* <Row label="Project">
                <span className="text-dark-300 font-mono text-xs break-all">
                  {import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0] ?? '—'}
                </span>
              </Row> */}
              <Row label="Access">
                <span className="text-dark-300">Row-Level Security</span>
              </Row>
              <Row label="Updates">
                <Badge variant="success">Live</Badge>
              </Row>
            </div>
            <p className="text-xs text-dark-500 mt-4 pt-4 border-t border-dark-800">
              Every query runs as your account. You see exactly what UPlay&apos;s policies allow an
              admin to see.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-dark-400">{label}</span>
      {children}
    </div>
  );
}
