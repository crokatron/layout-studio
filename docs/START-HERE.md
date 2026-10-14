# Layout Studio: start here

**Continuing this tool? Read [the detailed handover](HANDOVER.md).** For pictures and operation, use the [manual](USER-MANUAL.md) and [offline demo](../demo.html).

Rooms, driving wall dimensions, locks and furniture editing; the packaged standalone edition exports JSON. Connected HA discovery, room tiles and automation publishing belong to the NAS edition.

**Start with:** Tour the workspace. Open the plan and locate the mode controls, map canvas and selection inspector. Choose Desktop, Mobile or Auto to suit your screen.

**Source:** this is a private source checkpoint, not a live-system mirror. Check [the source manifest](../SOURCE-MANIFEST.json) and current working files before merging.

**Keep your work safe:** Standalone: browser-local draft plus explicitly exported JSON. Connected edition: a shared NAS draft, with a separate HA synchronization step. Keep JSON exports before major geometry changes. Browser storage, a screenshot and the Git source backup do not replace a backup of the saved NAS design.

**Next maintainer action:** Retest a wall-pair dimension, locked-room conflict, mirrored furniture and device movement in fixtures; separately establish a clean HA setup before claiming connected portability.

**Status:** private upload verified on 14 October 2026. These guides accompany the private source package. Live runtime, data backups and full recovery were not retested. Public release needs separate approval.
