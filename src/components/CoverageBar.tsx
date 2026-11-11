import { COVERAGE_TARGET } from '../data/sectors';

const TRACK_WIDTH = 269;

/**
 * Expected coverage for one sector. The tick marks the 60% target; a sector
 * below it fills amber and says how far short it is, rather than only being
 * shorter.
 */
export function CoverageBar({ percent }: { percent: number }) {
  const belowTarget = percent < COVERAGE_TARGET;

  return (
    <div
      className={`flex h-[36px] w-full items-center pt-[2px] pr-[30px] pb-[4px] pl-[9px] ${
        belowTarget ? '' : 'gap-[10px]'
      }`}
    >
      <div
        className={`relative h-[12px] shrink-0 ${belowTarget ? 'mr-[-66px]' : ''}`}
        style={{ width: TRACK_WIDTH }}
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Expected coverage ${percent}%, target ${COVERAGE_TARGET}%`}
      >
        <div
          className="absolute top-[5px] left-0 h-[2px] rounded-[1px] bg-surface-app"
          style={{ width: TRACK_WIDTH }}
        />
        <div
          className={`absolute top-[5px] left-0 h-[2px] rounded-[1px] ${
            belowTarget ? 'bg-status-needs-operator' : 'bg-status-ready'
          }`}
          style={{ width: (TRACK_WIDTH * percent) / 100 }}
        />
        <div
          className="absolute top-[2px] h-[8px] w-[2px] bg-text-primary"
          style={{ left: (TRACK_WIDTH * COVERAGE_TARGET) / 100 }}
        />
      </div>

      {belowTarget ? (
        <p className="w-[109px] shrink-0 text-right text-[12px] font-semibold text-text-primary">
          <span className="text-status-needs-operator">{percent}%</span>
          <span>· target </span>
          <span className="font-normal">{COVERAGE_TARGET}%</span>
        </p>
      ) : (
        <p className="w-[34px] shrink-0 text-right text-[12px] font-semibold text-text-primary">
          {percent}%
        </p>
      )}
    </div>
  );
}
