import { INCIDENT, OPERATOR } from '../data/live';
import { formatUnitRange } from '../lib/units';
import { TYPE_NAME } from '../data/reach';
import type { IncidentPhase, Resolution } from '../store/useLiveStore';

export interface IncidentCardProps {
  phase: IncidentPhase;
  /** Mission clock reading for when the link dropped. */
  at: string;
  /** Minutes since it dropped. */
  since: number;
  /** Minutes until the chosen option has taken effect. */
  until: number;
  resolution: Resolution | null;
  /** Mission clock reading for when the operator chose. */
  chosenAt: string | null;
  /** Sector B's expected coverage before the link dropped, from the model. */
  before: number;
  /** And what the units still in contact give on their own. */
  after: number;
  effectsOpen: boolean;
  onToggleEffects: () => void;
  onChoose: (option: Resolution) => void;
  onPauseSector: () => void;
  sectorPaused: boolean;
}

/**
 * One incident, one card (frame 289:2394).
 *
 * The shape of it is the argument: root cause first, the units it took down
 * grouped underneath it, then what it costs, then what the autonomy did on its
 * own, and only then the decision. Seven alerts would have told the operator
 * seven times that something is wrong; this tells them once, and says why.
 *
 * Both options carry the same button, in the same colour, in the same order
 * they were written. The console does not have a view on which one is right —
 * it has a view on the operator knowing what each costs.
 *
 * **Flagged for design review:** only the deciding state is drawn in Figma.
 * The expanded unit list and the in-progress state below are proposed here;
 * the resolved state is the one feed line the card leaves behind, as the
 * `note/Incident card: first draft` frame asks for.
 */
