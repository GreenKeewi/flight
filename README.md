# Cloudliner

A static, original 3D airline game for keyboard and browser. Fly a fictional coastal archipelago from South Bay to Northport, Ridgefield or Palm Reach. Every destination includes boarding, taxi, takeoff, route navigation, approach, landing, rollout, an arrival gate and a landing debrief. Optional autopilot flies the same simulation; any flight input returns manual control.

## Run

Serve this directory over HTTP, for example `python3 -m http.server 8202 --bind 127.0.0.1`, then visit http://127.0.0.1:8202 . No backend, account, microphone, network APIs, external font or CDN is required. Three.js 0.180.0 is vendored with its MIT license. The original generated menu illustration is labelled; gameplay uses real-time 3D geometry.

## Keyboard

- Arrow left/right: steer on the ground, bank to turn in flight. Release to level the wings.
- Arrow up/down: accelerate/brake on the ground, climb/descend in flight.
- W/S: set thrust up/down. Power stays set when released. Hold S for landing brakes.
- Space: optional autopilot. Any arrow or thrust input disconnects it.
- E: doors at the gate; C: cockpit/chase; M: sound; P or Escape: pause and help.
- G: ask the crew to fly a real go-around circuit and rejoin final approach.
- H: immediate safe recovery, with a 150-point score penalty. On the ground it lines up departure; airborne it sets up the selected arrival.
- R: restart confirmation, preserving the selected destination, conditions and practice mode.
- Tab/Shift+Tab, arrows and Enter: all menus, settings, buttons and links. No pointer required.

The default coastal hop is short and gentle. The highland route climbs past western peaks to an elevated airport; the island chain crosses coral lagoons to a tropical terminal. Optional Golden hour changes the atmosphere; Coastal breeze adds a gentle crosswind. Personal landing bests are stored on this browser per destination and condition.

The essential HUD shows the current task, next target, speed, altitude, autopilot and camera/pause controls. Approach height is measured above the selected runway, including on the cockpit display. Optional route map and additional instruments are in Pause, alongside lighter graphics and reduced motion.

Assistance includes automatic trim, gear and flaps, self-levelling wings, gentle takeoff rotation, a forgiving final flare, runway braking and recoverable approaches. G flies a circuit without a point penalty; H is an immediate safety reset. This is an arcade flight game.

## Test

`npm test` runs 22 deterministic mission and safety regressions. These include every route in every condition, elevated arrivals, wind correction, full go-arounds, manual flare, matching terrain collision and manual/crew guidance. `tests/smoke.cjs` checks keyboard menus, settings, cameras, restart, recovery and debrief in Chromium; its accelerated mission portion is identified explicitly. `tests/destinations-realtime.cjs` flies all three destinations with native keyboard actions and the normal animation loop, without simulation stepping or state mutation.

`window.flightTest` exposes production state and deterministic hooks for repeatable QA. Browser test reports distinguish accelerated scenario checks from actual normal-speed keyboard play. Browser scripts expect Playwright and Chromium at `/usr/bin/chromium`, as provided by the cloud QA environment. These are test tools and are not shipped to players. See `VALIDATION.md` for evidence and limits.

The All games links point to https://greenkeewi.github.io/games/ . Existing taxi projects are separate and untouched.
