import { Rating } from 'ts-fsrs';

const GRADES = [
  { rating: Rating.Again, label: 'Again', color: 'bg-red-100 text-red-800 border-red-300' },
  { rating: Rating.Hard, label: 'Hard', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { rating: Rating.Good, label: 'Good', color: 'bg-green-100 text-green-800 border-green-300' },
  { rating: Rating.Easy, label: 'Easy', color: 'bg-blue-100 text-blue-800 border-blue-300' },
] as const;

export function GradeSelector({
  selected,
  onSelect,
}: {
  selected: Rating;
  onSelect: (rating: Rating) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Grade your answer">
      {GRADES.map(({ rating, label, color }) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={selected === rating}
          onClick={() => onSelect(rating)}
          className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all ${
            selected === rating
              ? `${color} ring-2 ring-offset-1`
              : 'border-stone-200 bg-white text-stone-600'
          }`}
          data-grade={rating}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
