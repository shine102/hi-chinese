// @vitest-environment jsdom
import type { Word } from '@hi-chinese/content';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildContentIndex } from '../../src/content/index.js';
import { WordLinks } from '../../src/lessons/WordLinks.js';
import { fixtureManifest, fixtureWords } from '../fixtures/content.js';

const find = (s: string) => fixtureWords.find((w) => w.simplified === s)!;
const hao: Word = {
  ...find('好'),
  associations: [
    { zh: '你好', pinyin: 'nǐ hǎo', hanViet: 'Nễ Hảo', vi: 'xin chào', wordId: 'w:你好' },
    { zh: '好人', pinyin: 'hǎo rén', hanViet: 'Hảo Nhân', vi: 'người tốt' },
  ],
};
const laoshi: Word = {
  ...find('老师'),
  parts: [
    { char: '老', hanViet: 'Lão', gloss: 'già; cũ' },
    { char: '师', hanViet: 'Sư', gloss: 'thầy' },
  ],
};
const women: Word = {
  ...find('老师'),
  id: 'w:我们',
  simplified: '我们',
  parts: [
    { char: '我', hanViet: 'Ngã', gloss: 'tôi', wordId: 'w:我' },
    { char: '们', hanViet: 'Môn', gloss: '', wordId: 'w:们' },
  ],
};
const nihao: Word = { ...find('你'), id: 'w:你好', simplified: '你好', unitId: 'l1-u02' };
const content = buildContentIndex(fixtureManifest, [...fixtureWords, nihao]);

describe('WordLinks', () => {
  it('lists associations of a single-character word with pinyin, Hán Việt and meaning', () => {
    render(<WordLinks word={hao} content={content} />);
    const box = screen.getByRole('region', { name: 'Gặp trong' });
    expect(within(box).getByText('你好')).toBeTruthy();
    expect(within(box).getByText('xin chào')).toBeTruthy();
    expect(within(box).getByText(/Hảo Nhân/)).toBeTruthy();
    // 你好 is taught in l1-u02, after 好 (l1-u01): not marked as learned.
    expect(within(box).queryByText('đã học')).toBeNull();
  });

  it('splits a compound into characters and marks characters learned in an earlier unit', () => {
    // 我们 sits in l1-u02 (copied from 老师); 我 was taught in l1-u01, 们 in l1-u02 (same unit).
    render(<WordLinks word={women} content={content} />);
    const box = screen.getByRole('region', { name: 'Từng chữ' });
    const items = within(box).getAllByRole('listitem');
    expect(within(items[0]!).getByText('tôi')).toBeTruthy();
    expect(within(items[0]!).getByText('đã học')).toBeTruthy();
    expect(within(items[1]!).queryByText('đã học')).toBeNull();
  });

  it('renders parts without a learned badge when no character is a course word', () => {
    render(<WordLinks word={laoshi} content={content} />);
    expect(screen.getByText('thầy')).toBeTruthy();
    expect(screen.queryByText('đã học')).toBeNull();
  });

  it('renders nothing for a word without links', () => {
    const { container } = render(<WordLinks word={find('吗')} content={content} />);
    expect(container.innerHTML).toBe('');
  });
});
