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
} from 'lucide-react';
import { fetchPeople, setSuspended, setVerified } from '@/lib/api/profiles';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDate, humanise } from '@/lib/format';
import type { Person, PersonStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
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
