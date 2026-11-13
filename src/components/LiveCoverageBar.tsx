/**
 * Coverage once the plan is flying: the bar is what has been searched, the
 * tick is where the plan expects to be at this minute.
 *
 * Screen 2's bar measures a sector against the 60% target, because before
 * launch the question is whether the plan is good enough. Here the target has
 * moved: the question is whether the sector is keeping up with the plan the
 * operator approved, so the tick moves with the clock and the bar chases it.
 *
 * A sector that is short of its plan fills amber and says so in the readout,
 * rather than only being shorter.
 */
export function LiveCoverageBar({
  searched,
  planned,
  flagged,
  label,
}: {
  searched: number;
  planned: number;
  /** Past the tolerance the console asks the operator to decide. */
  flagged: boolean;
  /** The sector this bar belongs to, for the screen reader. */
  label: string;
}) {
  return (
    <div className="flex h-[36px] w-full items-center gap-[10px] pt-[2px] pr-[30px] pb-[4px] pl-[9px]">
      <div
        className="relative h-[12px] min-w-px flex-1"
        role="meter"
        aria-valuenow={searched}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${searched}% searched, plan expects ${planned}% by now`}
      >
        <div className="absolute inset-x-0 top-[5px] h-[2px] rounded-[1px] bg-surface-app" />
        <div
          className={`absolute top-[5px] left-0 h-[2px] rounded-[1px] ${
            flagged ? 'bg-status-needs-operator' : 'bg-status-ready'
          }`}
          style={{ width: `${searched}%` }}
        />
        {/*
          * The plan tick is drawn last so it stays readable where the bar has
          * caught up with it — a sector running ahead of plan still shows
          * where the plan was.
          */}
        <div
          className="absolute top-[2px] h-[8px] w-[2px] bg-text-primary"
          style={{ left: `${planned}%` }}
        />
      </div>

      <p
        className={`h-[14px] w-[34px] shrink-0 text-right text-[12px] font-semibold whitespace-nowrap ${
          flagged ? 'text-status-needs-operator' : 'text-text-primary'
        }`}
      >
        {searched}%
      </p>
    </div>
  );
}
