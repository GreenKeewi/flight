# Cloudliner

A static, original 3D airline game for keyboard and browser. South Bay → Northport is a fictional coastal route. Complete boarding, taxi, takeoff, route navigation, approach, landing, rollout and arrival doors. Optional autopilot flies the same simulation; any flight input returns manual control.

## Run

Serve this directory over HTTP, for example `python3 -m http.server 8202 --bind 127.0.0.1`, then visit http://127.0.0.1:8202 . No backend, account, network APIs, camera, microphone, external font or CDN is required. Three.js 0.180.0 is vendored, with its MIT license. Menu illustration is original generated artwork, not a gameplay screenshot.

## Keyboard

- Arrow left/right: steer on ground, bank-to-turn in flight.
- Arrow up/down: accelerate/brake on ground, climb/descend in flight.
- W/S: thrust up/down; hold S for landing brakes.
- Space: optional autopilot. Any arrow or thrust input disconnects it.
- E: doors at gate; C: cockpit/chase; M: audio; P or Escape: pause.
- H: safe recovery (departure lineup on ground or safe final approach airborne).
- G: retry approach while airborne. R: restart confirmation.
- Tab/Shift+Tab and Enter: every menu, button and link. No pointer required.

Flight assistance includes automatic trim and gear/flaps, self-leveling wings, gentle rotation at flying speed, forgiving runway touchdown, and a recoverable missed approach. It is an arcade game, not a certified flight simulator.

## Test

`npm test` runs deterministic mission and safety regressions. `window.flightTest` exposes `state`, `snapshot`, `start`, `set`, `step(seconds, controls)`, `toggleDoors`, and `toggleAutopilot` for browser scenario checks. Automated time advancement uses the production simulation. Browser test evidence must distinguish scenario jumps from real-time keyboard play.

The published game links to https://greenkeewi.github.io/games/ . Existing taxi projects are separate and untouched.
