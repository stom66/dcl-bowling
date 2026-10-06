# UI buttons only register about half of stationary clicks

**Status:** diagnosed, local workaround applied, kit patch not yet published  
**Found:** 2026-10-03  
**Scene:** Fastlane (`dcl/`), SDK `7.29.1-35154657340.commit-e2bbcc9`  
**UI kit:** `@stom66/dcl-ui-component-kit` `0.2.5` (`github.com/stom66/dcl-ui-component-kit`)  
**Client used for diagnosis:** Decentraland Explorer with the Unity Explorer MCP, parcel `0,0`, screen `1920×1057`

## Summary

After the lane lobby UI was added, clicks on scene buttons became unreliable. The failure is on every `ButtonText` and `ButtonImage`, including the large Mute toggle. Sitting still on Mute and clicking, without moving the mouse, succeeds about half the time.

Two kit bugs stack:

1. Desktop buttons only run `callback` on mouse-up when a hover flag is still set. A single frame where a child glyph wins the ray sends `onMouseLeave`, clears that flag, and the mouse-up throws the click away.
2. react-ecs does not mark a box as a pointer target just because it has `onMouseDown`. `pointerFilter` defaults to `PFM_NONE`. Only an explicit `pointerFilter: "block"` is pickable. Decorative children (icons, atlas glyphs, spinners) are separate rectangles on the same pixels, so the ray flips between the button and the glyph.

A third kit issue makes hidden panels dangerous: `ZoneType.Default` layers are wrapped in a 100% × 100% shell that stays mounted, and that shell is an invisible hit target over the rest of the HUD.

The durable fix belongs in the UI kit. A copy of it is already applied under `dcl/node_modules/@stom66/dcl-ui-component-kit`. `npm install` will wipe it until the kit is published and this scene bumps the dependency.

## Symptom

- Every kit button feels broken, not only the new lobby controls.
- Large targets fail too. Mute, Stats, Leaderboard, and Customize are 88×88.
- The mouse does not have to move. Repeated clicks on one pixel are a coin flip.
- When a click does land, the handler runs normally (mute toggles, panels open). The miss is in hit-testing and in the button's own click gate, not in the gameplay callback.

## What the problem was

### The hover latch

`ButtonText` and `ButtonImage` treated hover as proof that the pointer was still on the button. Hover is set in `onMouseEnter` and cleared in `onMouseLeave`. On desktop, `callback` ran only when mouse-up saw that flag still true. Mobile already fired `callback` on mouse-down and was unaffected.

Old desktop gate, both buttons:

```tsx
onMouseUp = {() => {
	if (!isMobile() && hoverStates.get(id) === true) callback?.()
	onMouseUp?.()
}}
```

That gate is wrong for this renderer. Mouse-up on the button already means the pointer is on that box. The hover flag is a second, stricter condition, and child quads clear it.

### Child quads cover the button center

Mute is `btn_mute_toggle` in `dcl/src/client/ui/themes/bowling/layers/topRightToggles.layer.tsx`. The button is 90px square with padding `top: 8`, `bottom: 22`. Inside it:

- a `Spinner` wrapping a 48×48 `Icon` (the speaker), centered
- an `IconString` label (`MUTE` / `Unmute`), absolute, along the bottom

The visual center of the button is the speaker, not empty padding. Each of those is its own `UiEntity` with a rectangular mesh the size of its `UiTransform`.

`getPointerFilter` in `@dcl/react-ecs` writes `PFM_NONE` unless `pointerFilter` is the string `"block"`:

```js
export function getPointerFilter(pointerFilter) {
	const value = pointerFilter ? parsePointerFilter[pointerFilter] : 0 /* PFM_NONE */;
	return { pointerFilter: value };
}
```

`onMouseDown` does not flip that to `PFM_BLOCK`. The protobuf default on `PBUiTransform.pointer_filter` is `PFM_NONE` as well. Explorer's UI picker only treats `PFM_BLOCK` elements as pickable.

