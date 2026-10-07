# Mobile pin rack stays invisible on the first roll

**Status:** needs a platform fix, no local workaround
**Found:** 2026-10-07
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.29.1-35154657340.commit-e2bbcc9` (`dcl/package.json`)
**Client:** Decentraland mobile. Desktop build and client version were not captured.

## Summary

On mobile, the bowling pins do not show during the first roll's replay. They show on the second roll. The rack's intro is a scale-in from 0 plus a drop onto the deck. That intro starts only after `GltfContainerLoadingState` reports `LoadingState.FINISHED` on the pin mesh. If that callback never arrives for the first spawn, the mesh stays at scale 0 and the intro never plays. The second roll uses the same GLTF after it is cached, and the pins appear.

The scale-in is intentional and is still in the scene. Nothing was changed to hide or replace it.

## Steps

1. Open the scene on the Decentraland mobile client.
2. Start a game and bowl the first roll.
3. Watch the pin deck during that replay.
4. Bowl the next roll and watch the deck again.

## Expected

`GltfContainerLoadingState.onChange` fires with `currentState === LoadingState.FINISHED` when the pin GLTF is ready, including the first time that model is spawned in the session. The scene then runs `Tween.setScale` from `Vector3.Zero()` to the pin's visual scale (`1.5`) and `Tween.setMove` from 2 m above the deck down to the rest pose (`dcl/src/client/laneVisuals.ts`, `setupPins`).

## What the scene does

Each standing pin is a parent entity at the drop start, and a child at scale 0 with the pin `GltfContainer`. The child subscribes to `GltfContainerLoadingState.onChange`. The scale-in and the drop are inside that callback, and only when `currentState` is `FINISHED`. There is no other path that reveals the mesh.

The pin files are small scene content (`dcl/assets/models/pins/`, about 16–22 KB each), so a long download is unlikely to be the whole story. The same callback pattern is used for the countdown and score models.

## Suspected cause

The mobile client is not delivering `FINISHED` for the first `GltfContainer` spawn of a pin model, so the intro never starts. A later spawn of the cached model does deliver it.

This was not confirmed in the client. There is no log yet of the loading-state sequence on the pin child for roll 1 versus roll 2. A useful trace is every `GltfContainerLoadingState` value on that entity from `GltfContainer.create` until the replay ends, on both rolls.

## Fix that belongs on the platform

The first spawn of a scene GLTF should report `LoadingState.FINISHED` through `GltfContainerLoadingState.onChange` the same way a later spawn does.

## Where to send this

SDK contract for the callback: [decentraland/js-sdk-toolchain](https://github.com/decentraland/js-sdk-toolchain/issues).

Mobile client behavior: the Explorer build that reproduced it. Desktop Explorer issues are [decentraland/unity-explorer](https://github.com/decentraland/unity-explorer/issues).
