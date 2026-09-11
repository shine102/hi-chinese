import type { ActivityRow } from '@hi-chinese/content';

export function computeStreak(activities: readonly ActivityRow[], today: string): number {
  const active = new Set<string>();
  for (const a of activities) {
    if (a.lessons > 0 || a.reviews > 0) active.add(a.date);
  }
  let streak = 0;
  let date = today;
  while (active.has(date)) {
    streak++;
    date = prevDate(date);
  }
  return streak;
}

function prevDate(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
