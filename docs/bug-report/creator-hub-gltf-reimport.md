# Creator Hub does not re-import GLTF files rewritten on disk

**Status:** needs a platform fix, no local workaround
**Found:** 2026-10-19
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.29.1-35154657340.commit-e2bbcc9` (`dcl/package.json`)
**Client:** Creator Hub (editor). Explorer version not required for this report.

## Summary

Iterating on claw-machine GLTFs means overwriting the same `.gltf` / `.bin` paths under `dcl/assets/models/`. Creator Hub keeps showing the previously imported version of those assets. The scene and disk already have the new files; the editor does not pick up the write unless the author forces a manual re-import or renames the asset. That makes animation and mesh iteration slow and error-prone.

The project now places tagged cube placeholders in the composite and spawns the GLTFs from scene code so disk updates reach the running scene without relying on Creator Hub's import cache. That does not fix the editor. Overwritten models should refresh in Creator Hub the same way a first import does.

## Steps

1. Place a GLTF in the scene from `dcl/assets/models/` (for example a claw machine).
2. Export a new version of the same model over the same `.gltf` / `.bin` paths on disk.
3. Return to Creator Hub without renaming the files.
4. Observe the viewport / asset preview still shows the previous mesh or animation set.

## Expected

When a GLTF (and its companion `.bin` / textures) already registered in the project is rewritten on disk, Creator Hub detects the change and re-imports so the editor viewport and any placed instances show the new content without a rename or manual re-import step.

## Suspected cause

Creator Hub appears to cache imported GLTF content by path (or by a one-time import fingerprint) and does not invalidate that cache when the file contents change on disk. Not traced inside Creator Hub; confirmed only by authoring iteration on this scene.

## Fix that belongs on the platform

Watch project asset paths (or compare content hashes) and re-import when a registered GLTF / bin / texture changes. Placed instances and previews should update to the new import without renaming the asset.

## Where to send this

Creator Hub / editor tooling. If there is no dedicated Creator Hub tracker, start at [decentraland/js-sdk-toolchain](https://github.com/decentraland/js-sdk-toolchain/issues) and route to the Creator Hub maintainers from there.
