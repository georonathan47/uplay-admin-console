import { useCallback } from 'react';
import {
  Users,
  Network,
  CalendarDays,
  Ticket,
  BadgeCheck,
  Bell,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { fetchOverview } from '@/lib/api/overview';
import { issueTypeLabel, statusLabel } from '@/lib/api/support';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { formatDate, formatRelative, humanise } from '@/lib/format';
import type { PageId } from '@/components/layout/Sidebar';
import type { PersonStatus, SupportStatus } from '@/lib/types';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

const PERSON_STATUS_VARIANT: Record<PersonStatus, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'error',
};

const SUPPORT_STATUS_VARIANT: Record<SupportStatus, 'primary' | 'warning' | 'success' | 'neutral'> = {
  new: 'primary',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
}

/** Watches every table the dashboard aggregates, so counts stay live. */
const WATCHED_TABLES = ['profiles', 'events', 'connections', 'notifications', 'support_requests'];

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const fetcher = useCallback(() => fetchOverview(), []);
  const { data, loading, error, refetch } = useLiveQuery(fetcher, WATCHED_TABLES);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const { stats, recentPeople, upcomingEvents, recentRequests, sportDistribution } = data;
  const distributionTotal = sportDistribution.reduce((sum, row) => sum + row.count, 0) || 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Overview</h1>
        <p className="text-dark-400 text-sm mt-1">
          Live view of the UPlay platform — updates as the data changes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-6">
        <StatCard label="People" value={stats.totalPeople} icon={<Users size={22} />} />
        <StatCard
          label="Verified"
          value={stats.verifiedPeople}
          icon={<BadgeCheck size={22} />}
          color="secondary"
        />
        <StatCard
          label="Accepted connections"
          value={stats.acceptedConnections}
          icon={<Network size={22} />}
          color="accent"
        />
        <StatCard
          label="Upcoming events"
          value={stats.upcomingEvents}
          icon={<CalendarDays size={22} />}
        />
        <StatCard
          label="Open support"
          value={stats.openSupportRequests}
          icon={<Ticket size={22} />}
          color="warning"
        />
        <StatCard
          label="Unread activity"
          value={stats.unreadActivity}
          icon={<Bell size={22} />}
          color="error"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Newest people" onSeeAll={() => onNavigate('people')}>
          {recentPeople.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="No profiles yet" />
          ) : (
            <ul className="space-y-3">
              {recentPeople.map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <Avatar name={person.name} url={person.avatarUrl} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate">{person.name}</p>
                    <p className="text-xs text-dark-400 truncate">
                      {person.userType ? humanise(person.userType) : 'No type'}
                      {person.sport && ` · ${person.sport}`}
                    </p>
                  </div>
                  <Badge variant={PERSON_STATUS_VARIANT[person.status]}>
                    {humanise(person.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming events" onSeeAll={() => onNavigate('events')}>
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={<CalendarDays size={24} />} title="Nothing scheduled" />
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex flex-col items-center justify-center flex-shrink-0">
                    <CalendarDays size={16} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-100 truncate">{event.title}</p>
                    <p className="text-xs text-dark-400 truncate flex items-center gap-1">
                      {formatDate(event.startDate)}
                      {event.location && (
                        <>
                          <MapPin size={11} className="ml-1" /> {event.location}
                        </>
                      )}
                    </p>
                  </div>
                  {event.capacity !== null && (
                    <span className="text-xs text-dark-500 whitespace-nowrap">
                      Max {event.capacity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Latest support requests" onSeeAll={() => onNavigate('support')}>
          {recentRequests.length === 0 ? (
            <EmptyState icon={<Ticket size={24} />} title="No support requests" />
          ) : (
            <ul className="space-y-3">
              {recentRequests.map((request) => (
                <li key={request.id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-100 truncate">{request.description}</p>
                    <p className="text-xs text-dark-400 mt-0.5">
                      {issueTypeLabel(request.issueType)} · {formatRelative(request.createdAt)}
                    </p>
                  </div>
                  <Badge variant={SUPPORT_STATUS_VARIANT[request.status]}>
                    {statusLabel(request.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Sports">
          {sportDistribution.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="No sports recorded" />
          ) : (
            <ul className="space-y-3">
              {sportDistribution.map((row) => (
                <li key={row.sport}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-dark-200">{row.sport}</span>
                    <span className="text-dark-400 text-xs">{row.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
                      style={{ width: `${(row.count / distributionTotal) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

interface PanelProps {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

function Panel({ title, onSeeAll, children }: PanelProps) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-dark-100">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="btn-ghost text-xs">
            See all <ArrowRight size={14} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
