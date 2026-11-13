import { COVERAGE_TARGET } from '../data/sectors';

/**
 * Expected coverage for one sector. The tick marks the 60% target; a sector
 * below it fills amber and says how far short it is, rather than only being
 * shorter.
 *
 * The track runs the full width of the card, with the readout on its own line
 * underneath, right-aligned to the track's end. Nothing competes for the
 * track's width, so every sector's bar is the same length and the four can be
 * compared down the column — and the longer warning readout
 * ("44% · target 60%") has a whole line to itself.
 *
 * The fill and the target tick are positioned as percentages of the track, so
 * they stay correct at whatever width the rail gives it.
 */
export function CoverageBar({ percent }: { percent: number }) {
  const belowTarget = percent < COVERAGE_TARGET;

  return (
    <div className="flex h-[36px] w-full flex-col justify-center gap-[2px] pt-[2px] pr-[5px] pb-[4px] pl-[9px]">
      <div
        className="relative h-[10px] w-full"
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Expected coverage ${percent}%, target ${COVERAGE_TARGET}%`}
      >
        <div className="absolute inset-x-0 top-[4px] h-[2px] rounded-[1px] bg-surface-app" />
        <div
          className={`absolute top-[4px] left-0 h-[2px] rounded-[1px] ${
            belowTarget ? 'bg-status-needs-operator' : 'bg-status-ready'
          }`}
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-[1px] h-[8px] w-[2px] bg-text-primary"
          style={{ left: `${COVERAGE_TARGET}%` }}
        />
      </div>

      <p className="w-full text-right text-[12px] font-semibold whitespace-nowrap text-text-primary">
        {belowTarget ? (
          <>
            <span className="text-status-needs-operator">{percent}%</span>
            <span> · target </span>
            <span className="font-normal">{COVERAGE_TARGET}%</span>
          </>
        ) : (
          `${percent}%`
        )}
      </p>
    </div>
  );
}
