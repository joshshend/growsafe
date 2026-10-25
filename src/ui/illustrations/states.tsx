// The three state drawings: empty doorframe (welcome and empty lists), all-done doorframe, and scan trace.
// Geometry copied from docs/design/Illustration.dc.html, Welcome.dc.html, Done.dc.html and Scan.dc.html.
import { Scene, type SceneProps } from "./Scene";

export function EmptyDoorframe({
  label = "An empty doorframe, a pencil on the floor and a dotted line where the first mark will go",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <rect x="44" y="12" width="72" height="92" rx="1" />
          <rect x="108" y="94" width="38" height="8" rx="1" />
          <path d="M146 94l9 4-9 4z" />
        </>
      }
      lines={
        <>
          <path d="M8 104H152M52 104V20H108V104" />
          <path className="dash" d="M44 78h16" />
          <path d="M114 94v8" />
        </>
      }
    />
  );
}

// `animate` plays the fill rising once (class anim-fill; reduced motion swaps it for a fade).
export function DoneDoorframe({
  label = "A doorframe with six pencil ticks climbing the side. The top tick is highlighted and the frame is filled in.",
  animate = false,
  ...rest
}: SceneProps & { animate?: boolean }) {
  return (
    <Scene
      label={label}
      {...rest}
      viewBox="0 0 160 150"
      shapes={<rect x="40" y="10" width="80" height="124" rx="1" />}
      fillWrapper={(fill) => (animate ? <g className="anim-fill">{fill}</g> : fill)}
      before={<path className="hl" d="M49 40q12-1 27 0" transform="translate(2 3)" />}
      lines={
        <>
          <path d="M16 134H144M48 134V18H112V134" />
          <path d="M49 120q6-1 13 0M49 104q8-1 15 0M49 88q6-1 13 0M49 72q9-1 17 0M49 56q8-1 15 0" />
          <path d="M49 40q12-1 27 0" style={{ strokeWidth: 3 }} />
        </>
      }
    />
  );
}

const SCAN_LOOP =
  "M14 66C12 40 38 28 56 30C80 32 92 48 88 76C85 100 40 108 22 100C12 95 14 80 14 66z";

export function ScanTrace({
  label = "Pencil trace of a photo: a TV on a low stand and an outlet near the floor, each circled",
  ...rest
}: SceneProps) {
  return (
    <Scene
      label={label}
      {...rest}
      shapes={
        <>
          <rect x="96" y="22" width="40" height="40" rx="2" />
          <rect x="28" y="36" width="46" height="26" rx="2" />
          <rect x="20" y="62" width="62" height="36" rx="2" />
          <rect x="108" y="84" width="10" height="14" rx="2" />
        </>
      }
      before={
        <>
          <path className="hl" d={SCAN_LOOP} transform="translate(2 3)" />
          <circle className="hl" cx="113" cy="91" r="13" transform="translate(2 3)" />
        </>
      }
      lines={
        <>
          <path d="M8 104H152M116 22v40M96 42h40M26 98v6M76 98v6M6 24V8H22M154 24V8H138M6 96v16h16M154 96v16h-16" />
          <path d={SCAN_LOOP} />
          <circle cx="113" cy="91" r="13" />
        </>
      }
    />
  );
}
