# GrowSafe demo video: production script (v2, edit-ready)

Target length 2:55 (hard limit 3:00). Upload to YouTube as **Public**. 16:9, 1920x1080, 30 fps.
Two people work from this file: **Josh** (films the phone, records voiceover) and the **editor agent** (graphics, cuts, captions). Everything the editor needs is in the tables. Items in `[BRACKETS]` are blanks Josh must fill before the edit is locked.

## 0. Rules this video must meet (Congressional App Challenge)
- Shows the app working, in under 3 minutes, public on YouTube.
- On screen at some point: **both names** (Joshua Shen; district TX-37), **app name**, **one-sentence purpose**, **target audience**, **tools used to build it**. All are placed in the script below.
- No music with lyrics. No copyrighted clips. Only use music that is royalty-free and credit it in the description.
- No real child's face or real family info. The demo uses the built-in sample family only.
- Burned-in captions on all voiceover (accessibility, and many judges watch muted).

## 1. Blanks to fill BEFORE locking the edit
| Blank | What Josh does |
|---|---|
| `[STAT 1]`, `[STAT 2]` | Open the CPSC pages listed in section 2, copy the exact figure and year, paste it here. **Do not use a number that is not on the page.** If no clean figure is found, use the fallback hook in section 2. |
| `[WHY]` | One true sentence about why Josh built this. Not provided yet. Do not invent one. |
| `[CO-ENTRANT]` | Delete if solo. |
| Music file | Royalty-free track, credit line for description. |

## 2. The hook statistics (0:00 to 0:12)
Sources to check, in order: (1) CPSC "Nursery Product-Related Injuries and Deaths" reports (cpsc.gov); (2) CPSC "Child Poisoning / Drowning / Furniture tip-over" report pages; (3) CDC WISQARS or CDC child injury page. Pick **two** figures about children under 5 that are about things a parent can fix at home (tip-overs, drowning, window falls, poisoning, unsafe sleep).
Each stat on screen needs a **source line in small text under it**: "Source: U.S. CPSC, [report name], [year]".
**Fallback hook** (no numbers): "Most injuries to babies and toddlers happen at home, and most are preventable." Only usable if the CDC or CPSC page states it. Otherwise open with the question hook: "When did you last look at your home through your toddler's eyes?"

## 3. Shot list and script

Voiceover (VO) is read at a calm, steady pace, about 150 words per minute. Total VO is about 430 words. Captions follow VO word for word.

### Scene 1: Hook (0:00 to 0:12)
| | |
|---|---|
| **Screen** | Black background, then white text on black, one stat at a time. No app footage yet. |
| **VO** | "Every year, [STAT 1]. And [STAT 2]. Most of these happen at home, in rooms parents think of as safe." |
| **Graphics** | Stat 1 text appears at 0:01 (large number, 120 pt, off-white `#F4EFE4`, number in pencil yellow `#F2C94C`). Under it, source line in 28 pt gray. Cut to Stat 2 at 0:06 the same way. |
| **Transition** | Hard cut between stats. At 0:11 the text wipes upward off the frame (0.3 s). |
| **Sound** | Low single sustained tone under VO. Stops on the wipe. |

### Scene 2: Title card (0:12 to 0:22)
| | |
|---|---|
| **Screen** | Off-white paper background `#F4EFE4`. GrowSafe logo (doorframe mark) draws itself in with pencil strokes (0.8 s). |
| **VO** | "I'm Joshua Shen, from Austin, Texas, in Texas's 37th district. I built GrowSafe: a free planner that tells parents which hazards to fix in their home, in what order." |
| **Graphics** | Lower third 1 (0:13 to 0:17): "Joshua Shen · TX-37". Lower third 2 (0:17 to 0:22), stacked cards: **App:** GrowSafe · **Purpose:** Find and fix home hazards for babies and toddlers · **For:** Parents, grandparents, sitters. Font Barlow Semi Condensed 700 for headings, Atkinson Hyperlegible for body. |
| **Transition** | Fade from black (0.3 s) at start. At 0:22 slide the phone frame in from the right (see Scene 3). |

### Scene 3: First open and install (0:22 to 0:36)
| | |
|---|---|
| **Screen** | Phone screen recording, shown inside a plain phone frame centered in a paper-colored 16:9 canvas. Left side of the canvas is empty for callouts. |
| **Josh's clicks** | 1. Open the live site in Safari: `growsafe-pi.vercel.app`. 2. Pause 1 s on the Welcome screen. 3. Tap **Share**, then **Add to Home Screen**, then **Add**. 4. Go to the Home Screen, tap the **GrowSafe** icon. 5. App opens on Welcome. 6. Tap **Show me an example**. (Button text may change after the latest UI fixes. Tap the example/sample family option.) |
| **VO** | "It's a web app you install straight to your phone. No account, no sign-up, no data leaves your device. Let me open a sample family." |
| **Graphics** | Callout left of phone at 0:26: "No account. No sign-up." Callout at 0:30: "Installs like an app (PWA)". Arrow points at the Home Screen icon. |
| **Transition** | Phone slides in from right (0.4 s). Cut when the example loads. |

