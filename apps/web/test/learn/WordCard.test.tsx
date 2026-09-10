// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WordCard } from '../../src/learn/LearnScreen.js';
import { fixtureWords } from '../fixtures/content.js';

describe('WordCard', () => {
  it('shows the character, pinyin and meaning with a disabled play button when no voice exists', () => {
    render(<WordCard word={fixtureWords[0]!} />);
    expect(screen.getByText('我')).toBeTruthy();
    expect(screen.getByText('wǒ')).toBeTruthy();
    expect(screen.getByText('I; me')).toBeTruthy();
    const play = screen.getByRole('button', { name: 'Play 我' });
    expect(play).toHaveProperty('disabled', true);
  });
});
