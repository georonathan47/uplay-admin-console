import { useEffect, useState } from 'react';
import {
  Users,
  Network,
  CalendarDays,
  Ticket,
  TrendingUp,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { type PageId } from '@/components/layout/Sidebar';

interface OverviewData {
  totalAthletes: number;
  activeAthletes: number;
  totalConnections: number;
  activeEvents: number;
  openTickets: number;
  unreadNotifications: number;
}

interface RecentAthlete {
  id: string;
  name: string;
  sport: string;
  status: string;
  joined_at: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  registered_count: number;
  capacity: number;
}

interface RecentTicket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  created_at: string;
}

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [recentAthletes, setRecentAthletes] = useState<RecentAthlete[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [sportDist, setSportDist] = useState<{ sport: string; count: number }[]>([]);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      const [
        athletesRes,
        activeAthletesRes,
        connectionsRes,
        eventsRes,
        ticketsRes,
        notifRes,
        recentAthletesRes,
        upcomingEventsRes,
        recentTicketsRes,
        sportDistRes,
      ] = await Promise.all([
        supabase.from('athletes').select('*', { count: 'exact', head: true }),
        supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
        supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['upcoming', 'ongoing']),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('athletes').select('id, name, sport, status, joined_at').order('joined_at', { ascending: false }).limit(5),
        supabase.from('events').select('id, title, start_date, location, registered_count, capacity').eq('status', 'upcoming').order('start_date', { ascending: true }).limit(4),
        supabase.from('tickets').select('id, subject, priority, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('athletes').select('sport'),
      ]);

      setData({
        totalAthletes: athletesRes.count || 0,
        activeAthletes: activeAthletesRes.count || 0,
        totalConnections: connectionsRes.count || 0,
        activeEvents: eventsRes.count || 0,
        openTickets: ticketsRes.count || 0,
        unreadNotifications: notifRes.count || 0,
      });

      setRecentAthletes(recentAthletesRes.data || []);
      setUpcomingEvents(upcomingEventsRes.data || []);
      setRecentTickets(recentTicketsRes.data || []);

      const sports = (sportDistRes.data || []).reduce<Record<string, number>>((acc, row) => {
        acc[row.sport] = (acc[row.sport] || 0) + 1;
        return acc;
      }, {});
      const dist = Object.entries(sports)
        .map(([sport, count]) => ({ sport, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setSportDist(dist);
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState label="Loading dashboard..." />;

  const totalForDist = sportDist.reduce((sum, s) => sum + s.count, 0) || 1;

  const statusVariant = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
      active: 'success',
      pending: 'warning',
      suspended: 'error',
      inactive: 'neutral',
    };
    return map[status] || 'neutral';
  };

  const priorityVariant = (priority: string) => {
    const map: Record<string, 'error' | 'warning' | 'primary' | 'neutral'> = {
      urgent: 'error',
      high: 'warning',
      medium: 'primary',
      low: 'neutral',
    };
    return map[priority] || 'neutral';
  };

  const ticketStatusVariant = (status: string) => {
    const map: Record<string, 'warning' | 'primary' | 'success' | 'neutral'> = {
      open: 'warning',
      in_progress: 'primary',
      resolved: 'success',
      closed: 'neutral',
    };
    return map[status] || 'neutral';
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Dashboard Overview</h1>
          <p className="text-dark-400 text-sm mt-1">Welcome back — here's what's happening on Youplay</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Athletes"
          value={data?.totalAthletes ?? 0}
          icon={<Users size={24} />}
          trend={{ value: 12, positive: true }}
          color="primary"
        />
        <StatCard
          label="Active Connections"
          value={data?.totalConnections ?? 0}
          icon={<Network size={24} />}
          trend={{ value: 8, positive: true }}
          color="secondary"
        />
        <StatCard
          label="Active Events"
          value={data?.activeEvents ?? 0}
          icon={<CalendarDays size={24} />}
          trend={{ value: 5, positive: true }}
          color="accent"
        />
        <StatCard
          label="Open Tickets"
          value={data?.openTickets ?? 0}
          icon={<Ticket size={24} />}
          trend={{ value: 3, positive: false }}
          color="error"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Athletes by Sport</h3>
              <p className="text-dark-400 text-sm">Distribution across categories</p>
            </div>
            <TrendingUp size={20} className="text-primary-400" />
          </div>
          {sportDist.length === 0 ? (
            <EmptyState icon={<Activity size={28} />} title="No athletes yet" description="Add athletes to see distribution" />
          ) : (
            <div className="space-y-4">
              {sportDist.map((item) => {
                const pct = Math.round((item.count / totalForDist) * 100);
                return (
                  <div key={item.sport}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-dark-200">{item.sport}</span>
                      <span className="text-sm text-dark-400">{item.count} athletes</span>
                    </div>
                    <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-white text-lg">Quick Stats</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-500/15 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-success-400" />
                </div>
                <span className="text-sm text-dark-200">Active Athletes</span>
              </div>
              <span className="text-lg font-bold text-white">{data?.activeAthletes ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning-500/15 flex items-center justify-center">
                  <AlertCircle size={18} className="text-warning-400" />
                </div>
                <span className="text-sm text-dark-200">Unread Notifications</span>
              </div>
              <span className="text-lg font-bold text-white">{data?.unreadNotifications ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/15 flex items-center justify-center">
                  <Users size={18} className="text-primary-400" />
                </div>
                <span className="text-sm text-dark-200">Athlete Retention</span>
              </div>
              <span className="text-lg font-bold text-white">
                {data && data.totalAthletes > 0
                  ? Math.round((data.activeAthletes / data.totalAthletes) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white text-lg">Recent Athletes</h3>
            <button
              onClick={() => onNavigate('athletes')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {recentAthletes.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No athletes yet" />
          ) : (
            <div className="space-y-2">
              {recentAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
                      {athlete.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-100">{athlete.name}</p>
                      <p className="text-xs text-dark-400">{athlete.sport}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(athlete.status)}>{athlete.status}</Badge>
                    <span className="text-xs text-dark-400 hidden sm:inline">{formatDate(athlete.joined_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white text-lg">Upcoming Events</h3>
            <button
              onClick={() => onNavigate('events')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={<CalendarDays size={28} />} title="No upcoming events" />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex flex-col items-center justify-center">
                      <span className="text-xs text-accent-300 font-bold leading-none">
                        {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-sm text-accent-200 font-bold leading-none mt-0.5">
                        {new Date(event.start_date).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-100">{event.title}</p>
                      <p className="text-xs text-dark-400">{event.location || 'TBD'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-dark-100">
                      {event.registered_count}/{event.capacity}
                    </p>
                    <p className="text-xs text-dark-400">registered</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white text-lg">Recent Tickets</h3>
          <button
            onClick={() => onNavigate('tickets')}
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>
        {recentTickets.length === 0 ? (
          <EmptyState icon={<Ticket size={28} />} title="No tickets yet" />
        ) : (
          <div className="space-y-2">
            {recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-dark-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-dark-800 flex items-center justify-center">
                    <Ticket size={16} className="text-dark-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark-100">{ticket.subject}</p>
                    <p className="text-xs text-dark-400">{formatDate(ticket.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityVariant(ticket.priority)}>{ticket.priority}</Badge>
                  <Badge variant={ticketStatusVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
