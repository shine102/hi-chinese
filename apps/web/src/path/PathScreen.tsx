import type { ManifestUnit } from '@hi-chinese/content';
import { Link } from '@tanstack/react-router';
import { useContent } from '../content/provider.js';
import { db } from '../db/db.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { Loading } from '../ui/Loading.js';
import { computeUnitStates, type UnitState } from './unlock.js';

const BADGE: Record<UnitState, string> = {
  locked: 'bg-stone-200 text-stone-500',
  available: 'bg-white text-stone-900 border border-stone-300',
  'in-progress': 'bg-amber-100 text-amber-900 border border-amber-300',
  completed: 'bg-green-100 text-green-900 border border-green-300',
};

const LABEL: Record<UnitState, string> = {
  locked: 'Locked',
  available: 'Start',
  'in-progress': 'In progress',
  completed: 'Completed',
};

function UnitNode({ unit, state }: { unit: ManifestUnit; state: UnitState }) {
  const inner = (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${BADGE[state]}`}>
      <div>
        <div className="font-medium">{unit.title}</div>
        <div className="text-xs opacity-70">
          {unit.wordCount} words
          {unit.grammarCount > 0 ? `, ${unit.grammarCount} grammar` : ''}
        </div>
      </div>
      <span className="text-xs font-medium uppercase tracking-wide">{LABEL[state]}</span>
    </div>
  );
  return (
    <li data-testid={`unit-${unit.id}`} data-state={state}>
      {state === 'locked' ? (
        <div aria-disabled="true">{inner}</div>
      ) : (
        <Link
          to="/unit/$unitId"
          params={{ unitId: unit.id }}
          aria-label={`${unit.title}, ${LABEL[state]}`}
        >
          {inner}
        </Link>
      )}
    </li>
  );
}

export function PathScreen() {
  const content = useContent();
  const rows = useLiveQuery(() => db.unitProgress.toArray(), []);
  if (rows === undefined) return <Loading />;
  const states = computeUnitStates(content.unitOrder, rows);
  return (
    <div className="flex flex-col gap-8">
      {content.manifest.levels.map((level) => (
        <section key={level.level} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{level.title}</h2>
          <ol className="flex flex-col gap-2">
            {level.unitIds.map((id) => {
              const unit = content.unitById.get(id);
              if (!unit) return null;
              return <UnitNode key={id} unit={unit} state={states.get(id) ?? 'locked'} />;
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
