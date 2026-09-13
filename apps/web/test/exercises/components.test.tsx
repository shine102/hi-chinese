// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MatchPairs } from '../../src/exercises/components/MatchPairs.js';
import { MultipleChoice } from '../../src/exercises/components/MultipleChoice.js';
import { SentenceBuilder } from '../../src/exercises/components/SentenceBuilder.js';
import { ExerciseBoundary } from '../../src/exercises/components/ExerciseBoundary.js';
import type {
  Answer,
  MatchPairsExercise,
  MultipleChoiceExercise,
  SentenceBuilderExercise,
} from '../../src/exercises/types.js';

const mc: MultipleChoiceExercise = {
  kind: 'multiple-choice',
  id: 'mc:1',
  wordId: 'w:我',
  direction: 'en-zh',
  prompt: 'I',
  promptSub: null,
  speech: null,
  options: ['你', '我', '他', '好'],
  correctIndex: 1,
};

const sb: SentenceBuilderExercise = {
  kind: 'sentence-builder',
  id: 'sb:1',
  sentenceId: 's:l1:002',
  vi: 'I am not him.',
  speech: '我不是他。',
  answer: ['我', '不', '是', '他'],
  tiles: ['他', '我', '好', '不', '是', '你'],
};

const mp: MatchPairsExercise = {
  kind: 'match-pairs',
  id: 'mp:1',
  pairs: [
    { wordId: 'w:我', zh: '我', vi: 'I' },
    { wordId: 'w:你', zh: '你', vi: 'you' },
    { wordId: 'w:他', zh: '他', vi: 'he' },
  ],
};

describe('MultipleChoice', () => {
  it('reports the chosen index and marks the correct option for dev tooling', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<MultipleChoice exercise={mc} answered={null} onAnswer={onAnswer} />);
    expect(screen.getByText('I')).toBeTruthy();
    const correct = screen.getByRole('button', { name: '我' });
    expect(correct.getAttribute('data-correct')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '他' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'choice', index: 2 });
  });

  it('disables the options once answered', () => {
    render(
      <MultipleChoice exercise={mc} answered={{ kind: 'choice', index: 2 }} onAnswer={() => {}} />,
    );
    for (const b of screen.getAllByRole('button')) expect(b).toHaveProperty('disabled', true);
  });
});

describe('SentenceBuilder', () => {
  it('builds the answer from tapped tiles and submits on Check', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<SentenceBuilder exercise={sb} answered={null} onAnswer={onAnswer} />);
    const bank = screen.getByTestId('tile-bank');
    for (let i = 0; i < sb.answer.length; i++) {
      fireEvent.click(bank.querySelector(`[data-answer-index="${i}"]`)!);
    }
    expect(
      within(screen.getByTestId('tile-answer'))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['我', '不', '是', '他']);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'order', tiles: ['我', '不', '是', '他'] });
  });

  it('returns a placed tile to the bank when tapped again', () => {
    render(<SentenceBuilder exercise={sb} answered={null} onAnswer={() => {}} />);
    const bank = screen.getByTestId('tile-bank');
    fireEvent.click(within(bank).getByRole('button', { name: '好' }));
    expect(
      within(screen.getByTestId('tile-answer')).getByRole('button', { name: '好' }),
    ).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('tile-answer')).getByRole('button', { name: '好' }));
    expect(within(screen.getByTestId('tile-answer')).queryByRole('button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Check' })).toHaveProperty('disabled', true);
  });
});

describe('MatchPairs', () => {
  it('finishes with zero mismatches when every pair is matched correctly', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<MatchPairs exercise={mp} answered={null} onAnswer={onAnswer} />);
    for (let i = 0; i < mp.pairs.length; i++) {
      fireEvent.click(
        screen.getByTestId('exercise-pairs').querySelector(`[data-pair-left="${i}"]`)!,
      );
      fireEvent.click(
        screen.getByTestId('exercise-pairs').querySelector(`[data-pair-right="${i}"]`)!,
      );
    }
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'pairs', mismatches: 0 });
  });

  it('counts a mismatch and lets the learner continue', () => {
    const onAnswer = vi.fn<(a: Answer) => void>();
    render(<MatchPairs exercise={mp} answered={null} onAnswer={onAnswer} />);
    const root = screen.getByTestId('exercise-pairs');
    fireEvent.click(root.querySelector('[data-pair-left="0"]')!);
    fireEvent.click(root.querySelector('[data-pair-right="1"]')!); // wrong
    for (let i = 0; i < mp.pairs.length; i++) {
      fireEvent.click(root.querySelector(`[data-pair-left="${i}"]`)!);
      fireEvent.click(root.querySelector(`[data-pair-right="${i}"]`)!);
    }
    expect(onAnswer).toHaveBeenCalledWith({ kind: 'pairs', mismatches: 1 });
  });
});

describe('ExerciseBoundary', () => {
  it('calls onError and renders nothing when a child throws', () => {
    const Boom = () => {
      throw new Error('bad exercise');
    };
    const onError = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ExerciseBoundary onError={onError}>
        <Boom />
      </ExerciseBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe('');
    spy.mockRestore();
  });
});
