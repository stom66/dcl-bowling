# Pin rack stays invisible on mobile when the scale-in waits for load

**Status:** workaround in the scene. Desktop still waits for `FINISHED`. Mobile does not.
**Found:** 2026-10-07, updated 2026-10-18
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.29.1-35154657340.commit-e2bbcc9` (`dcl/package.json`)
**Client:** Decentraland mobile. Desktop shows the same rack. Desktop build and both client versions were not captured.

## Summary

Spawning a GLTF on mobile works. The ball, the countdown, the scene model, and these same pin files all load. The rack looked missing because each pin mesh is created at scale 0, and the scale-in ran only after `GltfContainerLoadingState` read as `LoadingState.FINISHED`. On mobile that read did not become `FINISHED`, so the mesh stayed at scale 0 for the whole replay. Desktop stores a value the read can see, so the same tween ran.

The scale-in is there so the tween does not start before the mesh has loaded. That is the right sequence, and desktop still does it. Mobile does not report the state the sequence needs. Waiting longer, polling, or subscribing to `onChange` does not make the pins appear. The scene therefore skips the wait on mobile and starts the scale-in at spawn. A tween that begins before the mesh is resident is the lesser failure. An empty deck is not.

This is the same split as the rest of this project. The jump button hide and emoji in a `Label` already fail on mobile and work on desktop. The time spent here was not spent making the bowling better. It was spent finding out, again, that a documented client signal does not exist on the phone.

## Steps

1. Open the scene on the Decentraland mobile client.
2. Start a game and bowl. Watch the pin deck during the replay.
3. Repeat the same roll on the desktop client.

## Expected

After `GltfContainer.create`, `GltfContainerLoadingState` is readable as `LoadingState.FINISHED` on mobile, including a model that client has already loaded. The scene can then scale the pin up from 0. Desktop already does this. Mobile should do the same thing, so the scene can use one path.

## Workaround

`LaneVisuals.schedulePinIntro` (`dcl/src/client/laneVisuals.ts`):

- Desktop calls `whenGltfContainerFinished`, then runs `Tween.setScale` to `1.5` and `Tween.setMove` down onto the deck.
- Mobile runs those tweens from the spawn. `isMobile()` is only false until `getPlatform()` has reported, and a roll starts long after that.

`GltfContainer.create` is the same call on both. The mesh is not a different file on mobile.

## Suspected cause

The mobile client is not storing `LoadingState.FINISHED` where `GltfContainerLoadingState.getOrNull` can see it for these pin entities, or it never stores it. That was not traced inside the client. There is no log of that read on a phone and on desktop for the same roll.

## Fix that belongs on the platform

A pin spawn on mobile should make `GltfContainerLoadingState` readable as `LoadingState.FINISHED`, including a cached model. Then the scene can delete the mobile branch and wait on both clients.

## Where to send this

Mobile client: the Explorer build that reproduced it. Desktop Explorer issues are [decentraland/unity-explorer](https://github.com/decentraland/unity-explorer/issues).

SDK contract for the loading state: [decentraland/js-sdk-toolchain](https://github.com/decentraland/js-sdk-toolchain/issues).
