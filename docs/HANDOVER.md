# Layout Studio: maintainer handover

[One-screen summary](START-HERE.md) · [User manual](USER-MANUAL.md) · [Feature overview](../README.md) · [Recorded validation](../VALIDATION.md)

## Purpose and behaviour to preserve

A visual floor-plan editor for drawing rooms, setting driving dimensions and arranging furniture. The NAS edition also connects that plan to Home Assistant: devices belong to rooms, room tiles show conditions, and the same layout becomes an interactive control surface. This repository includes the generic standalone editor; the connected NAS implementation remains in the private source backup. The manual distinguishes the two so a reader knows what will actually work in each edition.

- **Rooms and walls:** Edit outlines, add internal walls, rename rooms and move name labels separately. (Both editions.)
- **Driving dimensions:** Select facing walls and enter their separation; geometry changes to match. Existing horizontal/vertical relationships are retained. (Both.)
- **Collinear walls and room locks:** Align wall runs, then lock a finished room’s dimensions. Conflicting constraints produce an Overdefined error. (Both.)
- **Furniture:** Place furniture, adjust its size and rotation, and mirror asymmetric shapes. (Both.)
- **Map navigation:** Zoom, fit and rotate the map; choose Auto, Desktop or Mobile interface mode. View rotation does not change the room dimensions. (Both.)
- **Devices and Device Sheet:** Read HA devices, place markers, choose icons and rename records; markers may be outside room boundaries. (Connected NAS.)
- **Room conditions and detail views:** Position editable room tiles for readings such as temperature and humidity, and open the room detail controls. (Connected NAS.)
- **Automations and Buttons:** Separate editors for automation triggers/conditions/actions and per-press button assignments. (Connected NAS.)
- **HA floor plan:** Control devices and move their markers back into the shared layout; mobile gestures depend on the installed HA card version. (Connected NAS.)

The [demo](../demo.html) is a smaller, labelled simulation with fictional data. It explains cause and effect without the real service; it is not evidence of a working production installation. Numbered screenshots in the user manual distinguish actual-app captures from demo captures.

## Files and sources of truth

| Actual package path | Maintainer role |
| --- | --- |
| [layout-builder/model.js](../layout-builder/model.js) | State model and generic seed |
| [layout-builder/constraints.js](../layout-builder/constraints.js) | Dimension constraints |
| [layout-builder/wall-pairs.js](../layout-builder/wall-pairs.js) | Paired-wall operations |
| [layout-builder/ha-floor-card.js](../layout-builder/ha-floor-card.js) | HA renderer source; requires connected installation |
| [demo-source](../demo-source) | Editable demo HTML/CSS/runtime and embedded screenshot tour |
| [SOURCE-MANIFEST.json](../SOURCE-MANIFEST.json) | Original copied-source paths and SHA-256 checkpoint values |

The original working source is under C:/Users/lamon/Desktop/AI TOOLS/NAS for NAS modules; adjacent CAD/watch source locations are recorded by the full backup’s reviewed source manifest. This package contains only the explicitly copied source, not an automatic mirror. The main private nas-projects backup retains the broader shared host context. This package deliberately uses a generic standalone layout instead of the private household plan. Connected NAS/HA feature documentation does not mean those services run in this standalone edition.

## Setup, run and tests

Run commands from this repository root unless a `cd` is shown. Use a disposable checkout and fictional data for first setup. Dependencies, SDKs, signing material and personal data are not bundled. The following are continuation instructions grounded in the retained source, **not commands executed or newly certified by this handover**.

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

/layout-builder/

Selected project check:

```powershell
node --test layout-builder/device-room-moves.test.cjs layout-builder/placement-geometry.test.cjs
```

For the documentation demo alone, serve this repository on loopback with `python -m http.server 8765 --bind 127.0.0.1` and open `/demo.html`. Choose a free port if another preview is running. JavaScript syntax can be checked with `node --check demo-source/runtime.js`. `python demo-source/rebuild.py` rewrites demo.html, so run it only in a disposable checkout or an authorised demo-editing session. A local server cannot provide missing HA/CAD/NAS functions. Inspect browser tests for installed dependencies, fixture requirements and network targets before running them with the approved browser tooling.

## Data, configuration and backup boundaries

Standalone drafts live in browser storage and exported JSON. Connected draft ownership belongs to the current NAS design API and its ETag; HA OAuth remains in protected NAS configuration. Never promote the generic seed as a household design.

Standalone: browser-local draft plus explicitly exported JSON. Connected edition: a shared NAS draft, with a separate HA synchronization step. Keep JSON exports before major geometry changes. Browser storage, a screenshot and the Git source backup do not replace a backup of the saved NAS design.

Git preserves reviewed source and documentation. It does not copy browser storage, application databases, uploaded models/photos, accepted device settings, SDKs or credentials. Maintain independent recovery copies of the data identified above, including matching configuration and asset versions. Never add real secrets to examples, issues or logs. Private source copies on GitHub are not proof of a complete NAS/offsite data backup.

## Current verification and Git state

Before these documentation edits on 14 October 2026, this package was clean on branch `main` at `fab1f5b0b4138c003eb1d355b9ffa6cb1efbac75` and its private upload was verified. All 79 manifest-listed source entries matched their stored checksums before editing. The upload follow-up has completed all 17 repositories and is paused; it does not run this tool or back up its live data.

These handover pages and README links accompany the source package. Preserve them when continuing; stage only reviewed changes. Recheck current `git status --short --branch` and `git diff` before starting. No project-specific background schedule was inspected or changed in this documentation pass. Any service schedules in older notes are historical claims to verify in the actual deployment.

Earlier package checks and limits are recorded in [VALIDATION.md](../VALIDATION.md). This handover adds documentation/link/whitespace/secret and source-preservation checks only. No current NAS release, real hardware state, fresh installation, complete data restoration or offsite-backup freshness was verified here.

## Recovery approach

1. Preserve the current installation/data before changing it. Identify the exact code commit and data snapshot required; do not assume this package matches the running service.
2. Recover source into a new folder. Verify the source manifest and restore the project-specific configuration/assets described above separately. Recreate dependencies from the retained project files and guides.
3. Restore user data into an isolated instance or clean test browser. Check a representative editable record, associated files and save/reload behaviour, then compare to the original. Do not test recovery by overwriting production.
4. Record what actually restored and what remains missing. A demo opening or a passing syntax check is not a production recovery drill. Real deployment/device actions need the existing authorised workflow.

## Known limits and next work

The standalone package has no working NAS login, HA discovery/sync, device sheet, automation publishing or live environmental readings. This guide documents those connected workflows for the hosted installation, not as capabilities of the standalone download. A clean HA installation and real-phone gestures have not been revalidated in this documentation update.

**Priority:** Retest a wall-pair dimension, locked-room conflict, mirrored furniture and device movement in fixtures; separately establish a clean HA setup before claiming connected portability.

Common symptoms to check for this tool:

- Dimension rejected: check locks and earlier dimensions, then change the conflicting relationship rather than forcing it.
- Device absent: refresh HA discovery and check availability and the unplaced filter.
- HA Configuration error: inspect the card/resource error and installed assets; repeated cache resets are not a substitute for fixing a broken resource.
- Lost view: fit/reset the camera before changing geometry.

Keep [the release checklist](../RELEASE-CHECKLIST.md) and [third-party notes](../THIRD-PARTY.md) with the package. Original contributions use MIT; bundled/upstream code and assets keep their own licences. Public publication is a separate decision; preparing documentation is not permission to publish.
