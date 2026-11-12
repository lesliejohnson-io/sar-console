import { useState } from 'react';
import { SECTORS_BY_ID } from '../data/sectors';
import { ONE_WAY_NOTE, REACH_WARNING_GLYPH, canOperatorMove } from '../data/reach';
import { formatUnitRange, groupByType } from '../lib/units';
import { CoverageBar } from './CoverageBar';
import { InlineWarning } from './InlineWarning';
import { MoveToSectorMenu } from './MoveToSectorMenu';
import { PriorityBadge } from './PriorityBadge';
import { UnitRow } from './UnitRow';
import type { Assignments } from '../store/usePlanStore';
import type { AssetType, SectorId } from '../data/types';
import lockOpen from '../assets/icons/lock-open.svg';

export interface SectorSectionProps {
  sectorId: SectorId;
  unitIds: string[];
  assignments: Assignments;
  percent: number;
  belowTarget: boolean;
  staged: boolean;
  selected: boolean;
  lockedUnits: string[];
  onMove: (unitId: string, toSector: SectorId) => void;
  onStage: (sectorId: SectorId) => void;
}

export function SectorSection({
  sectorId,
  unitIds,
  assignments,
  percent,
  belowTarget,
  staged,
  selected,
  lockedUnits,
  onMove,
  onStage,
}: SectorSectionProps) {
  const sector = SECTORS_BY_ID[sectorId];
  const groups = groupByType(unitIds);

  // Which collapsed rows the operator has opened into single units.
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setOpened((was) => ({ ...was, [key]: !was[key] }));

  // The autonomy's reason names whatever units of its subject type are in the
  // sector right now, so it stays true after the operator moves one out.
  const subject = groups.find((group) => group.type === sector.reason.subjectType);
  const reason = subject
    ? `${formatUnitRange(subject.unitIds)} ${sector.reason.suffix}`
    : undefined;

  /*
   * Units the autonomy put somewhere the operator may not send more of the
   * same type. Without a word here the refusal elsewhere looks like a bug, so
   * the row says what it cost to put them there — but the card shows it only
   * when nothing else is already explaining the same units, so a sector never
   * says two things at once about one group.
   */
  const oneWay = (ids: string[]) =>
    !belowTarget && !canOperatorMove(ids[0], sectorId).ok;

  const subjectIsOneWay = subject !== undefined && oneWay(subject.unitIds);

  const rowsFor = (type: AssetType, ids: string[], key: string, locked: boolean) => {
    const expanded = opened[key] ?? false;
    const single = ids.length === 1;

    if (single || expanded) {
      return (
        <>
          {!single && (
            <UnitRow
              label={formatUnitRange(ids)}
              type={type}
              locked={locked}
              expandable
              expanded
              onToggleExpand={() => toggle(key)}
            />
          )}
          {ids.map((unitId) => (
            <UnitRow
              key={unitId}
              label={unitId}
              type={type}
              locked={locked && single}
              inset={!single}
              trailing={
                <MoveToSectorMenu
                  unitId={unitId}
                  current={sectorId}
                  assignments={assignments}
                  onMove={onMove}
                />
              }
            />
          ))}
        </>
      );
    }

    return (
      <UnitRow
        label={formatUnitRange(ids)}
        type={type}
        locked={locked}
        expandable
        expanded={false}
        onToggleExpand={() => toggle(key)}
      />
    );
  };

  return (
    <div
      id={`sector-card-${sectorId}`}
      tabIndex={-1}
      className={`flex w-full shrink-0 flex-col items-start gap-[2px] rounded-[6px] border bg-surface-card px-[6px] pt-[5px] pb-[6px] ${
        selected ? 'border-text-primary' : 'border-surface-card'
      }`}
    >
      <div className="flex h-[30px] w-full items-center gap-[4px] pl-[9px]">
        <p className="h-[17px] w-[139px] shrink-0 text-[14px] font-semibold text-text-primary">
          {sector.label}
        </p>
        <PriorityBadge priority={sector.priority} />
        <div className="h-px min-w-px flex-1" />
        {staged ? (
          <div className="flex shrink-0 items-start overflow-hidden pr-[2px] pl-[6px]">
            <p className="text-[12px] whitespace-nowrap text-text-secondary">✓ Staged</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStage(sectorId)}
            className="flex shrink-0 cursor-pointer items-start overflow-hidden rounded-[3px] border border-interaction-primary px-[10px] py-[4px]"
          >
            <p className="text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
              Stage sector
            </p>
          </button>
        )}
        <button
          type="button"
          aria-label={`Lock ${sector.label}`}
          className="flex size-[26px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[3px] border border-text-secondary"
        >
          <img alt="" src={lockOpen} width={16} height={16} className="block" />
        </button>
      </div>

      <CoverageBar percent={percent} />

      {/*
        * Below target the warning takes the reason line's place: it carries the
        * cause itself, so the sector does not say two things at once.
        */}
      {reason && !belowTarget && !subjectIsOneWay && (
        <div className="flex w-full items-start overflow-hidden px-[9px] pb-[2px]">
          <p className="min-w-px flex-1 text-[12px] text-text-secondary">{reason}</p>
        </div>
      )}

      {belowTarget && (
        <InlineWarning
          percent={percent}
          priority={sector.priority}
          cause={sector.lowCoverageCause}
        />
      )}

      {groups.map((group) => {
        const operatorSet = group.unitIds.filter(
          (id) => assignments[id].source === 'operator',
        );
        const autonomySet = group.unitIds.filter(
          (id) => assignments[id].source === 'autonomy',
        );

        const showOneWay = oneWay(group.unitIds);

        return (
          <div key={group.type} className="contents">
            {autonomySet.length > 0 && (
              <>
                {rowsFor(
                  group.type,
                  autonomySet,
                  `${group.type}-autonomy`,
                  autonomySet.every((id) => lockedUnits.includes(id)),
                )}
                {showOneWay && (
                  <div className="flex w-full items-start gap-[6px] px-[9px] pb-[2px]">
                    <span aria-hidden className="text-[10px] text-status-needs-operator">
                      {REACH_WARNING_GLYPH}
                    </span>
                    <p className="min-w-px flex-1 text-[12px] text-text-secondary">
                      {ONE_WAY_NOTE}
                    </p>
                  </div>
                )}
              </>
            )}
            {operatorSet.length > 0 && (
              <OperatorSetGroup
                note={operatorNote(assignments, operatorSet)}
                rows={rowsFor(group.type, operatorSet, `${group.type}-operator`, false)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "Set by operator · moved from Sector B · 08:41" */
function operatorNote(assignments: Assignments, unitIds: string[]): string {
  const assignment = assignments[unitIds[0]];
  const parts = ['Set by operator'];
  if (assignment.movedFrom) parts.push(`moved from Sector ${assignment.movedFrom}`);
  if (assignment.at) parts.push(assignment.at);
  return parts.join(' · ');
}

/** An operator choice, marked with the teal bar and its own reason line. */
function OperatorSetGroup({ rows, note }: { rows: React.ReactNode; note: string }) {
  return (
    <div className="relative flex w-full flex-col items-start">
      {rows}
      <div className="flex w-full items-start overflow-hidden pb-[5px] pl-[9px]">
        <p className="text-[12px] whitespace-nowrap text-text-secondary">{note}</p>
      </div>
      <div className="absolute inset-y-0 left-0 w-[2px] bg-status-operator-set" />
    </div>
  );
}
