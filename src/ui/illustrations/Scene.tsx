import type { ReactNode } from "react";

// Shared frame for every drawing: pencil line plus one flat fill printed 5 right and 4 down, off-register.
// `shapes` are the closed shapes (drawn twice: once as the fill, once as the outline); `lines` are open details.
// Geometry comes from docs/design/Illustration.dc.html; keep it identical.
export interface SceneProps {
  /** Accessible description. Pass a translated string; the English default is in each component. */
  label?: string;
  /** True when the drawing sits next to text that already says the same thing. */
  decorative?: boolean;
  className?: string;
}

export function Scene({
  viewBox = "0 0 160 120",
  label,
  decorative,
  className,
  shapes,
  lines,
  before,
  fillWrapper,
  after,
}: SceneProps & {
  viewBox?: string;
  shapes: ReactNode;
  lines: ReactNode;
  /** Marker strokes (class "hl") drawn between the fill and the line. */
  before?: ReactNode;
  /** Wraps the fill group (used by the all-done drawing to animate it rising). */
  fillWrapper?: (fill: ReactNode) => ReactNode;
  after?: ReactNode;
}) {
  const fill = (
    <g className="fl" transform="translate(5 4)">
      {shapes}
    </g>
  );
  return (
    <svg
      className={className ? `il ${className}` : "il"}
      viewBox={viewBox}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      {fillWrapper ? fillWrapper(fill) : fill}
      {before}
      <g className="ln" style={{ filter: "url(#wob)" }}>
        {shapes}
        {lines}
      </g>
      {after}
    </svg>
  );
}
