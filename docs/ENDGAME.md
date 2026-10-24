# Endgame: Sat Oct 24 6:30 PM CT -> deadline Mon Oct 26, 11:00 AM CT (12:00 PM ET)

Submit by Sun night. Monday morning is buffer only. Third-party summaries say: source code online + video on YouTube/Vimeo + written responses, via the student portal; web apps are allowed. Josh must read the official rulebook and portal tonight and list every field (docs/SUBMISSION.md).

## Cuts (decided; do not reopen)

- Hosted AI photo scan, bake-off, accuracy page: CUT. Replaced by a guided room check (tap what you see). No API keys needed. Do not mention photo scanning anywhere in the app, README or video.
- Native iOS build (Capacitor): OPTIONAL, only if everything else is done Sunday 4 PM. Demo is recorded from the deployed web app installed to the iPhone home screen.
- Remaining stretch items: cut. Feature freeze is NOW; from here only bugs, copy, polish, video.

## Schedule (CT)

Sat 6:30-8:00 PM Josh: create GitHub repo + push (public), deploy on Vercel, open the live URL on the iPhone, add to Home Screen. Josh: read official rules, fill docs/SUBMISSION.md.
Sat 8:00-9:30 PM Agents (running): guided room check, Spanish completion, README/repo polish. Josh: phone QA pass with the example family, write down every bug or ugly thing in one list (screenshots welcome).
Sat 9:30-11:00 PM Claude: review agent output, batch Josh's QA list into fix briefs, launch fixes. Josh: sleep by 11:30.
Sun 9:00 AM Josh: second QA pass on the deployed build. Claude: second fix batch.
Sun 12:00 PM Freeze the build. Tag v1.0 in git.
Sun 12:30-3:00 PM Record the demo video on the iPhone (script in docs/DEMO_SCRIPT.md, Claude writes it), 2:30 max, captions on.
Sun 3:00-5:00 PM Edit, add captions, upload to YouTube (unlisted), write the written responses (Claude drafts from the portal questions).
Sun 5:00-8:00 PM Submit everything; confirm receipt; screenshot the confirmation. Spare time: Capacitor build if you want it.
Mon morning Buffer. Do not make code changes after Sunday night except to fix a broken link.

## Must-be-true checklist before submitting

[ ] Public GitHub repo with history after Oct 30 2025, README, AI_USE.md, no keys
[ ] Live URL opens on a fresh phone with no setup, example family works
[ ] No "[ES]" placeholder strings visible; Spanish labelled as unreviewed machine translation
[ ] Every "verify" entry either checked by Josh against its source or not shown as a fact in the video
[ ] Video link works logged out; code link works logged out
[ ] AI-use disclosure text ready (from AI_USE.md)
