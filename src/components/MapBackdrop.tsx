import { MAP_PATCH, MAP_RASTER, OCEAN_LABEL } from '../data/mapGeometry';
import raster from '../assets/map/raster.png';

/**
 * The map itself: one image exported from the Figma `map/raster` layer, laid
 * on the stage at its own size. There is no map library and no tile server —
 * the area never moves, so a picture of it is the honest thing to use.
 *
 * The raster carries a baked-in "Atlantic Ocean" label at a size that does
 * not match the console; it is covered with a patch in the ocean colour and
 * redrawn in the UI font, which is what the frames do.
 */
export function MapBackdrop() {
  return (
    <>
      <img
        alt=""
        src={raster}
        className="pointer-events-none absolute max-w-none"
        style={{
          left: MAP_RASTER.x,
          top: MAP_RASTER.y,
          width: MAP_RASTER.width,
          height: MAP_RASTER.height,
        }}
      />

      <div
        className="absolute bg-map-patch"
        style={{
          left: MAP_PATCH.x,
          top: MAP_PATCH.y,
          width: MAP_PATCH.width,
          height: MAP_PATCH.height,
        }}
      />
      <p
        className="absolute -translate-x-1/2 text-center text-[11px] font-light text-text-secondary italic"
        style={{ left: OCEAN_LABEL.x, top: OCEAN_LABEL.y }}
      >
        {OCEAN_LABEL.lines[0]}
        <br />
        {OCEAN_LABEL.lines[1]}
      </p>
    </>
  );
}
