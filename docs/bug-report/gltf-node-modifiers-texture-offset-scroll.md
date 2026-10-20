# GltfNodeModifiers UV scroll stutters in focused fullscreen on a 60 Hz display

**Status:** needs a platform fix, no local workaround
**Found:** 2026-10-20
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.30.2-39321726891.commit-9926e63` (`dcl/package.json`)
**Client:** Unity Explorer (desktop). Exact Explorer build not captured.

## Summary

Neon strips scroll by updating `GltfNodeModifiers` texture `offset` every frame (`GltfSpawner.sys_scrollNeonGradient` in `dcl/src/client/gltfSpawner.ts`), on a dedicated `neons-animated.gltf` with a whole-model override (`path: ''`).

The scroll is smooth in some client display states and badly stepped in others. Scene logic is unchanged across those states. Transform tweens (e.g. skybox) still look fine when the neon UVs stutter.

## Reproduction matrix (observed)

| Client state | Display | Result |
|---|---|---|
| Windowed, focused | secondary 60 Hz | smooth |
| Fullscreen, focused | secondary 60 Hz | stepped / broken |
| Fullscreen, unfocused (alt-tab to another monitor) | secondary 60 Hz | smooth |
| Fullscreen, focused | primary 144 Hz | smooth (does not reproduce) |

So it is not “fullscreen always,” and not “60 Hz always.” It is **focused fullscreen on the 60 Hz monitor**.

## Steps

1. Put Unity Explorer on a 60 Hz secondary monitor.
2. Load the Fastlane scene and watch the neon marquee.
3. Confirm smooth scroll in windowed mode.
4. Switch to fullscreen while keeping focus on Explorer → scroll stutters.
5. Alt-tab away (Explorer stays fullscreen on the 60 Hz monitor, unfocused) → scroll becomes smooth again.
6. Repeat focused fullscreen on a 144 Hz primary monitor → scroll stays smooth.

## Expected

Per-frame `GltfNodeModifiers` texture offset puts should apply at a steady visual rate in focused fullscreen on 60 Hz, the same as windowed or unfocused fullscreen.

## Suspected cause

Explorer frame pacing / present / focus path on a 60 Hz display when the window is focused in fullscreen. Not confirmed inside the client. Scene still advances `neonOffsetX` with `dt` every system tick; the failure is visual apply rate under that display mode.

## Fix that belongs on the platform

Present and apply scene component updates (at least `GltfNodeModifiers` material/offset puts) consistently in focused fullscreen on 60 Hz, matching windowed and unfocused-fullscreen behavior.

## Where to send this

Client: [decentraland/unity-explorer](https://github.com/decentraland/unity-explorer/issues)
