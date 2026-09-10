import { Link, useParams } from '@tanstack/react-router';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { Loading } from '../ui/Loading.js';
import { computeUnitStates } from './unlock.js';

export function UnitScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId' });
  const content = useContent();
  const rows = useLiveQuery(() => db.unitProgress.toArray(), []);
  const unit = content.unitById.get(unitId);
  if (!unit) return <p role="alert">Unknown unit.</p>;
  if (rows === undefined) return <Loading />;
  const state = computeUnitStates(content.unitOrder, rows).get(unitId) ?? 'locked';
  const grammar =
    unit.grammarCount === 1 ? '1 grammar point' : `${unit.grammarCount} grammar points`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <p className="text-stone-600">
          {unit.wordCount} words, {grammar}
        </p>
      </div>
      {state === 'locked' ? (
        <p className="rounded-lg bg-stone-100 p-4 text-stone-700">
          This unit is locked. Complete the previous unit first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <Link
            to="/unit/$unitId/learn"
            params={{ unitId }}
            className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-center font-medium"
          >
            Learn
          </Link>
          <Link
            to="/unit/$unitId/practice"
            params={{ unitId }}
            className="rounded-lg bg-red-700 px-4 py-3 text-center font-medium text-white"
          >
            Practice
          </Link>
        </div>
      )}
      <Link to="/" className="text-sm underline">
        Back to path
      </Link>
    </div>
  );
}
