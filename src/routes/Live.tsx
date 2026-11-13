import { useNavigate } from 'react-router-dom';
import { Legend } from '../components/Legend';
import { RestartDemo } from '../components/RestartDemo';
import { Stage } from '../components/Stage';
import { TopBar } from '../components/TopBar';
import { SECTORS_BY_ID } from '../data/sectors';
import { formatUnitRange, groupByType } from '../lib/units';
import {
  availableCount,
  coverageBySector,
  overall,
  unassignedCount,
  unitsIn,
  usePlanStore,
  weakest,
} from '../store/usePlanStore';

/**
 * Screen 3 · Tasking live, at `/live`.
 *
 * **A placeholder.** Milestone 4 builds the real thing: coverage filling on a
 * timer, the event feed, and the relay-loss incident. For now it says what
 * went up, so the launch can be seen to have carried the plan through — and
 * so the end of the flow is not a blank page.
 */
export function Live() {
  const navigate = useNavigate();
  const assignments = usePlanStore((state) => state.assignments);
  const launched = usePlanStore((state) => state.launched);
  const reset = usePlanStore((state) => state.reset);

  const coverage = coverageBySector(assignments);
  const relayUnits = unitsIn(assignments, 'ALL');

  return (
    <Stage>
      <div className="absolute inset-0 bg-surface-app" />

      <TopBar
        overall={overall(assignments)}
        weakest={weakest(assignments)}
        weakestPercent={coverage[weakest(assignments)]}
        unassigned={unassignedCount(assignments)}
        available={availableCount()}
      />

      <section
        aria-labelledby="live-title"
        className="absolute flex flex-col gap-[16px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface-panel p-[21px] shadow-panel"
        style={{ left: 9, top: 85, width: 1422, height: 896 }}
      >
        <div className="flex items-baseline gap-[12px]">
          <h1
            id="live-title"
            className="text-[14px] font-black whitespace-nowrap text-text-primary uppercase"
          >
            Tasking live
          </h1>
          <p className="text-[12px] text-text-secondary">
            Placeholder · Milestone 4 builds coverage filling, the event feed and the
            relay-loss incident.
          </p>
        </div>

        {launched === null ? (
          <p className="text-[12px] text-text-secondary">
            Nothing has launched yet.{' '}
            <button
              type="button"
              onClick={() => navigate('/review')}
              className="cursor-pointer text-interaction-primary underline"
            >
              Back to the plan
            </button>
          </p>
        ) : (
          <div className="flex flex-col items-start gap-[8px]">
            <article className="flex w-[640px] flex-col items-start gap-[2px] rounded-[6px] border border-border-subtle bg-surface-card px-[15px] py-[10px]">
              <p className="text-[14px] font-semibold text-text-primary">All sectors</p>
              <p className="text-[12px] text-text-secondary">
                {formatUnitRange(relayUnits)} · relay over every sector
              </p>
            </article>

            {launched.map((sectorId) => (
              <article
                key={sectorId}
                className="flex w-[640px] flex-col items-start gap-[2px] rounded-[6px] border border-border-subtle bg-surface-card px-[15px] py-[10px]"
              >
                <div className="flex w-full items-baseline gap-[8px]">
                  <p className="text-[14px] font-semibold text-text-primary">
                    {SECTORS_BY_ID[sectorId].label}
                  </p>
                  <div className="h-px min-w-px flex-1" />
                  <p className="font-mono text-[12px] text-text-secondary">
                    {coverage[sectorId]}% expected
                  </p>
                </div>
                <p className="text-[12px] text-text-secondary">
                  {groupByType(unitsIn(assignments, sectorId))
                    .map((group) => formatUnitRange(group.unitIds))
                    .join(' · ')}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <Legend />
      <RestartDemo
        onRestart={() => {
          reset();
          navigate('/overview');
        }}
      />
    </Stage>
  );
}
