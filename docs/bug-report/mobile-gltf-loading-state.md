# Pin rack stays invisible on later roll playbacks

**Status:** needs a platform fix, no local workaround
**Found:** 2026-10-07, updated 2026-10-17
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.29.1-35154657340.commit-e2bbcc9` (`dcl/package.json`)
**Client:** Decentraland mobile. Desktop build and client version were not captured.

## Summary

During a roll's playback, the pins sometimes never appear. Players see this after the first roll, and it is much more common on mobile. The ball, countdown, and camera still play.

The rack is created on every roll start. Each pin mesh is spawned at scale 0. The scale-in and the drop onto the deck run only from `GltfContainerLoadingState.onChange` when `currentState` is `LoadingState.FINISHED`. That listener does not receive the value already stored on the entity. It runs only when a later change arrives. If a later roll's cached pin model is already `FINISHED` before the listener is attached, or the client never sends another transition, the mesh stays at scale 0 for the whole replay. That looks like the pins were never spawned.

The scale-in is intentional and is still in the scene. Nothing was changed to hide or replace it.

An earlier note in this file guessed that the first roll was the one that failed and that a later cached spawn succeeded. That sequence was not logged. The player report is the later rolls.

## Steps

1. Open the scene on the Decentraland mobile client.
2. Start a game and bowl the first roll. Confirm the pins are visible during that replay.
3. Bowl the next roll and watch the pin deck during its replay.

## Expected

`GltfContainerLoadingState.onChange` fires with `currentState === LoadingState.FINISHED` for every pin spawn, including a spawn of a GLTF the client has already loaded. The scene then runs `Tween.setScale` from `Vector3.Zero()` to the pin's visual scale (`1.5`) and `Tween.setMove` from 2 m above the deck down to the rest pose (`dcl/src/client/laneVisuals.ts`, `setupPins`).

## What the scene does

`gameStateHandler.createLaneVisuals` builds a new `LaneVisuals` and calls `setupPins(data.pinStanding)` on every `NOTIFY_PLAYER_ROLL_START`, including the second roll of a frame. Standing pins are not skipped by the server after roll one unless that pin was actually knocked down.

Each standing pin is a parent entity at the drop start, and a child at scale 0 with the pin `GltfContainer`. The child subscribes to `GltfContainerLoadingState.onChange`. The scale-in and the drop are inside that callback, and only when `currentState` is `FINISHED`. There is no other path that reveals the mesh.

In `@dcl/ecs` `7.29.1`, `Component.onChange` only stores the callback (`lww-element-set-component-definition.js`). The callback runs later from `__onChangeCallbacks`, when a change is delivered. It is not invoked with the current value at subscribe time. The type comment says it triggers when the entity changed on the last tick.

The ball is created at scale 1 with no loading-state gate (`setupBall`), so a missed pin callback leaves the replay looking normal except for an empty deck.

The pin files are small scene content (`dcl/assets/models/pins/`, about 16–22 KB each), so a long download is unlikely to explain a failure that starts after the model has already been shown once. The same callback pattern is used for the countdown and score models.

## Suspected cause

On a later roll the pin GLTF is already cached. The mobile client either applies `LoadingState.FINISHED` before `onChange` is subscribed, or it does not emit a new transition for that cached spawn. The intro never starts, and the child stays at scale 0.

Desktop usually still delivers that transition on a later frame, so the same rack only fails sometimes.

This was not confirmed in the client. There is no log yet of the loading-state sequence on the pin child for roll 1 versus roll 2. A useful trace is `GltfContainerLoadingState.getOrNull` immediately after `GltfContainer.create`, then every `onChange` value until the replay ends, on both rolls.

## Fix that belongs on the platform

Every spawn of a scene GLTF should report `LoadingState.FINISHED` through `GltfContainerLoadingState.onChange`, including a spawn of a model the client has already loaded. A state applied in the same turn as `GltfContainer.create` should still be visible to a listener registered immediately after that create.

## Where to send this

SDK contract for the callback: [decentraland/js-sdk-toolchain](https://github.com/decentraland/js-sdk-toolchain/issues).

Mobile client behavior: the Explorer build that reproduced it. Desktop Explorer issues are [decentraland/unity-explorer](https://github.com/decentraland/unity-explorer/issues).
