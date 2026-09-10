/**
 * Next `updatedAt` for a row: never earlier than now, and always strictly after
 * the previous value so the server's last-write-wins compare accepts the write
 * even if the device clock moved backwards.
 */
export function nextUpdatedAt(prev: number | undefined, now: number): number {
  return prev === undefined ? now : Math.max(now, prev + 1);
}

/** Calendar day in the learner's local time zone, formatted YYYY-MM-DD. */
export function localDate(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
