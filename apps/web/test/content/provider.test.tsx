// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ContentGate,
  ContentProvider,
  useContent,
  useUnitChunk,
} from '../../src/content/provider.js';
import { fixtureLoaders, fixtureManifest } from '../fixtures/content.js';

function ShowCounts() {
  const content = useContent();
  return <p>{`${content.words.size} words, ${content.unitOrder.length} units`}</p>;
}

function ShowUnit({ unitId }: { unitId: string }) {
  const state = useUnitChunk(unitId);
  if (state.status === 'loading') return <p>loading unit</p>;
  if (state.status === 'error')
    return (
      <button type="button" onClick={state.retry}>
        unit failed: {state.error.message}
      </button>
    );
  return <p>{state.chunk.unit.title}</p>;
}

describe('ContentProvider', () => {
  it('shows the children once manifest and words are loaded and reports the version', async () => {
    const onReady = vi.fn();
    render(
      <ContentProvider loaders={fixtureLoaders()} onReady={onReady}>
        <ContentGate>
          <ShowCounts />
        </ContentGate>
      </ContentProvider>,
    );
    expect(await screen.findByText('10 words, 2 units')).toBeTruthy();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]?.[0].manifest.version).toBe(fixtureManifest.version);
  });

  it('shows an inline error with retry when loading fails, then recovers', async () => {
    const loaders = fixtureLoaders();
    const words = vi
      .fn<() => Promise<never[]>>()
      .mockRejectedValueOnce(new Error('HTTP 500 (/content/words.json)'))
      .mockImplementation(async () => []);
    render(
      <ContentProvider loaders={{ ...loaders, words }}>
        <ContentGate>
          <ShowCounts />
        </ContentGate>
      </ContentProvider>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('HTTP 500');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('0 words, 2 units')).toBeTruthy();
  });

  it('loads unit chunks on demand and retries after a failure', async () => {
    const loaders = fixtureLoaders();
    const unit = vi
      .fn<(id: string) => Promise<never>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation((id) => loaders.unit(id) as Promise<never>);
    render(
      <ContentProvider loaders={{ ...loaders, unit }}>
        <ContentGate>
          <ShowUnit unitId="l1-u01" />
        </ContentGate>
      </ContentProvider>,
    );
    const failed = await screen.findByRole('button', { name: /unit failed: offline/ });
    fireEvent.click(failed);
    expect(await screen.findByText('Unit 1')).toBeTruthy();
    expect(unit).toHaveBeenCalledTimes(2);
  });
});
