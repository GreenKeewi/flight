# Validation — 16 October 2026

## Production simulation

`npm test`: 22 regressions pass, preserving the original 13 mission/control/safety checks and adding nine feature checks. The new checks exercise all three destinations in all three conditions from gate to gate, elevated field touchdown and parking, actual high/low/off-centre go-around circuits with manual override and crew re-engagement, unassisted final flare, visible highland terrain collision, runway-relative coaching, arbitrary airport-coordinate transforms, validated selections, deterministic wind, and early touchdown/braking followed by manual taxi reacceleration at all three airports. No automatic safety recoveries occur in the destination or go-around matrices.

Independent QA also completed an 18-case matrix covering every destination/condition combination, both directly and after a deliberate four-leg go-around. All reached their selected arrival gates with zero automatic recoveries. Landing scores were 469–476/500.

## Actual browser play

All three destinations completed with native keyboard actions and the normal requestAnimationFrame loop, without state mutation or accelerated stepping: close doors → four departure taxi points → takeoff → every selected route point → approach → touchdown → rollout → arrival taxi → correct gate → open doors → debrief. Every journey had zero automatic recoveries and zero browser/resource errors.

| Destination / conditions | Wall seconds | Simulation seconds | Landing /500 |
| --- | ---: | ---: | ---: |
| Northport / Clear coast | 312.899 | 258.78 | 474 |
| Ridgefield / Golden hour | 415.381 | 356.35 | 476 |
| Palm Reach / Coastal breeze | 410.731 | 373.88 | 474 |

Software-GPU contention with concurrent independent QA slowed wall time; these are not hardware frame-rate measurements. Reports and phase screenshots are in `evidence/destinations-realtime/`. A further full Palm Reach / Coastal breeze journey on the frozen runtime exercised the deliberate native-keyboard go-around: after the complete departure and route, Up/Right inputs created a high, off-centre approach (recorded 253 m lateral offset, 250 m height). G flew all four circuit legs, a flight input briefly overrode the crew, Space re-engaged it, and the aircraft rejoined final, landed and reached the gate. It completed in 590.161 wall / 521.33 simulation seconds, with one go-around, zero safety recoveries/errors, landing 469/500 and score 1469. G incurred no score penalty. Full positions/progress and actual screenshots are in `evidence/goaround-realtime/`.

An independent automated keyboard pilot completed the entire default route with autopilot off through native keyboard inputs and normal animation, with no state mutation or stepping: all four departure taxi points, takeoff, all five route points, manual approach/flare/braking, all four arrival taxi points and E at the gate. The flight used no autopilot, G or H; assisted air time was zero. It took 346.33 simulation seconds / 432.80 wall seconds under concurrent software rendering, with zero recoveries, a 430/500 landing, 8.37 m centreline offset and 1.66 m/s sink rate. Overall score 1430. Report: `/workspace/qa/reports/flight-complete-manual.json`. The first harness attempt held a turn key during screenshot capture; its evidence is retained, and the corrected driver releases keys before captures.

The fresh final browser smoke passed native destination/condition selection, elevated landing practice, cockpit/chase and essential HUD behavior, pause freeze, optional graphics/map/instruments, restart cancel/confirm with practice/route/condition preservation, G/manual override/crew re-engagement/H, and an explicitly accelerated production-physics gate-to-gate fixture with the correct destination debrief, saved best and result menu. Report: `evidence/smoke/report.json`.

A labelled early-touchdown browser fixture independently verified the repaired braking edge case: after staging only the initial legal touchdown pose, native S stopped the aircraft before the exit and native W accelerated it onward in Arrival, with autopilot off and no recovery. All three destination regressions also pass.

Native keyboard QA also injected WebGL context loss: controls and restart stay blocked, simulation time freezes, resources restore, and the flight stays paused with Resume focused until the player chooses to continue. The unsupported-WebGL panel independently passed native Retry focus, Tab navigation to All games, focus wrap and Enter reload. The fresh independent UI/context retest is `/workspace/qa/reports/flight-route-ui-context-v2.json`; the unsupported-WebGL report is `evidence/no-webgl/report.json`.

The production procedural audio module passed native Chromium signal analysis at an exact matching source hash: idle RMS 0.0135, high power 0.0566, cockpit 0.0373 and maximum overlapping-transient peak 0.242, with finite signals, no clipping and no browser errors. Muted and inactive queued effects settled to zero. This module-state fixture created no 3D scene and does not claim human listening validation; actual keyboard sound/pause wiring was checked separately.

## Visuals and performance

Actual gameplay has been inspected at 1366×768 and 1024×600, with smaller-menu and Chromebook layouts checked independently. Terrain winding/lighting, coastline shallows, aircraft wing/nacelle detail, real 3D cockpit displays and human-scale airport scenery were revised. The essential HUD hides duplicate cockpit telemetry; approach height matches the selected runway elevation. Optional map and instruments, lighter graphics and reduced camera motion are available in Pause.

Observed software-renderer draw calls vary with camera and visible scenery: the completed coastal journey recorded 70–167 across phases, with cruise observations around 112–123 and a separate cockpit observation 110. The earlier smaller world recorded 111 at cruise. These values describe render work, not physical Chromebook frame rate. The final runtime also shares one runway texture/material across the four fields, removing three duplicate large textures (about 32 MiB estimated storage including mipmaps).

The menu image is an original generated illustration and is labelled accordingly. Gameplay screenshots are captured from the actual 3D game. Local evidence and reports are stored under `evidence/` and the independent `/workspace/qa` project; neither is required to run the static game.

## Limits

Testing uses this cloud environment's Chromium software renderer. No physical Chromebook performance, physical-device control assessment, or human speaker/headphone listening review is claimed. The game requires WebGL 2 and a keyboard. It is an assisted arcade flight model with automatic gear/flaps and recoverable approaches. This passenger game is single-player, static and backend-free. GitHub Pages publication and exact live-origin verification are coordinated by the parent task.