export function IncidentCard({
  phase,
  at,
  since,
  until,
  resolution,
  chosenAt,
  before,
  after,
  effectsOpen,
  onToggleEffects,
  onChoose,
  onPauseSector,
  sectorPaused,
}: IncidentCardProps) {
  const count = INCIDENT.affectedUnits.length;
  const range = formatUnitRange(INCIDENT.affectedUnits);
  const type = TYPE_NAME.HYD;

  return (
    <section
      aria-label={`Incident: ${INCIDENT.title}`}
      className="flex w-full flex-col items-start gap-[8px] overflow-hidden border-l-2 border-status-needs-operator bg-feedback-info/10 pt-[8px] pr-[10px] pb-[10px] pl-[12px] leading-[normal]"
    >
      <div className="flex w-full items-center gap-[6px] overflow-hidden">
        <p className="shrink-0 font-mono text-[12px] whitespace-nowrap text-text-secondary">
          {at}
        </p>
        <p aria-hidden className="shrink-0 text-[12px] font-semibold text-status-needs-operator">
          ◆
        </p>
        <h2 className="shrink-0 text-[13px] font-semibold whitespace-nowrap text-text-primary">
          {INCIDENT.title}
        </h2>
        <div className="h-px min-w-px flex-1" />
        <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
          {since} min ago
        </p>
      </div>

      {/* The grouped effects: everything this one cause took down. */}
      <div className="flex w-full flex-col items-start">
        <button
          type="button"
          aria-expanded={effectsOpen}
          onClick={onToggleEffects}
          className="flex w-full cursor-pointer items-center gap-[6px] overflow-hidden rounded-[2px] text-left whitespace-nowrap"
        >
          <span aria-hidden className="shrink-0 text-[11px] text-text-secondary">
            {effectsOpen ? '▾' : '▸'}
          </span>
          <span className="shrink-0 text-[12px] text-text-primary">
            {count} {type}s {INCIDENT.effect}
          </span>
          <span className="shrink-0 font-mono text-[12px] text-text-secondary">{range}</span>
        </button>

        {effectsOpen && (
          <ul className="flex w-full flex-col items-start pt-[4px] pl-[17px]">
            {INCIDENT.affectedUnits.map((unitId) => (
              <li
                key={unitId}
                className="flex w-full items-center gap-[8px] py-[1px] whitespace-nowrap"
              >
                <span className="w-[62px] shrink-0 font-mono text-[12px] text-text-primary">
                  {unitId}
                </span>
                <span className="shrink-0 text-[12px] text-text-secondary">
                  Last contact {since} min ago · holding
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* What it costs, on the same scale the rail draws coverage on. */}
      <div className="flex w-full items-center gap-[8px] overflow-hidden">
        <p className="shrink-0 text-[12px] whitespace-nowrap text-text-secondary">
          Sector {INCIDENT.sector} expected coverage
        </p>
        <div className="relative h-[12px] w-[110px] shrink-0" aria-hidden>
          <div className="absolute inset-x-0 top-[5px] h-[2px] rounded-[1px] bg-surface-app" />
          <div
            className="absolute top-[5px] left-0 h-[2px] rounded-[1px] bg-status-needs-operator"
            style={{ width: `${after}%` }}
          />
          <div
            className="absolute top-[2px] h-[8px] w-[2px] bg-text-primary"
            style={{ left: `${before}%` }}
          />
        </div>
        <p className="shrink-0 text-[12px] font-semibold whitespace-nowrap text-status-needs-operator">
          {before}% → {after}%
        </p>
      </div>

      {/* What the autonomy did by itself, in its own colour. */}
      <div className="flex w-full items-start gap-[6px] overflow-hidden">
        <p aria-hidden className="shrink-0 text-[10px] text-status-autonomous">
          ■
        </p>
        <p className="min-w-px flex-1 text-[12px] text-text-secondary">
          Autonomy: holding the {count} {type}s {INCIDENT.autonomyNote}
        </p>
      </div>

      {phase === 'deciding' ? (
        <div className="flex w-full items-start gap-[8px]">
          {INCIDENT.options.map((option) => (
            <article
              key={option.key}
              className="flex min-h-[129px] min-w-px flex-1 flex-col items-start gap-[4px] overflow-hidden rounded-[4px] border border-border-subtle bg-surface-card p-[8px]"
            >
              <h3 className="w-full text-[12px] font-semibold text-text-primary">
                {option.title}
              </h3>
              <p className="w-full text-[12px] text-text-primary">{option.outcome}</p>
              <p className="w-full text-[12px] text-text-secondary">{option.cost}</p>
              <div className="min-h-px w-[4px] flex-1" />
              <button
                type="button"
                onClick={() => onChoose(option.key)}
                className="flex shrink-0 cursor-pointer items-start overflow-hidden rounded-[3px] border border-interaction-primary px-[10px] py-[4px] text-[12px] font-semibold whitespace-nowrap text-interaction-primary"
              >
                {option.action}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <ChosenOption
          resolution={resolution}
          chosenAt={chosenAt}
          until={until}
          range={range}
        />
      )}

      <div className="flex w-full items-center gap-[14px] overflow-hidden text-[12px] whitespace-nowrap text-text-secondary">
        <p className="shrink-0">Always available:</p>
        <button
          type="button"
          onClick={onPauseSector}
          disabled={sectorPaused}
          className="shrink-0 cursor-pointer font-semibold disabled:cursor-default disabled:opacity-60"
        >
          {sectorPaused ? `Sector ${INCIDENT.sector} paused` : `Pause Sector ${INCIDENT.sector}`}
        </button>
        <button
          type="button"
          onClick={() => onChoose('held')}
          disabled={resolution !== null}
          className="shrink-0 cursor-pointer font-semibold disabled:cursor-default disabled:opacity-60"
        >
          Hold all affected units
        </button>
      </div>
    </section>
  );
}

/**
 * What the operator chose, while it takes effect. Teal and the left bar, the
 * same marks a unit the operator moved wears on Screens 2 and 3, because this
 * is the same kind of fact: a person decided it.
 *
 * No Figma frame — proposed, flagged for design review.
 */
function ChosenOption({
  resolution,
  chosenAt,
  until,
  range,
}: {
  resolution: Resolution | null;
  chosenAt: string | null;
  until: number;
  range: string;
}) {
  if (resolution === null) return null;

  const option = INCIDENT.options.find((one) => one.key === resolution);
  const title = option ? option.title : `Hold ${range} at last position`;

  return (
    <div className="relative flex w-full flex-col items-start gap-[2px] pl-[10px]">
      <div className="absolute inset-y-0 left-0 w-[2px] bg-status-operator-set" />
      <p className="w-full text-[12px] font-semibold text-text-primary">{title}</p>
      <p className="w-full text-[12px] text-text-secondary">
        Set by {OPERATOR} · {chosenAt}
        {until > 0 ? ` · in about ${until} min` : ' · done'}
      </p>
    </div>
  );
}
