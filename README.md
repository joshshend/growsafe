# Kid-Proof

A free child-safety planner. Kid-Proof turns a child's age and each home's rooms into a ranked, step-by-step plan of hazards to fix, with the reason each one ranks first.

## Overview

- Installable web app (PWA). Works on iPhone, Android, and desktop browsers.
- Later wrapped with Capacitor for a native iOS build (T17).
- Plan sharing is a read-only link. The plan lives in the URL fragment, so it never reaches a server.

## Run it

Requires Node 22 and npm 10.

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run typecheck
npm run lint
npm run build && npm run preview   # production build, installable PWA
```

## Architecture

Two layers are kept separate:

- **Knowledge base (`src/kb`)** holds hazard data, each entry with a source URL and access date. It drives the plan.
- **Perception (`src/perception`)** analyses a photo against knowledge-base detection cues. It produces findings, which become tasks. It never writes advice on its own.

Other modules:

- `src/plan`: pure ranking engine (child age stage to ranked tasks).
- `src/ui`: screens and components.
- `src/share`: plan serialization into the URL fragment.
- `src/i18n`: English and Spanish strings.
- `scripts/`: build and validation scripts.
- `eval/`: perception bake-off harness and locked test set.

## Privacy

- No accounts, no analytics, no third-party scripts.
- Photos are processed on the device where possible. Any photo sent for analysis goes through a rate-limited proxy that does not log images. (Planned, T9.)
- Emergency card data stays on the device and is never included in a share link.

## Not a guarantee

Kid-Proof helps you find and fix common hazards. It is not a guarantee of safety, and it does not replace supervision, professional advice, or emergency care. In an emergency or suspected poisoning, call Poison Help at 1-800-222-1222 or 911.
