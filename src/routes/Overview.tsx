import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DrawSectorsCard } from '../components/DrawSectorsCard';
import { Legend } from '../components/Legend';
import { OverviewMap } from '../components/OverviewMap';
import { OverviewTopBar } from '../components/OverviewTopBar';
import { RestartDemo } from '../components/RestartDemo';
import { RosterPanel } from '../components/RosterPanel';
import { Stage } from '../components/Stage';
import { useReducedMotion } from '../lib/useReducedMotion';
import { usePlanStore } from '../store/usePlanStore';
import type { AssetType, SectorId } from '../data/types';

/**
 * Which unit the operator is asking about, and where they asked. The same
 * unit can be pointed at from the rail or from its marker, and the answer
 * opens beside whichever one they used.
 */
export interface UnitHover {
  unitId: string;
  from: 'rail' | 'map';
}

/** How long the pass between proposing and reviewing lasts. */
const PROPOSING_MS = 600;

/**
 * Screen 1 · Area overview, at `/overview`.
 *
 * The way in to the demo: the area, the calls for help that came out of it,
 * and every asset available to work it — before any plan exists. The operator
 * can interrogate all of that (what reaches this sector, how far will these
 * fly, when is that one back) and then ask the autonomy for a plan.
 *
 * `?state=empty` drops the sectors. That is the one piece of screen state the
 * URL owns rather than the store: it is a state of the *demo* rather than of
 * the plan, so it survives a reload, can be linked to, and `Draw sectors`
 * leaves it simply by dropping the parameter.
 */
export function Overview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reducedMotion = useReducedMotion();

  const reset = usePlanStore((state) => state.reset);

  /*
   * Which sector the operator is asking about is a question on this screen,
   * not a fact about the plan, so it lives here rather than in the store.
   * Screen 2 keeps its own `selectedSector`, which opens on the sector that
   * needs an answer; Screen 1 opens with nothing selected, as the frame does.
   */
  const [selectedSector, selectSector] = useState<SectorId | null>(null);
  const [hoveredType, setHoveredType] = useState<AssetType | null>(null);
  const [hover, setHover] = useState<UnitHover | null>(null);
  const [proposing, setProposing] = useState(false);
  const drawButton = useRef<HTMLButtonElement>(null);

  const sectorsDrawn = params.get('state') !== 'empty';

  // Escape closes the reach card, as it closes the opened group on Screen 2.
  useEffect(() => {
    if (!selectedSector) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') selectSector(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedSector, selectSector]);

  const handlePropose = useCallback(() => {
    /*
     * Nothing to propose yet: rather than a control that looks pressable and
     * does nothing, the quiet button hands the keyboard to the thing that has
     * to happen first.
     */
    if (!sectorsDrawn) {
      drawButton.current?.focus();
      return;
    }

    if (reducedMotion) {
      navigate('/review');
      return;
    }

    // No Figma frame for this pass — proposed as a brief dim with the button
    // saying what it is doing. Flagged for design review.
    setProposing(true);
    window.setTimeout(() => navigate('/review'), PROPOSING_MS);
  }, [navigate, reducedMotion, sectorsDrawn]);

  return (
    <Stage>
      <OverviewMap
        sectorsDrawn={sectorsDrawn}
        selectedSector={sectorsDrawn ? selectedSector : null}
        onSelectSector={selectSector}
        hoveredType={hoveredType}
        hover={hover}
        onHover={setHover}
      />

      <OverviewTopBar />

      {!sectorsDrawn && (
        <DrawSectorsCard drawRef={drawButton} onDraw={() => navigate('/overview')} />
      )}

      <RosterPanel
        hoveredType={hoveredType}
        onHoverType={setHoveredType}
        hover={hover}
        onUnitHover={setHover}
        empty={!sectorsDrawn}
        proposing={proposing}
        onPropose={handlePropose}
      />

      <Legend />
      <RestartDemo
        onRestart={() => {
          reset();
          navigate('/overview');
        }}
      />
    </Stage>
  );
}
