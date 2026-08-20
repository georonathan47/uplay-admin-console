import { useCallback, useMemo, useState } from 'react';
import { Ticket, Search, Mail, Clock } from 'lucide-react';
import {
  ISSUE_TYPES,
  SUPPORT_STATUSES,
  fetchSupportRequests,
  issueTypeLabel,
  statusLabel,
  updateSupportStatus,
} from '@/lib/api/support';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { SupportRequestItem, SupportStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const STATUS_VARIANT: Record<SupportStatus, 'primary' | 'warning' | 'success' | 'neutral'> = {
  new: 'primary',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

export function SupportPage() {
  const fetcher = useCallback(() => fetchSupportRequests(), []);
  const { data, loading, error, refetch } = useLiveQuery(fetcher, ['support_requests']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requests = useMemo(() => data ?? [], [data]);

  const stats = useMemo(
    () => ({
      open: requests.filter((r) => r.status === 'new' || r.status === 'in_progress').length,
      resolved: requests.filter((r) => r.status === 'resolved').length,
      total: requests.length,
    }),
    [requests]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch =
        !term ||
        request.description.toLowerCase().includes(term) ||
        request.email.toLowerCase().includes(term) ||
        (request.submitter?.name.toLowerCase().includes(term) ?? false);
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.issueType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, search, statusFilter, typeFilter]);

  async function handleStatusChange(request: SupportRequestItem, status: SupportStatus) {
    setBusyId(request.id);
    setActionError(null);
    try {
      await updateSupportStatus(request.id, status);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState label="Loading support requests..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Support"
        description="Requests raised by people using the UPlay app"
      />

      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300 text-sm">
          {actionError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Open" value={stats.open} icon={<Ticket size={22} />} color="warning" />
        <StatCard label="Resolved" value={stats.resolved} icon={<Ticket size={22} />} color="primary" />
        <StatCard label="Total" value={stats.total} icon={<Ticket size={22} />} color="secondary" />
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, email or person"
            className="input-field pl-11"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field sm:w-40"
        >
          <option value="all">All statuses</option>
          {SUPPORT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field sm:w-40"
        >
          <option value="all">All types</option>
          {ISSUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {issueTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Ticket size={28} />}
          title="No support requests match"
          description={
            requests.length === 0
              ? 'Nobody has raised a support request yet.'
              : 'Try clearing the search or filters.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => (
            <article key={request.id} className="card p-5 hover:border-dark-700 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant={STATUS_VARIANT[request.status]}>
                      {statusLabel(request.status)}
                    </Badge>
                    <Badge variant="secondary">{issueTypeLabel(request.issueType)}</Badge>
                    <span className="text-xs text-dark-500 flex items-center gap-1">
                      <Clock size={12} /> {formatRelative(request.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-dark-200 whitespace-pre-wrap break-words">
                    {request.description}
                  </p>

                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-dark-800">
                    {request.submitter ? (
                      <>
                        <Avatar
                          name={request.submitter.name}
                          url={request.submitter.avatarUrl}
                          size={30}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-dark-200 truncate">
                            {request.submitter.name}
                          </p>
                          <p className="text-xs text-dark-500 truncate flex items-center gap-1">
                            <Mail size={11} /> {request.email}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-dark-500 flex items-center gap-1">
                        <Mail size={11} /> {request.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 lg:w-44">
                  <label className="label-field" htmlFor={`status-${request.id}`}>
                    Status
                  </label>
                  <select
                    id={`status-${request.id}`}
                    value={request.status}
                    disabled={busyId === request.id}
                    onChange={(e) => handleStatusChange(request, e.target.value as SupportStatus)}
                    className="input-field disabled:opacity-50"
                  >
                    {SUPPORT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-dark-500 mt-2">
                    Updated {formatDateTime(request.updatedAt)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
