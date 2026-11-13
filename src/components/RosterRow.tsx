/**
 * One line of the asset roster: what the unit is, how it is doing and where,
 * and how long it can stay up. The three columns are the tasking table's own
 * (77 px / 96 px / the rest), so the rail reads as one table across both
 * screens even though the two carry different facts.
 *
 * An unavailable unit is dimmed until the operator points at it, and then
 * comes back up to full so the tooltip's subject is unmistakable.
 */
export function RosterRow({
  unitId,
  statusSite,
  endurance,
  dimmed = false,
  highlighted = false,
  onHover,
}: {
  unitId: string;
  statusSite: string;
  endurance: string;
  dimmed?: boolean;
  highlighted?: boolean;
  /** Set for a row that has something more to say, such as a return time. */
  onHover?: (hovering: boolean) => void;
}) {
  const interactive = onHover !== undefined;

  return (
    <div
      className={`flex h-[28px] w-full items-center gap-[12px] overflow-hidden border-t border-border-subtle py-[4px] pr-[5px] pl-[9px] ${
        dimmed && !highlighted ? 'opacity-55' : ''
      } ${highlighted ? 'bg-surface-app' : ''}`}
      tabIndex={interactive ? 0 : undefined}
      onMouseEnter={interactive ? () => onHover(true) : undefined}
      onMouseLeave={interactive ? () => onHover(false) : undefined}
      onFocus={interactive ? () => onHover(true) : undefined}
      onBlur={interactive ? () => onHover(false) : undefined}
    >
      <p className="h-[16px] w-[77px] shrink-0 text-[12px] font-semibold text-text-primary">
        {unitId}
      </p>
      <p className="h-[16px] w-[96px] shrink-0 text-[12px] text-text-primary">{statusSite}</p>
      <p className="h-[16px] min-w-px flex-1 truncate text-[12px] text-text-secondary">
        {endurance}
      </p>
    </div>
  );
}
