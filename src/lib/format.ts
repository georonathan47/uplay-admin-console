/** Shared display formatting. Every page renders dates the same way. */

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Coarse relative time — enough for "when did this happen" at a glance. */
export function formatRelative(value: string | null): string {
  if (!value) return '—';

  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const steps: [number, string][] = [
    [60, 'min'],
    [3600, 'hr'],
    [86400, 'day'],
    [604800, 'wk'],
  ];

  for (let i = steps.length - 1; i >= 0; i--) {
    const [unitSeconds, label] = steps[i];
    if (seconds >= unitSeconds) {
      const amount = Math.floor(seconds / unitSeconds);
      return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
    }
  }

  return 'just now';
}

/** Turns a snake_case database value into something readable. */
export function humanise(value: string | null): string {
  if (!value) return '—';
  const words = value.replace(/_/g, ' ');
  return words[0].toUpperCase() + words.slice(1);
}
