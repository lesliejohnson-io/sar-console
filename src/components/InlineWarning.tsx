import { COVERAGE_TARGET } from '../data/sectors';
import type { Priority } from '../data/types';

/**
 * Shown in place on the sector that is short, with what it costs. Never blocks
 * the operator: they can still stage the sector.
 */
export function InlineWarning({
  percent,
  priority,
  cause,
}: {
  percent: number;
  priority: Priority;
  cause: string;
}) {
  const shortfall = COVERAGE_TARGET - percent;

  return (
    <div className="flex w-full flex-col items-start gap-[2px] overflow-hidden border-l-2 border-status-needs-operator bg-feedback-info/8 py-[4px] pr-[8px] pl-[10px] text-[12px]">
      <p className="w-full font-semibold text-status-needs-operator">
        ◆ <span className="font-mono">{percent}%</span> coverage, {shortfall} pts below target for
        a {priority} sector
      </p>
      <p className="w-full text-text-secondary">{cause}</p>
      <div className="flex items-start gap-[14px] overflow-hidden pt-[2px] text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
        <button type="button" className="cursor-pointer">
          See options
        </button>
        <button type="button" className="cursor-pointer">
          Stage anyway
        </button>
      </div>
    </div>
  );
}
