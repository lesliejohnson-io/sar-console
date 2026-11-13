import { MARKER } from '../data/mapGeometry';
import { MarkerFace } from './GroupMarker';
import type { SiteGroup } from '../data/launchSites';
import type { Unit } from '../data/types';

/**
 * A class of asset waiting at its launch site, before any of it is tasked.
 *
 * It is the Screen 2 group marker with nothing changed but where it stands:
 * the same glyph, the same state badge and the same count pill, so an asset
 * looks like itself from the moment the operator first sees it to the moment
 * it is flying a sector.
 *
 * The maintenance pair carry a tooltip; the rest are just there.
 */
export function LaunchSiteMarker({
  group,
  units,
  highlighted,
  onHover,
}: {
  group: SiteGroup;
  units: Unit[];
  highlighted?: boolean;
  onHover?: (hovering: boolean) => void;
}) {
  if (units.length === 0) return null;

  const position = {
    left: group.x,
    top: group.y,
    width: MARKER.width,
    height: MARKER.height,
  };
  const suffix = units.length === 1 ? units[0].id.slice(-2) : `x${units.length}`;
  const face = <MarkerFace type={group.type} status={units[0].status} suffix={suffix} />;

  if (!onHover) {
    return (
      <div className="absolute" style={position}>
        {face}
      </div>
    );
  }

  /*
   * Dimmed while it sits there, full strength while the operator is on it:
   * the legend already reads "Dimmed = position not current", and these two
   * are not going anywhere.
   */
  return (
    <button
      type="button"
      className={`absolute cursor-default rounded-[6px] ${highlighted ? '' : 'opacity-55'}`}
      style={position}
      aria-label={`${units.map((unit) => unit.id).join(', ')}, unavailable`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      {face}
    </button>
  );
}
