import { SECTORS_BY_ID } from '../data/sectors';
import { formatUnitRange, groupByType } from '../lib/units';
import { CoverageBar } from './CoverageBar';
import { InlineWarning } from './InlineWarning';
import { MoveOptions } from './MoveOptions';
import { PriorityBadge } from './PriorityBadge';
import { RailPanel, RailRow } from './RailRow';
import { LockIndicator, LockToggle } from './SectorLock';
import { UnitRow } from './UnitRow';
import { sectorSelection, type Assignments, type RailSelection } from '../store/usePlanStore';
import type { AssetType, SectorId } from '../data/types';

export interface SectorSectionProps {
  sectorId: SectorId;
  unitIds: string[];
  assignments: Assignments;
  percent: number;
  belowTarget: boolean;
  staged: boolean;
  locked: boolean;
  /** The one selected row in the rail, which may or may not be in this sector. */
  selection: RailSelection | null;
  /** Select a row; `rowElementId` is the row the operator acted on. */
  onSelect: (next: RailSelection, rowElementId: string) => void;
  onMove: (unitId: string, toSector: SectorId) => void;
  onStage: (sectorId: SectorId) => void;
  onToggleLock: (sectorId: SectorId) => void;
}

/** DOM-safe stem for a row's ids. */
export const rowDomId = (key: string): string => `rail-${key.replace(/[^A-Za-z0-9-]/g, '-')}`;

export function SectorSection({
  sectorId,
  unitIds,
  assignments,
  percent,
  belowTarget,
  staged,
  locked,
  selection,
  onSelect,
  onMove,
  onStage,
  onToggleLock,
}: SectorSectionProps) {
  const sector = SECTORS_BY_ID[sectorId];
  const groups = groupByType(unitIds);
  const header = sectorSelection(sectorId);
  const headerSelected = selection?.key === header.key;
  // The card reads as selected whenever the selection is anywhere in it.
  const inSector = selection?.sector === sectorId;

  // The autonomy's reason names whatever units of its subject type are in the
  // sector right now, so it stays true after the operator moves one out.
  const subject = groups.find((group) => group.type === sector.reason.subjectType);
  const reason = subject
    ? `${formatUnitRange(subject.unitIds)} ${sector.reason.suffix}`
    : undefined;

  const unitRow = (type: AssetType, unitId: string, inset: boolean) => {
    const key = `unit:${unitId}`;
    const rowId = rowDomId(key);
    return (
      <UnitRow
        key={unitId}
        label={unitId}
        type={type}
        inset={inset}
        rowId={rowId}
        selected={selection?.key === key}
        onToggle={(id) => onSelect({ key, sector: sectorId, unitIds: [unitId] }, id)}
        panelLabel={`Move ${unitId} to sector`}
        panel={
          <MoveOptions
            unitId={unitId}
            current={sectorId}
            assignments={assignments}
            onMove={onMove}
          />
        }
      />
    );
  };

  const rowsFor = (type: AssetType, ids: string[], source: string) => {
    if (ids.length === 1) return unitRow(type, ids[0], false);

    /*
     * A group opens into a row per unit, which is the group's "options". It
     * stays open while one of those units is the selection, so choosing a unit
     * inside a group does not fold the group away from under the pointer.
     */
    const key = `group:${sectorId}:${type}:${source}`;
    const open =
      selection !== null &&
      (selection.key === key ||
        (selection.key.startsWith('unit:') && ids.includes(selection.unitIds[0])));

    return (
      <UnitRow
        label={formatUnitRange(ids)}
        type={type}
        rowId={rowDomId(key)}
        selected={selection?.key === key}
        expanded={open}
        onToggle={(id) => onSelect({ key, sector: sectorId, unitIds: ids }, id)}
        panelLabel={`${formatUnitRange(ids)}, one row per unit`}
        bare
        panel={ids.map((unitId) => unitRow(type, unitId, true))}
      />
    );
  };

  const headerRowId = rowDomId(header.key);

  return (
    <div
      id={`sector-card-${sectorId}`}
      tabIndex={-1}
      className={`flex w-full shrink-0 flex-col items-start gap-[2px] rounded-[6px] border bg-surface-card px-[6px] pt-[5px] pb-[6px] ${
        inSector ? 'border-text-primary' : 'border-surface-card'
      }`}
    >
      <RailRow
        rowId={headerRowId}
        labelledBy={`${headerRowId}-title`}
        selected={headerSelected}
        onToggle={(id) => onSelect(header, id)}
        contentClassName="h-[30px] gap-[4px] pr-[5px] pl-[9px]"
      >
        {/* A heading, so the rail can be navigated sector by sector. */}
        <h3
          id={`${headerRowId}-title`}
          className="h-[17px] w-[139px] shrink-0 text-[14px] font-semibold text-text-primary"
        >
          {sector.label}
        </h3>
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
            className="pointer-events-auto relative flex shrink-0 cursor-pointer items-start overflow-hidden rounded-[3px] border border-interaction-primary px-[10px] py-[4px]"
          >
            <p className="text-[12px] font-semibold whitespace-nowrap text-interaction-primary">
              Stage sector
            </p>
          </button>
        )}
        {locked && <LockIndicator />}
      </RailRow>

      {headerSelected && (
        <RailPanel rowId={headerRowId} label={`${sector.label} controls`}>
          <LockToggle sectorId={sectorId} locked={locked} onToggle={() => onToggleLock(sectorId)} />
        </RailPanel>
      )}

      <CoverageBar percent={percent} />

      {/*
        * Below target the warning takes the reason line's place: it carries the
        * cause itself, so the sector does not say two things at once.
        */}
      {reason && !belowTarget && (
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

        return (
          <div key={group.type} className="contents">
            {autonomySet.length > 0 && rowsFor(group.type, autonomySet, 'autonomy')}
            {operatorSet.length > 0 && (
              <OperatorSetGroup
                note={operatorNote(assignments, operatorSet)}
                rows={rowsFor(group.type, operatorSet, 'operator')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "Set by operator · moved from Sector B · 08:41" */
export function operatorNote(assignments: Assignments, unitIds: string[]): string {
  const assignment = assignments[unitIds[0]];
  const parts = ['Set by operator'];
  if (assignment.movedFrom) parts.push(`moved from Sector ${assignment.movedFrom}`);
  if (assignment.at) parts.push(assignment.at);
  return parts.join(' · ');
}

/**
 * An operator choice, marked with the teal bar and its own reason line. Shared
 * with Screen 3: a unit the operator moved keeps saying so once it is flying.
 */
export function OperatorSetGroup({ rows, note }: { rows: React.ReactNode; note: string }) {
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
