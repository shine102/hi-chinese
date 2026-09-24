// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLiveQuery } from '../../src/db/use-live-query.js';

describe('useLiveQuery', () => {
  it('returns data from the querier', async () => {
    const { result } = renderHook(() => useLiveQuery(async () => 42, []));
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.error).toBeUndefined();
  });

  it('surfaces a failure and recovers on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail = true;
    const querier = vi.fn(async () => {
      if (fail) throw new Error('boom');
      return 'ok';
    });
    const { result } = renderHook(() => useLiveQuery(querier, []));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.data).toBeUndefined();
    fail = false;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current.error).toBeUndefined();
  });
});
