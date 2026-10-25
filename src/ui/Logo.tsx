// GrowSafe logo: a doorframe jamb with three hand-tilted pencil ticks and a yellow marker stroke under the top tick.
// Geometry is copied from the #gs-mark symbol in docs/design/Today.dc.html. The jamb and ticks use currentColor
// (graphite on paper, cream in dark mode); the yellow stroke uses --action.

export function Mark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M21.5 21C31 20.4 40 21.3 50 20.5"
        style={{ stroke: "var(--action)" }}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        transform="translate(2 3.5)"
      />
      <g fill="none" stroke="currentColor" strokeWidth="5.4" strokeLinecap="round">
        <path d="M21 7C20 24 22 40 21 57" />
        <path d="M21.5 47C27 46.6 33 47.4 38 46.8" />
        <path d="M21.5 34C29 33.5 36 34.4 44 33.7" />
        <path d="M21.5 21C31 20.4 40 21.3 50 20.5" />
      </g>
    </svg>
  );
}

// Mark plus the name in Young Serif. Pass the name from i18n (app.title). Use as="h1" where it is the page heading.
export function Wordmark({
  text,
  as: Tag = "span",
  large = false,
}: {
  text: string;
  as?: "span" | "h1";
  large?: boolean;
}) {
  return (
    <Tag className={large ? "wm wm-lg" : "wm"}>
      <Mark size={large ? 40 : 30} />
      {text}
    </Tag>
  );
}
