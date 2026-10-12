# T5b Redesign: make it look and work like a shipped consumer app
Josh's verdict on T5: it looks AI-generated (dark navy + pastel-blue accent, pill nav, text walls, one full-width blue button, an "About / How AI is used" page in the main nav). Replace the look, the navigation and the onboarding flow. Keep all logic in src/plan, src/kb, src/share, src/store untouched (UI + i18n + CSS only). Keep every existing test passing or update it to the new UI.

## Who and what
Parents, grandparents and sitters of babies and toddlers, often one-handed on a phone, often stressed or distracted, some with low vision. The app answers one question: "what should I fix next, and is it done?" It should feel like a calm, well-made utility (think Apple Health / Things / a good hardware-store checklist), not a dashboard and not a chatbot.

## Design tokens (use CSS variables in src/ui/tokens.css)
Light is the default; dark is a designed variant via prefers-color-scheme (a warm charcoal, NOT navy).
- Ground #F4F5F7 (cool light grey), Surface #FFFFFF, Ink #14213D (text only, never a background), Muted ink #5B6575
- Action #E8590C (safety orange; the hazard-sign colour: primary buttons, "do first" marker), pressed #C2410C, text on action #FFFFFF (check contrast >= 4.5:1; if it fails, use #C2410C as the fill)
- Done #2F8F5B (checkmarks, completed progress), Emergency #C92A2A (ONLY the Poison Help button), Line #E3E6EB (hairline dividers)
- Dark: ground #17181B, surface #202226, ink #F2F3F5, action #FF8A4C, done #5CC48A
- Radius: 14px for sheets/tiles, 10px for buttons and inputs, 999px only for the progress ring and avatar. No decorative shadows; elevation only on the bottom sheet (one soft shadow). No gradients.
- Type: one family, Atkinson Hyperlegible Next (designed for low-vision readers; bundle with @fontsource, NO Google Fonts requests so the privacy claim stays true). Scale: 34/28/22/18/16 (body is 18 on phones, 20 in Larger text), weights 400/600/800 only. Sentence case everywhere. No all-caps labels, no eyebrow labels, no middle-dot meta strings, no arrows in buttons, no emoji.
- Icons: @phosphor-icons/react, duotone weight, one icon per room and per hazard category (map hazard.icon keys to Phosphor icons; fall back to a generic one). Never colour-only meaning: severity = icon + word.
- Motion: none on page load. Only: task checkmark fills with a 150ms scale, bottom sheet slides up, progress ring animates when a task completes. Respect prefers-reduced-motion.

## Navigation (replaces Plan/About pills)
Bottom tab bar, 4 tabs, icon + label, 56px tall, safe-area aware: Today, Rooms, Help, People (caregivers/briefing; stub screen until T6/T19: shows "Share this plan" button and sitter briefing link).
Top bar: left = child switcher (avatar initial + nickname + age, e.g. "Maya, 9 months"; tap opens a sheet to switch/add child), right = a red Poison Help button (phone icon + "Poison Help", tel:) always visible, and a gear icon to Settings. No About page in the nav: Settings has Language, Larger text, Dark/Light/Auto, "Privacy and how this works" (plain 4-line page: what stays on the device; advice comes from linked sources reviewed by people, not generated; what the app can't see; AI-assisted build disclosure link), Erase data (confirm sheet).

## Screens
Today: greeting line with the child's name; ONE hero task ("Anchor the TV and dresser" with room, time, cost, one orange "Start" button); below it "Next up" as a flat list (rows separated by hairlines, NOT cards): checkbox, title, room, cost. A collapsed "Coming up at 10 months" row showing the next unlock ("Pulling up to stand: furniture tip-overs matter more"). If everything is done, a calm done state with what unlocks next.
Task detail (bottom sheet over Today/Rooms, full page on desktop): title; time + cost chips; numbered steps ONLY because steps are a sequence; a single "Mark done" button; "Why this matters" and "Where this comes from" (source links) as collapsed disclosure rows; Assign and Due date behind an "Assign" row that opens a small sheet. Show the "why it ranks here" reasons inside the "Why this matters" disclosure as plain sentences. The not-a-guarantee line appears here, once, as small muted text, not as a footer everywhere.
Rooms: a 2-column grid of room tiles (icon, name, "3 of 7 done" and a thin progress ring); tapping opens the room checklist. Tile corners use the 14px radius; no drop shadows; tiles differ from list rows on purpose.
Help: Poison Help button (big), 911 note, then placeholder sections for T18 resources.
Settings: as above.

## Onboarding (3 steps, one screen each, a stepper dots indicator is NOT needed; show "Step 1 of 3" in muted text)
1. "Who are we keeping safe?" nickname + birth month/year pickers (native selects). 2. "Where do they spend time?" toggle chips: My home (on by default), Grandparents', Sitter or daycare; can add more later. 3. Rooms for each home pre-selected by sensible defaults (living room, kitchen, bedroom or nursery, bathroom, stairs); one tap on "Looks right" to finish, "Edit rooms" optional. Then land on Today with a plan already built. First screen: a plain welcome with the app name, one sentence ("A ranked to-do list for your child's age and your home."), "Get started" and a quieter "See an example" (demo family). No mention of AI on this screen.

## Copy rules (rewrite src/i18n/en.json accordingly)
Plain words a tired parent understands; active voice; buttons say what happens ("Mark done", "Add child"); errors say what went wrong and how to fix it, no apologies; no "Kid-Proof cannot..." boilerplate; never use the word "safe" as a claim; keep Spanish keys mirrored with the [ES] placeholder.

## Quality floor
375px first; 44px+ targets; visible keyboard focus ring (3px, action colour, 2px offset); screen-reader labels on icon-only buttons; sheets trap focus and close on Escape; contrast AA in both themes; all work with Larger text on.

## Process
Work in this order and commit after each: tokens + font + tab shell; onboarding; Today + task sheet; Rooms; Settings/Help/People; dark mode; copy pass; tests. Before building, write 6 lines in DECISIONS.md listing any token you changed and why. If the Claude_Browser tools (mcp__remote-devices__Claude_Browser__*, load via ToolSearch) are available, start the dev server on the Mac (`npm run dev -- --host` in the background via device_bash), open it with preview_start/navigate, resize to 375x812, take screenshots of every screen in light and dark, and critique them against this brief; fix what looks generic, cramped or inconsistent. If the browser is not available, say so and do a careful static review instead.
Done when: typecheck, lint, tests pass; screenshots (if available) saved to docs/screens/; reply in <200 words with what changed and what Josh should look at.
