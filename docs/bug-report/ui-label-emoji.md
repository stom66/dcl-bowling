# Emoji in a UI Label do not draw on mobile

**Status:** needs a platform fix, no local workaround
**Found:** 2026-10-14
**Scene:** Fastlane (`dcl/`)
**SDK:** `7.29.1-35154657340.commit-e2bbcc9` (`dcl/package.json`)
**Client:** not captured in this scene. Reported by the playtest-feedback module against the mobile explorer.

## Summary

The intro buttons in `dcl/src/playtest-feedback/lib/client/ui.tsx` put emoji in a `Label`: "NO, GO AWAY 👎" and "👍 I'LL ANSWER SOME QUESTIONS!". The scene asks the platform to draw those characters with the rest of the button text.

The playtest-feedback module, copied from [sdk7-test-scenes#108](https://github.com/decentraland/sdk7-test-scenes/pull/108), already records that the mobile explorer has no emoji font. Its rating faces are PNG images for that reason (`face-1.png` through `face-5.png`). The same gap is filed as [decentraland/godot-explorer#3044](https://github.com/decentraland/godot-explorer/issues/3044). This scene has not rechecked the buttons on a phone, and it does not replace the emoji with images.

## Steps

1. Open the scene on the mobile explorer.
2. Wait until the load fly-in ends, then open the feedback intro (or use the debug **Show intro** button in a local preview).
3. Look at the two buttons.

## Expected

A `Label` value that contains an emoji draws that emoji on desktop and on mobile, in the same font run as the surrounding text. These buttons use 👎 and 👍.

## Suspected cause

The mobile UI font has no emoji glyphs, so the explorer cannot draw characters such as 👎 and 👍 inside a `Label`. Not confirmed again on a device for these two buttons. Desktop drawing of the same labels was not captured.
