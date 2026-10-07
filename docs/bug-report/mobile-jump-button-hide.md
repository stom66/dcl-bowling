# Mobile jump button stays visible after the first roll

**Status:** needs a platform fix, no local workaround
**Found:** 2026-10-07
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.29.1-35154657340.commit-e2bbcc9` (`dcl/package.json`)
**Client:** Decentraland mobile. Client version was not captured.

## Summary

While the local player is bowling, the scene hides the native mobile jump button with `TouchScreenControls` on `engine.RootEntity`. `IA_JUMP` is in `touchInputs` with `hide: true` (`dcl/src/client/touchscreenControls.ts`, `disableInputs`). That hide runs on `ON_MY_ROLL_START` and the buttons come back on `ON_MY_ROLL_END`.

On mobile the jump button is hidden for the first roll and stays visible on later rolls. The scene still sends the same hide list every roll. No retry, delete-and-recreate, or timer was left in the scene.

## Steps

1. Open the scene on the Decentraland mobile client.
2. Start a game and bowl the first roll. The jump button should be gone for that roll.
3. Bowl the next roll.

## Expected

Each `TouchScreenControls.createOrReplace` replaces the whole config. A later write that sets `IA_JUMP` to `hide: true` hides the jump button again, the same as the first write.

## Suspected cause

The mobile client applies the hide list the first time the component is created and then ignores a later update that hides `IA_JUMP` again, or something else in the client (for example a camera change) puts the default jump button back without reading the component again.

This was not confirmed in the client. A useful trace is the `TouchScreenControls` value on `engine.RootEntity` at each `ON_MY_ROLL_START`, next to whether the jump button is actually on screen.

## Where to send this

[decentraland/js-sdk-toolchain](https://github.com/decentraland/js-sdk-toolchain/issues) if `createOrReplace` is not producing a new component value.

The mobile Explorer that reproduced it if the component value is correct and the button still stays up. Desktop Explorer issues are [decentraland/unity-explorer](https://github.com/decentraland/unity-explorer/issues).
