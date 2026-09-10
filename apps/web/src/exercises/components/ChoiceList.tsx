import { devAttr } from '../dev-attrs.js';
import type { Answer } from '../types.js';

export function ChoiceList({
  options,
  correctIndex,
  answered,
  onAnswer,
  large = false,
}: {
  options: string[];
  correctIndex: number;
  answered: Answer | null;
  onAnswer: (a: Answer) => void;
  large?: boolean;
}) {
  const chosen = answered?.kind === 'choice' ? answered.index : null;
  return (
    <ul className="grid grid-cols-1 gap-2">
      {options.map((opt, i) => {
        let tone = 'border-stone-300 bg-white';
        if (answered !== null) {
          if (i === correctIndex) tone = 'border-green-500 bg-green-50';
          else if (i === chosen) tone = 'border-red-500 bg-red-50';
          else tone = 'border-stone-200 bg-stone-50 opacity-60';
        }
        return (
          <li key={`${i}:${opt}`}>
            <button
              type="button"
              disabled={answered !== null}
              onClick={() => onAnswer({ kind: 'choice', index: i })}
              className={`w-full rounded-lg border px-4 py-3 text-left ${large ? 'text-2xl' : 'text-base'} ${tone}`}
              {...devAttr('data-correct', i === correctIndex)}
            >
              {opt}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
