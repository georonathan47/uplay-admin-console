import { useCallback, useMemo, useState } from 'react';
import { Network, Search, ArrowRight, Info } from 'lucide-react';
import { fetchConnections } from '@/lib/api/connections';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDate, humanise } from '@/lib/format';
import type { ConnectionStatus, PersonRef } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const STATUS_VARIANT: Record<ConnectionStatus, 'success' | 'warning' | 'error'> = {
  accepted: 'success',
  pending: 'warning',
  declined: 'error',
};

export function ConnectionsPage() {
  const fetcher = useCallback(() => fetchConnections(), []);
  const { data, loading, error, refetch } = useLiveQuery(fetcher, ['connections']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const connections = useMemo(() => data ?? [], [data]);

  const stats = useMemo(
    () => ({
      total: connections.length,
      accepted: connections.filter((c) => c.status === 'accepted').length,
      pending: connections.filter((c) => c.status === 'pending').length,
    }),
    [connections]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return connections.filter((connection) => {
      const names = [connection.requester?.name, connection.addressee?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !term || names.includes(term);
      const matchesStatus = statusFilter === 'all' || connection.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [connections, search, statusFilter]);

  if (loading) return <LoadingState label="Loading connections..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="Connections" description="Who is connected to whom across the platform" />

      {/*
        Read-only on purpose: the live policies let only the addressee change a
        connection's status and only a participant remove one. An admin has no
        write path here, and fabricating someone else's social graph would be
        the wrong capability to build anyway.
      */}
      <div className="card p-3 mb-6 flex items-start gap-2.5 text-xs text-dark-400">
        <Info size={15} className="text-dark-500 flex-shrink-0 mt-0.5" />
        <span>
          Connections are managed by the people involved — this view is read-only.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total" value={stats.total} icon={<Network size={22} />} />
        <StatCard label="Accepted" value={stats.accepted} icon={<Network size={22} />} color="secondary" />
        <StatCard label="Pending" value={stats.pending} icon={<Network size={22} />} color="warning" />
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by person"
            className="input-field pl-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-44"
        >
          <option value="all">All statuses</option>
          <option value="accepted">Accepted</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Network size={28} />}
          title="No connections match"
          description={
            connections.length === 0
              ? 'No connections exist in this project yet.'
              : 'Try clearing the search or filters.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((connection) => (
            <div key={connection.id} className="card p-4 hover:border-dark-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <PersonChip person={connection.requester} />
                  <ArrowRight size={16} className="text-dark-500 flex-shrink-0" />
                  <PersonChip person={connection.addressee} />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant={STATUS_VARIANT[connection.status]}>
                    {humanise(connection.status)}
                  </Badge>
                  <span className="text-xs text-dark-500 whitespace-nowrap">
                    {formatDate(connection.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A profile row can be missing if the referenced person was deleted. */
function PersonChip({ person }: { person: PersonRef | null }) {
  if (!person) {
    return <span className="text-sm text-dark-500 italic flex-1">Unknown person</span>;
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <Avatar name={person.name} url={person.avatarUrl} size={34} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-dark-100 truncate">{person.name}</p>
        {person.userType && (
          <p className="text-xs text-dark-400 truncate">{humanise(person.userType)}</p>
        )}
      </div>
    </div>
  );
}
