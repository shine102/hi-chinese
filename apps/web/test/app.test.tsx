// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App.js';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Hi Chinese' })).toBeTruthy();
  });
});