### Scene 4: Today and the plan (0:36 to 0:56)
| | |
|---|---|
| **Screen** | The **Today** screen. |
| **Josh's clicks** | 1. Let Today sit 2 s so the "Right now" card is readable. 2. Slowly scroll down 1 screen to show the "Coming up" strip, then scroll back up. 3. Tap the **Right now** button (opens the task sheet). 4. Scroll the sheet slowly to show the **steps** and the **Source** line at the bottom. 5. Tap back. |
| **VO** | "Today shows the one thing to fix right now, ranked by the child's age and what's actually in the home. It also looks ahead: what's about to matter at the next developmental stage. Every task shows its steps, its cost, and the source it came from." |
| **Graphics** | Highlight box (pencil-yellow outline, 3 px, slightly wobbly) around "Right now" at 0:38. Highlight on "Coming up" at 0:44. At 0:50 zoom 130% on the Source line, caption: "Every task cites a source." |
| **Transition** | Slow push-in (zoom 100% to 110%) during the scroll. Hard cut at the back tap. |

### Scene 5: Rooms and photo scan, the main demo (0:56 to 1:36)
| | |
|---|---|
| **Screen** | **Rooms** tab, then a photo scan. |
| **Josh's clicks** | 1. Tap **Rooms** tab. Show the cutaway Home map (hold 2 s, rooms start unchecked). 2. Tap **Living room**. 3. Tap **Scan a photo**. 4. On the consent screen, tap **Allow** (pause so the privacy text is readable for 2 s). 5. Tap **Use sample photo** (or use a pre-staged photo of a deliberately set-up demo corner: a tall dresser, no wall strap, a cord by a window). 6. Wait for the result. When pencil circles/boxes appear on the photo, hold 3 s. 7. Tap circle **1**, then circle **2**. 8. Tap **Add these to my plan**. 9. Tap **Rooms** tab and show the Living room now marked checked on the map. |
| **VO** | "Rooms start as 'not checked yet', because the app doesn't assume your home is unsafe. You can scan a photo, and the photo is shrunk and stripped of location data on your phone first. An AI model looks only for visible cues, like an unanchored dresser or a cord near a window, and circles them. Tap a circle to see what it found. Then those become tasks in your plan." |
| **Graphics** | 1:00 label on Home map: "Starts unchecked: no guessing". 1:10 callout on consent: "Photo is resized and stripped of location on-device". 1:22 pencil-style numbered tags redrawn larger over the circles (editor may add subtle animated draw-on). Subtitle at 1:30: "AI points. It does not give advice." |
| **Transition** | Cross-dissolve (0.3 s) between Rooms tab and scan. Hard cut on result. |

### Scene 6: How it's built (1:36 to 2:06), the technical beat
| | |
|---|---|
| **Screen** | Full-frame slide, no phone. **Editor builds a 3-box animated diagram** on the paper background. |
| **Diagram** | Left box: **Phone (React + TypeScript PWA)**, with items under it: "Resize + strip location", "Stores everything on-device (IndexedDB)". Middle box: **Serverless function (Vercel)**, items: "Hides the API key", "Rate limited, no photo stored". Right box: **Vision model (Google Gemini)**. Arrow phone to function to model, labelled "photo". Return arrow labelled "cues only". Below, wide bar: **Knowledge base: 17 hazards, each with CPSC / AAP / CDC sources**. A curved arrow from "cues only" to the knowledge base, labelled "the only place advice comes from". |
| **VO** | "Here's how it works. The app is React and TypeScript, installed as a PWA, and everything is stored on the phone. A small serverless function keeps the API key private and sends the photo to a vision model. The model can only report what it sees. All advice comes from a hand-built knowledge base of seventeen hazards, each tied to a public source, like the CPSC and the American Academy of Pediatrics. That way the AI never invents safety advice." |
| **Graphics timing** | 1:36 phone box draws in. 1:44 function box + arrow. 1:50 model box + arrow. 1:56 "cues only" arrow returns. 2:00 knowledge-base bar slides up from the bottom. Each element eases in over 0.4 s. Highlight "the only place advice comes from" in yellow. |
| **Transition** | Cut in from the scan scene on the words "Here's how it works". Cut out at 2:06. |
| **Verify before filming** | Josh confirms "17 hazards" still matches `src/kb/data` and that the sources named are truly cited in the data. Edit numbers to match reality. |

