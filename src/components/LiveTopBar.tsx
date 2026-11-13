import { LIVE_STAT_BAR } from '../data/mapGeometry';
import { SECTORS_BY_ID } from '../data/sectors';
import { INCIDENT } from '../data/live';
import { elapsedLabel } from '../lib/live';
import { StatDivider, TopBarChrome } from './TopBar';
import type { SectorLive } from '../store/useLiveStore';

export interface LiveTopBarProps {
  minute: number;
  /** The sector furthest short of its plan right now, if anything is flying. */
  worst: SectorLive | null;
  incidentOpen: boolean;
  inContact: number;
  available: number;
}

/**
 * The top bar once the plan is flying (frames 238:2144 and 289:2394).
 *
 * Status only, like every other screen: how long the mission has been up,
 * the one thing that needs the operator, and how much of the fleet the
 * console can still hear from. The middle reading is the screen's whole
 * argument in one line — while a link is down it names the cause rather than
 * the symptom, because the sector falling behind is not the thing to fix.
 *
 * **Flagged for design review:** the frames draw this reading only when
 * something is wrong. The settled wording — "Behind plan: None" — is proposed
 * here.
 */
export function LiveTopBar({
  minute,
  worst,
  incidentOpen,
  inContact,
  available,
}: LiveTopBarProps) {
  const behind = worst !== null && worst.behind > 0;

  return (
    <TopBarChrome statRight={LIVE_STAT_BAR.right}>
      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">Live:</p>
        <p className="text-[15px] font-semibold text-text-primary">{elapsedLabel(minute)}</p>
      </div>

      <StatDivider />

      {incidentOpen ? (
        <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
          <p className="text-[12px] text-text-secondary">Incident:</p>
          <p className="text-[15px] font-semibold text-status-needs-operator">
            {INCIDENT.relayUnit} relay lost
          </p>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
          <p className="text-[12px] text-text-secondary">Behind plan:</p>
          <p
            className={`text-[15px] font-semibold ${
              worst?.flagged ? 'text-status-needs-operator' : 'text-text-primary'
            }`}
          >
            {behind && worst
              ? `${SECTORS_BY_ID[worst.sector].label} · −${worst.behind} ${
                  worst.behind === 1 ? 'pt' : 'pts'
                }`
              : 'None'}
          </p>
        </div>
      )}

      <StatDivider />

      <div className="flex shrink-0 items-center gap-[5px] overflow-hidden whitespace-nowrap">
        <p className="text-[12px] text-text-secondary">In contact:</p>
        <p
          className={`text-[15px] font-semibold ${
            inContact < available ? 'text-status-needs-operator' : 'text-text-primary'
          }`}
        >
          {inContact} of {available}
        </p>
      </div>
    </TopBarChrome>
  );
}
