# Optional route map orientation — 2026-10-16 UTC

Baseline commit `a9268309f30e1ac8286a34d0c048cc5862dbdf5d` inverted north/south in the optional map. The simulation defines north as decreasing Z (`z -= cos(heading) * travel`) and the aircraft icon points upward at heading zero, but the old map moved decreasing Z downward. The fix changes only the canvas Y projection and refreshes the game-script cache URL; physics, route data and icon rotation stay unchanged.

`baseline.json` confirms the inversion on all three routes in an actual local Chromium canvas. `map-browser.json` passes all 12 route/cardinal cases after the fix. Observational Canvas2D wrappers record actual drawing calls without modifying their arguments or results. Declared route, position and heading fixtures make north/south/east/west movements repeatable. Northbound movement decreases canvas Y, eastbound increases X, and the symbol rotation agrees. The real start/pause/map-checkbox flow uses native keyboard input. Screenshots show actual map-enabled local gameplay using those explicit fixtures; they do not claim whole-trip manual completion.

`unit-final.txt`: 22 existing flight simulation/safety tests pass. The earlier full native-key destination flights remain historical evidence for the unchanged flight simulation, linked from VALIDATION.md. No new gate-to-gate trip is claimed for this map-only edit.

Reproduce with a local HTTP server and Playwright/Chromium:

```sh
python3 -m http.server 8202 --bind 127.0.0.1
FLIGHT_URL=http://127.0.0.1:8202/ QA_OUTPUT_DIR=/tmp/flight-map node tests/map-browser.cjs
```

Cloud public-origin access remains blocked by the proxy (CONNECT HTTP403 / browser ERR_TUNNEL_CONNECTION_FAILED). Exact Pages deployment is checked separately. No physical Chromebook, native LAN or Wi-Fi claim. Hub metadata updates are deferred to its current owner.
