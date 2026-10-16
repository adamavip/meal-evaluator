// A blocky, pixel-art arrow drawn from squares on a 9 x 7 grid. Crisp edges, currentColor,
// so it sits in running text like a glyph. Used in place of the "→" character.
const CELLS: [number, number][] = [
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], // shaft
  [5, 0], [6, 1], [7, 2], [8, 3], [7, 4], [6, 5], [5, 6], // head
  [6, 2], [6, 4], [7, 3], // fill the head
];

export function PixelArrow({ size = 14, label }: { size?: number; label?: string }) {
  return <svg className="pixel-arrow" width={size * 9 / 7} height={size} viewBox="0 0 9 7" shapeRendering="crispEdges" aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
    {CELLS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />)}
  </svg>;
}

/** Splits a string on "→" and renders a pixel arrow between the parts. */
export function withPixelArrows(text: string, size = 14) {
  const parts = text.split('→');
  return parts.flatMap((part, i) => i < parts.length - 1 ? [part, <PixelArrow key={i} size={size} label="then" />] : [part]);
}
