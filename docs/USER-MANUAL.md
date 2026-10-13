# Layout Studio — visual user manual

[Project overview](../README.md) · [Offline interactive demo](../demo.html)

Start with the numbered picture guide. Each number identifies the exact highlighted control. Work through one step at a time; the longer reference is below it.

### Actual tool · controls at a glance

Actual application screenshot. Numbered boxes point to the controls described below. The plan and devices are fictional.

![Layout Studio — numbered controls](images/guide-1.jpg)

1. **Find furniture.** Search the library, then click an item to add it to the selected room.
2. **Size and orient it.** Edit dimensions, rotation and mirror options for the selected sofa.
3. **Keep an editable copy.** Export JSON preserves the layout; Export image creates only a picture.

### Actual tool · controls at a glance

Actual application screenshot. Numbered boxes point to the controls described below. The plan and devices are fictional.

![Layout Studio — numbered controls](images/guide-2.jpg)

1. **Choose two facing walls.** Between walls lets the gap drive the geometry; select reference and moving wall.
2. **Move the label only.** Move names repositions room text without changing walls.
3. **Protect a finished room.** Lock room dimensions before changing neighbouring geometry. Resolve Overdefined conflicts instead of forcing them.

### Try the working offline example

Screenshot of this project’s interactive demo. Side-by-side services are explicitly simulated.

![Layout Studio — numbered controls](images/guide-3.jpg)

1. **Move the selected device.** Choose another room or drag its marker on the plan.
2. **Try a device action.** Toggle the lamp and watch its dummy HA state change.
3. **See the other side.** The friendly name, room, position and state update together in dummy HA.

## Detailed task reference

### Tour the workspace

1. Open the plan and locate the mode controls, map canvas and selection inspector. Choose Desktop, Mobile or Auto to suit your screen.
2. Use the fit/reset view control to see the complete plan. Zoom or rotate the view before selecting a small object. These controls change the camera, not the dimensions.
3. Select one room to inspect it. Select furniture to see its own dimensions and orientation. Clear the selection before starting a different operation.

### Set the distance between two walls

1. Enter Edit rooms and choose Between walls / Select two walls. Select the complete first wall run, then the facing parallel wall.
2. Choose which wall is the reference. Use Swap reference when the other side should stay fixed. Enter the required gap in centimetres and apply it.
3. Check the updated outline and neighboring rooms. The dimension drives geometry; typing a number is not merely adding a text label.
4. If Overdefined appears, inspect existing driving dimensions, locked rooms and collinear relationships. Release or edit the conflicting constraint, then retry. Do not add a second incompatible dimension over the first.
5. When the room is correct, select Lock room dimensions. Unlock it deliberately before a later shape or size change. A locked room can still be renamed, translated and furnished.

### Furnish a room and keep a portable copy

1. Select a furniture type, add it, then use the inspector to set width, depth and rotation. Mirror a handed sofa or similar item when needed.
2. Move the furniture on the canvas. For several objects, box-select them and check the selection before dragging. In the connected editor, selected device markers belong to the move as well.
3. Move the room name if it obscures furniture. Its label position is independent of the room outline.
4. Choose Export JSON to retain an editable copy. Use Open layout to restore that file. An exported image is a picture, not an editable backup.

### Place and maintain HA devices — connected edition

1. Open Devices and refresh the HA list. Use the unplaced-device filter to find devices that do not yet have a marker.
2. Select a device, enter placement mode and tap the intended point on the plan. Review the marker before saving its position; on a phone, zoom first instead of trying to hit a tiny room.
3. Choose a representative icon and review the room assignment. A marker outside all rooms is allowed; do not assume it has changed the HA area.
4. Use Device Sheet to edit friendly names. Distinguish multiple entities of one physical device from actual duplicate integrations; do not delete entities just because their names look similar.
5. Save to NAS and inspect the HA-sync result. A successful NAS save and a successful HA update are separate outcomes; investigate a reported HA error before assuming both finished.

### Use the plan in Home Assistant — connected edition

1. Open the Floor Plan dashboard. Tap a device to open the controls associated with that physical device.
2. Tap a room condition tile to enter its room view, then use the room navigation to move to another room or return to the full plan. Missing humidity means the room needs an available humidity entity, not a fabricated reading.
3. Use the map’s move-device mode before dragging a marker to another room. Save the placement and confirm that Layout Studio shows it after refresh.
4. Use the explicit refresh control when the card is stale. Rotate/zoom the view with visible controls; supported mobile builds also accept two-finger gestures.

## Keep your work

Standalone: browser-local draft plus explicitly exported JSON. Connected edition: a shared NAS draft, with a separate HA synchronization step. Keep JSON exports before major geometry changes. Browser storage, a screenshot and the Git source backup do not replace a backup of the saved NAS design.

## If something looks wrong

- Dimension rejected: check locks and earlier dimensions, then change the conflicting relationship rather than forcing it.
- Device absent: refresh HA discovery and check availability and the unplaced filter.
- HA Configuration error: inspect the card/resource error and installed assets; repeated cache resets are not a substitute for fixing a broken resource.
- Lost view: fit/reset the camera before changing geometry.

## What this manual does not promise

The standalone package has no working NAS login, HA discovery/sync, device sheet, automation publishing or live environmental readings. This guide documents those connected workflows for the hosted installation, not as capabilities of the standalone download. A clean HA installation and real-phone gestures have not been revalidated in this documentation update.

Screenshots show the actual application where captured. The offline demo is a deliberately smaller simulation and identifies its dummy services. It never controls devices, sends notifications, uploads files or launches printing.
