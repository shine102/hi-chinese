// @vitest-environment jsdom
import type { Word } from '@hi-chinese/content';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WordCard } from '../../src/learn/LearnScreen.js';
import { fixtureWords } from '../fixtures/content.js';

function renderWordCard(word: Word) {
  const rootRoute = createRootRoute({ component: () => <WordCard word={word} /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('WordCard', () => {
  it('shows the character, pinyin and meaning with a disabled play button when no voice exists', async () => {
    renderWordCard(fixtureWords[0]!);
    expect(await screen.findByText('我')).toBeTruthy();
    expect(screen.getByText('wǒ')).toBeTruthy();
    expect(screen.getByText('I; me')).toBeTruthy();
    const play = screen.getByRole('button', { name: 'Play 我' });
    expect(play).toHaveProperty('disabled', true);
  });
});
