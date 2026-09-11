import { Link, useParams } from '@tanstack/react-router';
import { computeLessons } from '../lessons/compute.js';
import { useContent, useUnitChunk } from '../content/provider.js';
import { db } from '../db/db.js';
import { useLiveQuery } from '../db/use-live-query.js';
import { InlineError } from '../ui/InlineError.js';
import { Loading } from '../ui/Loading.js';
import { computeUnitStates } from './unlock.js';

export function UnitScreen() {
  const { unitId } = useParams({ from: '/unit/$unitId' });
  const content = useContent();
  const chunk = useUnitChunk(unitId);
  const rows = useLiveQuery(() => db.unitProgress.toArray(), []);
  const unit = content.unitById.get(unitId);

  if (!unit) return <p role="alert">Unknown unit.</p>;
  if (rows === undefined || chunk.status === 'loading') return <Loading />;
  if (chunk.status === 'error')
    return <InlineError message={chunk.error.message} onRetry={chunk.retry} />;

  const state = computeUnitStates(content.unitOrder, rows).get(unitId) ?? 'locked';
  if (state === 'locked')
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <p className="rounded-lg bg-stone-100 p-4 text-stone-700">
          This unit is locked. Complete the previous unit first.
        </p>
        <Link to="/" className="text-sm underline">
          Back to path
        </Link>
      </div>
    );

  const lessons = computeLessons(chunk.chunk.unit, chunk.chunk.grammar, chunk.chunk.sentences);
  const progress = rows.find((r) => r.unitId === unitId);
  const completed =
    progress?.status === 'completed' ? lessons.length : (progress?.lessonsCompleted ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <p className="text-stone-600">
          {unit.wordCount} words, {lessons.length} lessons
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {lessons.map((lesson, i) => {
          const done = i < completed;
          const current = i === completed && completed < lessons.length;
          const words = lesson.wordIds
            .map((id) => content.words.get(id)?.simplified)
            .filter(Boolean)
            .join(', ');
          return (
            <li key={i} data-testid={`lesson-${i}`} data-done={done}>
              <Link
                to="/unit/$unitId/lesson/$lessonIdx"
                params={{ unitId, lessonIdx: String(i) }}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  done
                    ? 'border border-green-200 bg-green-50'
                    : current
                      ? 'border-2 border-red-400 bg-white'
                      : 'border border-stone-200 bg-white'
                }`}
              >
                <div>
                  <div className="font-medium">Lesson {i + 1}</div>
                  <div className="text-xs text-stone-600">{words}</div>
                </div>
                <span className="text-xs font-medium">
                  {done ? 'Done' : current ? 'Start' : `${lesson.wordIds.length} words`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <Link to="/" className="text-sm underline">
        Back to path
      </Link>
    </div>
  );
}
