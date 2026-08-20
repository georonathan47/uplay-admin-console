import { useCallback, useMemo, useState } from 'react';
import {
  Users,
  Search,
  BadgeCheck,
  Ban,
  CircleCheckBig,
  Mail,
  Phone,
  Shield,
  UserPlus,
  Copy,
  Check,
  TriangleAlert,
  Send,
} from 'lucide-react';
import { fetchPeople, invitePerson, setSuspended, setVerified } from '@/lib/api/profiles';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDate, humanise } from '@/lib/format';
import type { InviteResult, NewPersonInput, Person, PersonStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const STATUS_VARIANT: Record<PersonStatus, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'error',
};

export function PeoplePage() {
  const fetcher = useCallback(() => fetchPeople(), []);
  const { data, loading, error, refetch } = useLiveQuery(fetcher, ['profiles']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const people = useMemo(() => data ?? [], [data]);

  // Built from the data rather than hard-coded: UPlay adds user types over time,
  // and a stale hard-coded list would silently hide people.
  const userTypes = useMemo(
    () => [...new Set(people.map((p) => p.userType).filter((t): t is string => !!t))].sort(),
    [people]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return people.filter((person) => {
      const matchesSearch =
        !term ||
        person.name.toLowerCase().includes(term) ||
        person.email.toLowerCase().includes(term) ||
        (person.sport?.toLowerCase().includes(term) ?? false);
      const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
      const matchesType = typeFilter === 'all' || person.userType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [people, search, statusFilter, typeFilter]);

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState label="Loading people..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="People"
        description={`${people.length} ${people.length === 1 ? 'person' : 'people'} on the platform`}
        actions={
          <button onClick={() => setInviting(true)} className="btn-primary">
            <UserPlus size={16} /> Invite person
          </button>
        }
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
            placeholder="Search by name, email or sport"
            className="input-field pl-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-44"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field sm:w-44"
        >
          <option value="all">All types</option>
          {userTypes.map((type) => (
            <option key={type} value={type}>
              {humanise(type)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No people match"
          description={
            people.length === 0
              ? 'No profiles exist in this project yet.'
              : 'Try clearing the search or filters.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              busy={busyId === person.id}
              onToggleVerified={() =>
                runAction(person.id, () => setVerified(person.id, !person.isVerified))
              }
              onToggleSuspended={() =>
                runAction(person.id, () => setSuspended(person.id, person.status !== 'suspended'))
              }
            />
          ))}
        </div>
      )}

      {inviting && <InvitePersonModal onClose={() => setInviting(false)} onInvited={refetch} />}
    </div>
  );
}

/**
 * `athlete` is deliberately absent. A BEFORE INSERT trigger on `profiles`
 * (`validate_athlete_registration`) rejects an athlete unless an organization has
 * already invited that address, and the console has no organizations view — so
 * offering it here would only ever produce an error.
 */
const USER_TYPE_OPTIONS = [
  { value: 'coach_scout', label: 'Coach / Scout' },
  { value: 'org_admin', label: 'Organization admin' },
];

const EMPTY_INVITE: NewPersonInput = {
  email: '',
  first_name: null,
  last_name: null,
  user_type: 'coach_scout',
  sport: null,
  gender: null,
  phone: null,
  // Matches the column default on profiles.country_code.
  country_code: '+233',
};

interface InvitePersonModalProps {
  onClose: () => void;
  onInvited: () => void;
}

function InvitePersonModal({ onClose, onInvited }: InvitePersonModalProps) {
  const [form, setForm] = useState<NewPersonInput>(EMPTY_INVITE);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  /** Every optional field stores null rather than '' so nothing blank is written. */
  function set(field: keyof NewPersonInput, value: string) {
    setForm((current) => ({ ...current, [field]: value || null }));
  }

  async function handleSubmit() {
    setSending(true);
    setError(null);
    try {
      setResult(await invitePerson(form));
      // The row already exists at this point, so the list can be refreshed while
      // the admin is still reading the result.
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the invite');
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <Modal open onClose={onClose} title="Invite sent" description={result.email} size="md">
        <InviteOutcome result={result} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite person"
      description="They receive an email invitation and set their own password."
      size="lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        {error && (
          <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="label-field" htmlFor="invite-email">Email address</label>
          <input
            id="invite-email"
            type="email"
            required
            autoFocus
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@example.com"
            className="input-field"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field" htmlFor="invite-first">First name</label>
            <input
              id="invite-first"
              value={form.first_name ?? ''}
              onChange={(e) => set('first_name', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="invite-last">Last name</label>
            <input
              id="invite-last"
              value={form.last_name ?? ''}
              onChange={(e) => set('last_name', e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label-field" htmlFor="invite-type">Account type</label>
          <select
            id="invite-type"
            value={form.user_type ?? ''}
            onChange={(e) => set('user_type', e.target.value)}
            className="input-field"
          >
            {USER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-dark-500 mt-1.5">
            Athletes can't be invited here — they join through an organization's invitation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field" htmlFor="invite-sport">Sport</label>
            <input
              id="invite-sport"
              value={form.sport ?? ''}
              onChange={(e) => set('sport', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="invite-gender">Gender</label>
            <select
              id="invite-gender"
              value={form.gender ?? ''}
              onChange={(e) => set('gender', e.target.value)}
              className="input-field"
            >
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label-field" htmlFor="invite-country">Country code</label>
            <input
              id="invite-country"
              value={form.country_code ?? ''}
              onChange={(e) => set('country_code', e.target.value)}
              placeholder="+233"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field" htmlFor="invite-phone">Phone</label>
            <input
              id="invite-phone"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={sending} className="btn-primary disabled:opacity-50">
            <Send size={15} />
            {sending ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * The account exists either way. What differs is whether the person can be
 * reached — if the mail didn't go out, the link has to be handed over manually,
 * so it is shown rather than hidden behind a retry.
 */
function InviteOutcome({ result, onClose }: { result: InviteResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!result.actionLink) return;
    await navigator.clipboard.writeText(result.actionLink);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      {result.invited ? (
        <p className="text-sm text-dark-200">
          The account is created and an invitation email is on its way. They'll set their own
          password from the link in it.
        </p>
      ) : (
        <>
          <div className="p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 text-warning-300 text-sm flex gap-2.5">
            <TriangleAlert size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              The account was created, but the invitation email could not be sent. Send them this
              link yourself — it lets them set a password.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input readOnly value={result.actionLink ?? ''} className="input-field font-mono text-xs" />
            <button onClick={copyLink} className="btn-secondary flex-shrink-0">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </>
      )}

      {result.reason && <p className="text-xs text-dark-500">Details: {result.reason}</p>}

      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-primary">
          Done
        </button>
      </div>
    </div>
  );
}

interface PersonRowProps {
  person: Person;
  busy: boolean;
  onToggleVerified: () => void;
  onToggleSuspended: () => void;
}

function PersonRow({ person, busy, onToggleVerified, onToggleSuspended }: PersonRowProps) {
  const suspended = person.status === 'suspended';

  return (
    <div className="card p-4 hover:border-dark-700 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar name={person.name} url={person.avatarUrl} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-dark-100 truncate">{person.name}</p>
              {person.isVerified && <BadgeCheck size={16} className="text-primary-400" />}
              {person.isAdmin && (
                <Badge variant="primary">
                  <Shield size={11} /> Admin
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-dark-400 flex-wrap">
              <span className="flex items-center gap-1 truncate">
                <Mail size={12} /> {person.email}
              </span>
              {person.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {person.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANT[person.status]}>{humanise(person.status)}</Badge>
          {person.userType && <Badge variant="secondary">{humanise(person.userType)}</Badge>}
          {person.sport && <Badge variant="neutral">{person.sport}</Badge>}
          {person.ratingTier && <Badge variant="accent">{humanise(person.ratingTier)}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-500 hidden xl:inline whitespace-nowrap">
            Joined {formatDate(person.joinedAt)}
          </span>
          <button
            onClick={onToggleVerified}
            disabled={busy}
            className="btn-ghost text-xs disabled:opacity-40"
            title={person.isVerified ? 'Remove verification' : 'Mark as verified'}
          >
            <CircleCheckBig size={15} />
            {person.isVerified ? 'Unverify' : 'Verify'}
          </button>
          <button
            onClick={onToggleSuspended}
            disabled={busy}
            className={`btn-ghost text-xs disabled:opacity-40 ${
              suspended ? 'text-success-400 hover:text-success-300' : 'text-error-400 hover:text-error-300'
            }`}
            title={suspended ? 'Lift suspension' : 'Suspend this account'}
          >
            <Ban size={15} />
            {suspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </div>
      </div>
    </div>
  );
}
