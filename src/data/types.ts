/** Shared vocabulary for the scripted mission data. */

export type AssetType = 'ROC' | 'HYD' | 'GRF' | 'KRK';

export type SectorId = 'A' | 'B' | 'C' | 'D';

/** Griffins fly comms relay for the whole area rather than one search sector. */
export type AssignmentTarget = SectorId | 'ALL';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

/** Who decided an assignment. Purple marks autonomy, teal marks the operator. */
export type Source = 'autonomy' | 'operator';

export type UnitStatus =
  | 'ready'
  | 'autonomous'
  | 'needs-operator'
  | 'degraded'
  | 'out-of-contact'
  | 'unavailable';

export interface Unit {
  id: string;
  type: AssetType;
  /** Launch site id, see `launchSites.ts`. */
  site: string;
  status: UnitStatus;
  /** Shown in the Unavailable section and on hover (Screen 1). */
  unavailableReason?: string;
}

export interface Assignment {
  unitId: string;
  target: AssignmentTarget;
  source: Source;
  /** Set when the operator moved the unit out of another sector. */
  movedFrom?: SectorId;
  /** Mission clock, HH:MM, recorded at the moment of the move. */
  at?: string;
}