### Scene 7: Weekend planner (2:06 to 2:24)
| | |
|---|---|
| **Screen** | Back to phone frame. **Today** tab. |
| **Josh's clicks** | 1. Tap **Plan my weekend** (weekend card on Today). 2. Set time available to **2 hours** (use the slider/stepper). 3. Show the chosen tasks, the **supplies list** and the total cost. 4. Tap **Add to calendar** (the .ics download). Show the calendar sheet briefly, then dismiss. |
| **VO** | "Got two hours on Saturday? The weekend planner picks the best set of fixes that fit your time and budget, builds the shopping list, and drops it on your calendar." |
| **Graphics** | Callouts: "Fits your time", "Shopping list included", "Works with any calendar (.ics)". |
| **Transition** | Cross-dissolve in and out. |

### Scene 8: Recall check (2:24 to 2:38)
| | |
|---|---|
| **Screen** | **Gear** section. |
| **Josh's clicks** | 1. Tap **Gear**. 2. Tap **Add gear**, choose **Crib**, type a brand and model (use a sample that is safe to show; do not name a real brand in a negative light unless a real recall is shown). 3. Tap **Check all**. 4. Show the result (recall found or "no recalls found") and the **Source: CPSC** line. 5. Point at the car seat expiry field. |
| **VO** | "The gear shelf checks your crib, car seat, and high chair against the U.S. Consumer Product Safety Commission's recall database, and tracks car seat expiry." |
| **Graphics** | Logo-free text label: "Live data: CPSC recall database". |
| **Transition** | Hard cut in. Quick wipe out. |
| **Fallback** | If the live check fails during filming, re-record. Do not fake a result. |

### Scene 9: Everything else, fast (2:38 to 2:50)
| | |
|---|---|
| **Screen** | Four 2.5-second clips, each with a title chip, in this order. |
| **Josh's clicks** | A. **Height** tracker: tap **Height**, tap **Add measurement**, enter a value, tap save, show the doorframe marks. B. **Reminders**: open **Reminders**, show weekly re-check. C. Tap the red **Emergency** pill in the header, show Poison Help and 911 numbers, tap back. D. **Settings**: switch on **Easy mode**, then switch language to **Español**, show one screen in Spanish. |
| **VO** | "It tracks height on a doorframe, sets weekly re-check reminders, keeps emergency numbers one tap away, and has an easy mode and Spanish for grandparents and sitters." |
| **Graphics** | Title chips (small, top left of frame): "Height", "Reminders", "Emergency", "Easy mode + Español". |
| **Transition** | Quick slide cuts (0.2 s) between clips. |

### Scene 10: Close (2:50 to 2:58)
| | |
|---|---|
| **Screen** | Paper background with the logo. |
| **VO** | "GrowSafe is free, open source, and private. [WHY] Try it at growsafe-pi.vercel.app." |
| **Graphics** | Large URL text. Under it, small line: "Built with React, TypeScript, Vite, Vercel, Google Gemini, and the CPSC recall API. Built with Claude Code as an AI coding assistant." Under that: "Joshua Shen · TX-37 · 2026 Congressional App Challenge". |
| **Transition** | Slow fade to black over the last 0.5 s. |

## 4. VO timing check
Count the words in the final VO. At 150 wpm, 2:55 holds about 435 words. If over, cut Scene 9 first, then trim Scene 7. If under, hold the Scene 5 result longer.

## 5. Recording notes for Josh
- Turn on **Do Not Disturb**. Full battery. Clear the clock to show 9:41 if possible. Airplane mode off.
- Screen-record from iPhone (Control Center). Record each scene as a separate take, 5 s of spare time at both ends.
- Reset between takes: **Settings > Reset sample family** or reload so every take starts clean.
- Record voiceover separately in a quiet room, phone mic 6 inches from the mouth, then give the audio to the editor.
- Do not show any real photo of a child or a real address.

## 6. Editor checklist
1. Canvas 1920x1080, 30 fps. Phone footage centered, 540 px wide inside a minimal frame.
2. Colors: paper `#F4EFE4`, graphite `#2B2B2B`, pencil yellow `#F2C94C`. Red only on the Emergency pill.
3. Fonts: Barlow Semi Condensed 700 (headings), Atkinson Hyperlegible (body/captions).
4. Burned-in captions, white on a graphite bar, bottom 12 percent of the frame, never over the phone UI.
5. Check required on-screen items appear: names (Scene 2 and 10), app name (Scene 2), purpose (Scene 2), audience (Scene 2), tools (Scene 10 and the diagram in Scene 6).
6. Export H.264 MP4, under 3:00, loudness about -16 LUFS.
7. YouTube description: one-line summary, GitHub link (https://github.com/joshshend/growsafe), the live URL, music credit, and "Submitted to the 2026 Congressional App Challenge, TX-37".

## 7. Known open items
- Button labels above are as of the current build. T16 (tap-list UI) and T18 (Today) changed some screens. Josh should walk the flow once and correct any label before filming.
- Spanish text is machine-translated and unreviewed. Show it only for one second, and do not claim it is professionally translated.
- Do not claim the app is medical advice or replaces a pediatrician. The footer on every task already says this.
