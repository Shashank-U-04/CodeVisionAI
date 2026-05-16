/**
 * Bezier path math for stack-to-heap reference arrows.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Builds a smooth horizontal cubic-bezier from `from` to `to`.
 * Control points are pulled horizontally so arrows curve gently —
 * stronger curvature when the vertical distance is larger.
 */
export function cubicHorizontal(from: Point, to: Point): string {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const tension = Math.max(40, Math.min(dx * 0.55, 220) + dy * 0.15);
  const cp1: Point = { x: from.x + tension, y: from.y };
  const cp2: Point = { x: to.x - tension, y: to.y };
  return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
}

/**
 * Returns the right-edge midpoint of an element in the container's content
 * coordinate space (accounts for scroll offset so arrows stay correct when
 * the container is scrolled).
 */
export function rightAnchor(el: Element, container: HTMLElement): Point {
  const eb = el.getBoundingClientRect();
  const cb = container.getBoundingClientRect();
  return {
    x: eb.right - cb.left + container.scrollLeft,
    y: eb.top + eb.height / 2 - cb.top + container.scrollTop,
  };
}

/**
 * Left-edge midpoint of an element in the container's content coordinate space.
 */
export function leftAnchor(el: Element, container: HTMLElement): Point {
  const eb = el.getBoundingClientRect();
  const cb = container.getBoundingClientRect();
  return {
    x: eb.left - cb.left + container.scrollLeft,
    y: eb.top + eb.height / 2 - cb.top + container.scrollTop,
  };
}

/**
 * Stable color picker — same heap id always gets the same arrow color.
 */
const ARROW_COLORS = [
  '#60a5fa', // blue-400
  '#4ade80', // green-400
  '#facc15', // yellow-400
  '#c084fc', // purple-400
  '#fb923c', // orange-400
  '#22d3ee', // cyan-400
  '#f472b6', // pink-400
];

export function colorForId(id: number): string {
  // Stable hash → palette index
  const idx = Math.abs(id) % ARROW_COLORS.length;
  return ARROW_COLORS[idx];
}
