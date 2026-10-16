# Validation — 16 October 2026

- `npm test`: 13 deterministic regressions pass. Covers full gate-to-gate autopilot at 60/30/20/10 Hz, boarding locks, manual ground controls, W-only takeoff, manual autopilot override, pause, landing practice, safe touchdown, missed approach, terrain/water recovery and world boundaries.
- A complete real-time Chromium flight used native keyboard actions and the normal animation loop, with no state mutation or accelerated stepping: gate → taxi → takeoff → climb → all five route points → approach → touchdown → rollout → arrival taxi → gate → doors → results. 281.9 wall seconds; 278.37 simulation seconds at the parked checkpoint. Zero recoveries and zero browser/resource errors; landing score 428/500, final score 1428.
- Independent browser QA flew a manual landing from the native landing-practice menu, autopilot off throughout, using actual arrow and thrust keys without state mutation or accelerated stepping. Touchdown after 32.22 simulation seconds, x=700 m, z=-9455 m, zero recoveries, score 311/500. Actual S braking then reached arrival taxi. Autopilot taxi was subsequently checked with accelerated production-physics stepping, then E opened doors and completed the flight.
- Fresh browser smoke checks pass native Tab/Enter menu navigation, gate/practice starts, cockpit/chase, autopilot override, pause freeze, accessible graphics settings, Escape from checkbox focus, restart cancellation/confirmation, main-menu return, results navigation, fly again and All games links. Full-physics accelerated mission checks supplement real-time play.
- Visually inspected actual gameplay at 1366×768, 1280×720, and menu layout at 700×600. Fixed winglet pivots, cockpit/HUD/dialog stacking, missing diagonal arrow glyphs and slow-frame modal focus. Static scenery batching reduced observed cruise draw calls from 280 to 111. Lighter graphics is available in Pause.
- Menu artwork is original generated illustration. `assets/gameplay.webp` is an actual screenshot from the real-time game, not the illustration.

## Limits

Browser testing used this cloud environment's Chromium software renderer, not a physical Chromebook. The game requires WebGL 2 and a keyboard; no physical-device frame-rate or audible speaker/headphone assessment is claimed. The flight model is assisted arcade flight, with automatic gear/flaps and recoverable approaches. No backend or multiplayer exists in this single-player game. GitHub Pages publication and live-origin checks are coordinated by the parent task.

Local screenshots and machine-readable reports are stored under `evidence/` and the independent QA project. They are not needed to run the static game.
