/**
 * Last-write-wins, the same rule the Worker applies: a remote row replaces the
 * local one only if it is strictly newer. Echoes of our own pushes have equal
 * updatedAt and are therefore no-ops.
 */
export function pickWinners<T extends { updatedAt: number }>(
  remote: readonly T[],
  local: ReadonlyMap<string, T>,
  keyOf: (row: T) => string,
): T[] {
  return remote.filter((row) => {
    const mine = local.get(keyOf(row));
    return mine === undefined || row.updatedAt > mine.updatedAt;
  });
}
