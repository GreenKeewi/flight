# Cloudliner validation

## Current reproducible evidence

The current release record is maintained in the [games hub verification directory](https://greenkeewi.github.io/games/verification/). Its release manifest records repository commits, runtime hashes, exact-commit Pages build/deploy results, and the public-origin access limitation separately.

Independent cloud Chromium QA completed all three destinations with native keyboard controls and the normal animation loop. No aircraft-position writes, simulation stepping, H recovery or G go-around were used in these flights. The crew autopilot flew the taxi, takeoff, route, approach, landing, rollout and arrival taxi; E opened the arrival doors to complete each trip.

| Destination | Wall seconds | Safety recoveries | Landing score |
| --- | ---: | ---: | ---: |
| Northport / coastal | 418.73 | 0 | 474 / 500 |
| Ridgefield / highland | 412.30 | 0 | 476 / 500 |
| Palm Reach / islands | 397.39 | 0 | 475 / 500 |

All three browser flights used Clear coast. Cockpit/chase, frozen pause time, native menu selection, manual input disconnecting autopilot, and restart confirmation were also checked. No JavaScript errors were recorded. These are automated keyboard cloud-browser results, not human or physical-device assessments.

The [full flight report](https://greenkeewi.github.io/games/verification/reports/current/flight-qa.json) and [control confirmations](https://greenkeewi.github.io/games/verification/reports/current/controls-confirm.json) are published with the hub. These runs tested runtime commit `f99a43b2d5150481e1e2e89e6fa0da0b2f44921a`; this validation update changes documentation only. The hub's runtime hashes make that relationship explicit.

## Regression commands

`npm test` runs 22 deterministic simulation and safety regressions, including all destinations and weather conditions, manual/crew guidance, wind correction, elevated approaches, go-arounds, terrain collision and manual flare. `tests/destinations-realtime.cjs` is a separate normal-animation keyboard runner. `tests/smoke.cjs` includes explicitly accelerated scenario checks; those do not establish real-time trip completion.

Previous versions of this document referenced additional manual-flight, audio, visual and context-loss reports stored only in another workspace. Those unavailable reports are not the basis of the current release's verified claims. The relevant scripts remain available for reproduction; only accessible evidence linked above is asserted here.

## Publication and limits

Repository publication and successful GitHub Pages jobs can be verified by exact commit. Direct HTTPS game loads from this cloud currently fail at its proxy with `CONNECT tunnel failed, response 403` / Chromium `net::ERR_TUNNEL_CONNECTION_FAILED`. Local browser success and Pages deployment success therefore do not constitute a successful live-origin gameplay test.

The renderer uses cloud Chromium and software WebGL. No physical Chromebook frame rate, human speaker/headphone listening, fully manual browser route, separate-device Wi-Fi or physical control testing is claimed. This is a static single-player arcade flight game, with automatic trim/gear/flaps and recoverable approaches.