[ADR-214](https://adr.decentraland.org/adr/ADR-214) says a UI entity without `PointerEvents` should be skipped and the event should bubble from the leaf to the first ancestor that has pointer events. This client does not do that cleanly. A non-pickable child over the button center stops the click ("nothing pickable at the point") instead of handing it to the button. The button and the glyph are coplanar, so on one stationary pixel the ray alternates. Whichever quad wins that frame gets the event.

Sequence for a missed click, mouse not moving:

1. A frame hits the button. `onMouseEnter` sets `hoverStates`.
2. A later frame hits the speaker. The button receives `onMouseLeave` and the flag becomes false.
3. Mouse-up hits the button again. The handler runs, sees hover false, and does not call `callback`.

If mouse-down or mouse-up lands entirely on the glyph, the button never sees that event either. The hover latch is what turns a one-frame flicker into a dropped click even when both the press and the release hit the button. That matches a 50/50 result with the cursor held still. A stable cover would fail every time. A stable pass-through would succeed every time.

The same gate is on every `ButtonText` and `ButtonImage`, which is why lobby buttons, HUD toggles, and image buttons all misbehave together. `ButtonImageClose` goes through `ButtonImage` and needs no separate change.

### Why it showed up with the lane lobby

The lobby did not cover Mute. `ZoneType.BottomCenter` is the bottom 25% of the screen, at 50% width. Mute is top-right. While the lobby is hidden, its system returns early.

What the lobby did add:

- Another set of `IconString` / `UiBox` quads in the one ReactEcs canvas (frame-count buttons, player row, start / cancel).
- While the lobby was visible, `lobbyProps.set` ran every frame. `PropsController.set` always emits, and `LaneStore.getLaneUserIds` returns a new array every call. The kit already documents that fresh object literals every frame leak and recycle ReactEcs entities across layers (`IconAtlasText` caches digit transforms for this reason). Recycled entities make an existing button's hit target flicker, so buttons that were already on screen started missing clicks too.

The customization catalog already had the local workaround: decorative icons inside a clickable cell set `pointerFilter="none"`, and the real target sets `pointerFilter="block"`. New lobby buttons and the HUD toggles did not.

### Full-canvas shells

`renderLayerShell` wraps every `ZoneType.Default` layer in a 100% × 100% absolute `UiEntity` so the zone can center its content. Stats, leaderboard, and customization use that zone. The kit comment on the function already says wrapping the other zones that way leaves an invisible hit target over the rest of the screen. The Default shell has the same shape, it stays mounted while the panel is hidden (`keepContentMounted`), and it had no `pointerFilter`.

Letterbox (`zIndex` 1500) and the version badge (`zIndex` 9999) are `ZoneType.FullScreen`, so they stretch edge to edge above the toggles (`zIndex` 600). Hiding both with `display: "none"` did **not** clear the cover on Mute's center, so they are not the Mute-center occluder. They are still fullscreen quads and should not be pickable. Their `pointerFilter: "none"` change stays in this scene, not in the kit.

## Steps taken to diagnose

Explorer MCP (`user-explorer`) against the running local scene. The player cursor stayed `Locked` for the whole session. `PointerLock.createOrReplace` on the root entity did not unlock it, and `set_camera_mode` `free` did not either. A bad intermediate bundle that still called `PointerLock` after the import was removed crashed the scene with `ReferenceError: PointerLock is not defined`. The camera was put back on `third_person` after that.

Tools that were useful:

| Check | Result |
| --- | --- |
| `ui_list` stack `sdk` | Mute is the leftmost 88×88 pointer target. Rect about `x=1395 y=8 w=88 h=88`, normalized center `(0.7495, 0.0492)`. Pointer events: down, up, hover enter, hover leave. Decorative children are absent from this list. |
| `ui_click` on that CRDT id, no `force` | `ok: false`. Reason: "another element covers the target at its center". `blockedBy`: "nothing pickable at the point". Same result after `pointerFilter: "block"` was added to the button. |
| `ui_click` with `force: true` | `ok: true`. Logs showed `SoundManager: toggleBgmMute`, then `applyBgmMuted: muted true`, then `ClientMessaging: requestSetPreferences`. The handler works when the event is delivered. That force click left BGM muted. |
| `ui_click` with `device: true` | Rejected. "The cursor is locked or panning, so pointer gestures cannot run." |
| `ui_drag` at the Mute center and at screen center `(0.5, 0.5)` | Both returned "nothing pickable". Empty space fails the same way while the cursor is locked, so drag is not evidence. |
| `click_at` at the Mute center | Raycasts the 3D world, not UI. It hit nothing. |

Ruled out:

- The lobby zone geometrically covering Mute. It is the bottom band, and the hidden path returns before updating props.
- Letterbox and the version badge as the Mute-center cover. `display: "none"` on both, rebuild, reload: the center was still "covered" by nothing pickable. Those `display: "none"` edits were reverted. Both layers now set `pointerFilter: "none"` instead.
- A full-size `pointerFilter: "none"` wrapper around the button's children. It covered the padding that used to be directly hittable. Removed.
- An absolute hit overlay as the last child, `pointerFilter: "block"`, background alpha `0` and then `1/255`. Explorer still reported the center covered. The listed rect also shrank (about 84×84 at `y=10` instead of 88×88 at `y=8`), so the overlay was not the full button. Near-zero alpha is not a reliable ray mesh. An opaque overlay would hide the icon. Removed.
- `ui_drag` as proof of what is under the cursor. Invalid while the cursor is locked.

What held:

- The occluder at Mute's center is non-pickable. That is the speaker `Icon` and the label glyphs, not another button.
- Delivering the button's own pointer events runs the real mute handler. The bug is which element wins the ray, plus the hover gate dropping the click after a flicker.
- `npm run build` in `dcl/` writes `bin/index.js` and then the npm process often stays running after "Type checking completed without errors". The bundle is already saved at that point. The dev watcher does not reliably rebuild edits under `node_modules`; an explicit build plus `reload_scene` was required. One file write per hot-reload cycle: a split save can load a mid-write bundle and crash the scene.

## Steps to confirm

### In Explorer, cursor still locked

This proves the cover and the handler. It does not prove a real mouse click.

1. From `dcl/`, `npm run build`. Wait until `Bundle saved` and typecheck finishes.
2. `reload_scene`, then `get_scene_state` until the scene is running, and `get_scene_logs` for a startup error.
3. `ui_list` with `stack: "sdk"`. Find the leftmost ~88×88 target at the top right (Mute).
4. `ui_click` that `crdtId` with `stack: "sdk"` and no `force`.
   - Before a full fix, expect `ok: false`, "another element covers the target at its center", "nothing pickable at the point".
5. `ui_click` the same id with `force: true`.
   - Expect `ok: true` and a mute toggle in the scene logs. Toggle again if you need BGM back on.
6. `get_player_state` and confirm `camera.mode` is `third_person` before stopping. Do not leave the camera in `free`.

`device: true` will keep failing until the Explorer cursor unlocks. Do not treat that as a scene bug.

### In the real client, cursor free

This is the check that matches the original report.

1. Publish or link the kit patch below, rebuild, and reload.
2. Stand where the HUD toggles are visible. Do not open the lobby first.
3. Put the cursor on the speaker icon in Mute. Do not move it. Click ten times.
   - Pass: every click toggles mute.
   - Fail: some clicks do nothing, with the cursor still on the icon.
4. Repeat on the padding around the icon, then on Stats, Leaderboard, and Customize.
5. Open a lane lobby. Click the frame-count buttons, Start, and Cancel the same way (hold still, several clicks).
6. Close the lobby and click Mute again. Hidden stats / leaderboard / customization shells must not start eating HUD clicks.

## Proposed solution

Ship this in `@stom66/dcl-ui-component-kit`. The scene-only notes at the end stay in this repo.

### 1. `ButtonText` — press latch, explicit block

File: `src/ui-component-kit/components/buttons/buttonText.tsx`

Add a press map beside the hover map. Hover stays responsible for the color tween only.

```tsx
const hoverStates  : Map<string, boolean> = new Map()
const pressedStates: Map<string, boolean> = new Map()
```

On the `UiBox`, set `pointerFilter="block"` **after** `{...props}`, so a caller cannot leave the hit target as `none`. Children stay direct children of that box.

```tsx
<UiBox
	{...props}
	pointerFilter = "block"
	onMouseEnter = {() => {
		hoverStates.set(id, true)
		tweenBackgroundColor(button, hoverColor)
		onMouseEnter?.()
	}}
	onMouseLeave = {() => {
		hoverStates.set(id, false)
		tweenBackgroundColor(button, defaultColor)
		onMouseLeave?.()
	}}
	onMouseDown = {() => {
		pressedStates.set(id, true)
		onMouseDown?.()
		if (isMobile()) callback?.()
	}}
	onMouseUp = {() => {
		// mouseUp only arrives if this box is under the pointer.
		// The hover flag drops when a glyph wins the ray for a frame.
		if (!isMobile() && pressedStates.get(id) === true) callback?.()
		onMouseUp?.()
		pressedStates.set(id, false)
	}}
>
	{children}
</UiBox>
```

### 2. `ButtonImage` — same latch on the inner box

File: `src/ui-component-kit/components/buttons/buttonImage.tsx`

Same `pressedStates` map. `pointerFilter="block"` goes on the **inner** `UiBox` (the one with the pointer handlers), after `{...props}`. The outer box is only layout (`position`, `zIndex`, overflow). Leave it alone.

```tsx
onMouseDown={() => {
	pressedStates.set(id, true)
	hoverStates.set(id, true)
	currentIndex.set(id, ButtonIndex.PRESS)
	onMouseDown?.()
	if (isMobile()) {
		callback?.()
		currentIndex.set(id, ButtonIndex.DEFAULT)
	}
}}
onMouseUp={() => {
	if (!isMobile() && pressedStates.get(id) === true) {
		callback?.()
		currentIndex.set(id, hoverStates.get(id) === true ? ButtonIndex.HOVER : ButtonIndex.DEFAULT)
	} else {
		currentIndex.set(id, ButtonIndex.DEFAULT)
	}

	onMouseUp?.()
	pressedStates.set(id, false)
}}
```

Hover still picks the atlas row and the scale tween. It no longer decides whether the click counts. If mouse-up arrives while the pointer has already left, the UV row returns to `DEFAULT` instead of staying on `HOVER`.

### 3. `renderLayerShell` — hidden shells leave the hit test

File: `src/ui-component-kit/index.tsx`

`ZoneType.Default` still needs the full-canvas flex parent. When the layer can hide and is fully hidden, that parent must be `display: "none"`. The shell itself is never the control, so it is `pointerFilter: "none"` even while the panel is open. Panel content sets its own filter.

```tsx
if (layer.zone !== ZoneType.Default) return nodes

const shellHidden = layer.canBeHidden && layer.visibility.isFullyHidden

return [
	<UiEntity
		key={layer.id}
		uiTransform={{
			width         : '100%',
			height        : '100%',
			positionType  : 'absolute',
			position      : { top: 0, left: 0 },
			display       : shellHidden ? 'none' : 'flex',
			pointerFilter : 'none',
			flexDirection : 'column',
			alignItems    : 'center',
			justifyContent: 'center',
			flexShrink    : 0,
			...(layer.zIndex !== undefined ? { zIndex: layer.zIndex } : {}),
		}}
	>
		{nodes}
	</UiEntity>,
]
```

### What not to add

- A full-size `pointerFilter: "none"` wrapper around button children. It becomes the top rectangle and steals the padding.
- A transparent or near-transparent hit overlay (`alpha` 0 or `1/255`) stacked above the icon. This client did not treat it as the pickable top hit, and a higher alpha hides the glyph.
- Assuming `onMouseDown` implies `pointerFilter: "block"`. In this react-ecs build it does not. Set `"block"` on the element that owns the pointer handlers.

### Scene changes that stay in this repo

These are not kit bugs. They are already in the working tree.

**Letterbox and version** — fullscreen zones above the HUD, marked non-pickable:

```tsx
uiTransform: {
	// ...existing layout
	pointerFilter: 'none',
}
```

`dcl/src/client/ui/themes/bowling/layers/letterbox.layer.tsx`  
`dcl/src/client/ui/themes/bowling/layers/version.layer.tsx`

**Lane lobby** — `dcl/src/client/ui/themes/bowling/layers/laneLobby.layer.tsx`

- Frame-count `UiBox` sets `pointerFilter="block"` and handles `onMouseDown` on that box.
- The `IconString` inside it sets `pointerFilter="none"`.
- Start / Cancel stay `ButtonImage` and pick up the kit latch.
- The system writes `lobbyProps` only when `phase`, `players`, `frameCount`, `endTime`, or `occupied` actually changes. The countdown still ticks because `body()` reads `Date.now()` every renderer frame.

```tsx
const samePlayers = players.join() === this.lobbyProps.get('players').join()

if (this.lobbyProps.get('phase') !== phase)         this.lobbyProps.set('phase', phase)
if (!samePlayers)                                   this.lobbyProps.set('players', players)
if (this.lobbyProps.get('frameCount') !== frames)   this.lobbyProps.set('frameCount', frames)
if (this.lobbyProps.get('endTime') !== endTime)     this.lobbyProps.set('endTime', endTime)
if (this.lobbyProps.get('occupied') !== occupied)   this.lobbyProps.set('occupied', occupied)
```

### Call-site pattern for a raw `UiBox` used as a button

Kit buttons will do this themselves. Anything hand-rolled should match the customization catalog and the lobby frame buttons:

```tsx
<UiBox
	pointerFilter = "block"
	onMouseDown   = {() => { /* action */ }}
>
	<IconString
		value         = "5 FRAMES"
		pointerFilter = "none"
	/>
</UiBox>
```

Put `"block"` on the element that owns the pointer handlers. Put `"none"` on glyphs that only draw. Do not require a hover flag on mouse-up.

## What this does not yet prove

Explorer, with a locked cursor, still reports Mute's center as covered by a non-pickable element after the press-latch change. That is the icon. A forced click runs the handler. A free-cursor click on the speaker, held still for several clicks, is the confirmation that is still outstanding.

The press latch fixes the case where mouse-down and mouse-up both hit the button but a frame in between hit the glyph. A click whose down or up lands only on the glyph still never reaches the button, until the client passes `PFM_NONE` children through to the `PFM_BLOCK` parent the way ADR-214 describes. Explicit `"none"` on those glyphs is the call-site half of that. It is already the protobuf default; setting it in the JSX makes the intent survive a later react-ecs change that auto-blocks any element with a background.

## Publishing

1. Port the three kit edits into `stom66/dcl-ui-component-kit` and publish.
2. Bump `@stom66/dcl-ui-component-kit` in `dcl/package.json`.
3. `npm install` in `dcl/`, then `npm run build`.
4. Run the free-cursor confirmation above.

Until that publish, the patched sources live only in `dcl/node_modules/@stom66/dcl-ui-component-kit`. They are not part of this git repo.
