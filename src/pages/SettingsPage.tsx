import { useCallback, useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Globe,
  Bell,
  Shield,
  Palette,
  CalendarDays,
  Plug,
  CheckCircle2,
  Plus,
  Trash2,
  Database,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type Setting, type SettingCategory } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState } from '@/components/ui/States';

const CATEGORIES: { id: SettingCategory; label: string; icon: typeof Globe; description: string }[] = [
  { id: 'general', label: 'General', icon: Globe, description: 'App name, description, and core settings' },
  { id: 'branding', label: 'Branding', icon: Palette, description: 'Colors, logos, and visual identity' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Default notification preferences' },
  { id: 'events', label: 'Events', icon: CalendarDays, description: 'Event defaults and registration rules' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Authentication and access control' },
  { id: 'integrations', label: 'Integrations', icon: Plug, description: 'Third-party services and APIs' },
];

const DEFAULT_SETTINGS: { key: string; label: string; description: string; category: SettingCategory; value: Record<string, unknown> }[] = [
  {
    key: 'app_name',
    label: 'App Name',
    description: 'The name displayed across the platform',
    category: 'general',
    value: { text: 'Youplay' },
  },
  {
    key: 'app_description',
    label: 'App Description',
    description: 'Short tagline shown on landing pages',
    category: 'general',
    value: { text: 'Connect athletes, build communities, compete better' },
  },
  {
    key: 'support_email',
    label: 'Support Email',
    description: 'Email address for support inquiries',
    category: 'general',
    value: { text: 'support@youplay.com' },
  },
  {
    key: 'timezone',
    label: 'Default Timezone',
    description: 'Primary timezone for the platform',
    category: 'general',
    value: { text: 'UTC' },
  },
  {
    key: 'primary_color',
    label: 'Primary Color',
    description: 'Main brand color (hex)',
    category: 'branding',
    value: { text: '#16c47f' },
  },
  {
    key: 'secondary_color',
    label: 'Secondary Color',
    description: 'Accent brand color (hex)',
    category: 'branding',
    value: { text: '#14b8a6' },
  },
  {
    key: 'logo_url',
    label: 'Logo URL',
    description: 'URL to the platform logo',
    category: 'branding',
    value: { text: '' },
  },
  {
    key: 'enable_push_notifications',
    label: 'Push Notifications',
    description: 'Enable push notifications for all users',
    category: 'notifications',
    value: { enabled: true },
  },
  {
    key: 'enable_email_notifications',
    label: 'Email Notifications',
    description: 'Enable email notifications',
    category: 'notifications',
    value: { enabled: true },
  },
  {
    key: 'notification_rate_limit',
    label: 'Rate Limit',
    description: 'Max notifications per user per day',
    category: 'notifications',
    value: { number: 50 },
  },
  {
    key: 'default_event_capacity',
    label: 'Default Event Capacity',
    description: 'Default max participants for new events',
    category: 'events',
    value: { number: 100 },
  },
  {
    key: 'auto_confirm_registrations',
    label: 'Auto-confirm Registrations',
    description: 'Automatically confirm event registrations',
    category: 'events',
    value: { enabled: false },
  },
  {
    key: 'require_email_verification',
    label: 'Email Verification',
    description: 'Require email verification for new accounts',
    category: 'security',
    value: { enabled: false },
  },
  {
    key: 'session_timeout',
    label: 'Session Timeout (minutes)',
    description: 'Auto-logout after inactivity',
    category: 'security',
    value: { number: 60 },
  },
  {
    key: 'max_login_attempts',
    label: 'Max Login Attempts',
    description: 'Failed login attempts before lockout',
    category: 'security',
    value: { number: 5 },
  },
  {
    key: 'analytics_integration',
    label: 'Analytics',
    description: 'Third-party analytics provider',
    category: 'integrations',
    value: { text: 'none' },
  },
  {
    key: 'maps_api_key',
    label: 'Maps API Key',
    description: 'Google Maps API key for event locations',
    category: 'integrations',
    value: { text: '' },
  },
  {
    key: 'payment_provider',
    label: 'Payment Provider',
    description: 'Payment gateway for premium features',
    category: 'integrations',
    value: { text: 'none' },
  },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('general');
  const [editValues, setEditValues] = useState<Record<string, Record<string, unknown>>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('settings').select('*');
      if (err) throw err;

      const existingMap = new Map((data || []).map((s) => [s.key, s]));

      const merged: Setting[] = DEFAULT_SETTINGS.map((ds) => {
        const existing = existingMap.get(ds.key);
        if (existing) {
          return { ...existing, label: ds.label, description: ds.description, category: ds.category };
        }
        return {
          id: '',
          key: ds.key,
          value: ds.value,
          category: ds.category,
          label: ds.label,
          description: ds.description,
          updated_at: new Date().toISOString(),
        };
      });

      setSettings(merged);
      const editMap: Record<string, Record<string, unknown>> = {};
      merged.forEach((s) => {
        editMap[s.key] = { ...s.value };
      });
      setEditValues(editMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (setting: Setting) => {
    setSavingKeys((prev) => new Set(prev).add(setting.key));
    try {
      const newValue = editValues[setting.key] || setting.value;
      if (setting.id) {
        const { error: err } = await supabase
          .from('settings')
          .update({ value: newValue, updated_at: new Date().toISOString() })
          .eq('id', setting.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('settings').insert({
          key: setting.key,
          value: newValue,
          category: setting.category,
          label: setting.label,
          description: setting.description,
        });
        if (err) throw err;
      }
      setSavedKeys((prev) => new Set(prev).add(setting.key));
      setTimeout(() => {
        setSavedKeys((prev) => {
          const next = new Set(prev);
          next.delete(setting.key);
          return next;
        });
      }, 2000);
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(setting.key);
        return next;
      });
    }
  };

  const updateFieldValue = (key: string, field: string, value: unknown) => {
    setEditValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const filteredSettings = settings.filter((s) => s.category === activeCategory);

  const renderSettingInput = (setting: Setting) => {
    const value = editValues[setting.key] || setting.value;
    const isSaving = savingKeys.has(setting.key);
    const isSaved = savedKeys.has(setting.key);

    const hasNumber = 'number' in value;
    const hasText = 'text' in value;
    const hasEnabled = 'enabled' in value;

    return (
      <div key={setting.key} className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">{setting.label}</h3>
            <p className="text-xs text-dark-400 mt-1">{setting.description}</p>
          </div>
          {isSaved && (
            <Badge variant="success">
              <CheckCircle2 size={12} /> Saved
            </Badge>
          )}
        </div>
        <div className="space-y-3">
          {hasEnabled && (
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => updateFieldValue(setting.key, 'enabled', !value.enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  value.enabled ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    value.enabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
              <span className="text-sm text-dark-200">{value.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          )}
          {hasNumber && (
            <input
              type="number"
              value={value.number as number}
              onChange={(e) => updateFieldValue(setting.key, 'number', parseInt(e.target.value) || 0)}
              className="input-field"
            />
          )}
          {hasText && (
            <input
              type="text"
              value={value.text as string}
              onChange={(e) => updateFieldValue(setting.key, 'text', e.target.value)}
              className="input-field"
            />
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => handleSave(setting)}
            disabled={isSaving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingState label="Loading settings..." />;
  if (error && settings.length === 0) return <ErrorState message={error} onRetry={loadSettings} />;

  const currentCat = CATEGORIES.find((c) => c.id === activeCategory);
  const CurrentIcon = currentCat?.icon || SettingsIcon;

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Configure your Youplay platform"
      />

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-error-500/10 border border-error-500/30 flex items-center justify-between">
          <p className="text-sm text-error-300">{error}</p>
          <button onClick={() => setError(null)} className="text-error-400 hover:text-error-300 text-sm">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-3 space-y-1 lg:sticky lg:top-24">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100 border border-transparent'
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-primary-400' : 'text-dark-400'}
                  />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <CurrentIcon size={22} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white">{currentCat?.label}</h2>
              <p className="text-sm text-dark-400">{currentCat?.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSettings.map(renderSettingInput)}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-500/15 flex items-center justify-center">
              <Database size={18} className="text-secondary-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Database</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Provider</span>
              <span className="text-dark-200">Supabase</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Status</span>
              <Badge variant="success">Connected</Badge>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center">
              <Zap size={18} className="text-accent-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Performance</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Response Time</span>
              <span className="text-dark-200">~120ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Uptime</span>
              <span className="text-success-400">99.9%</span>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <Globe size={18} className="text-primary-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Platform</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">Version</span>
              <span className="text-dark-200">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Environment</span>
              <span className="text-dark-200">Production</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
