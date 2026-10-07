---
name: platform-bugs
description: >-
  Stops platform workarounds. Use when a Decentraland, SDK, Explorer, or mobile
  client limitation is suspected, including GltfContainerLoadingState, component
  updates that apply once, renderer bugs, or any idea to remove or weaken an
  intentional feature because the platform does not behave as documented.
---

# Platform bugs

Anytime you come up against a bug that is a limitation of the platform, never work around it without explicit confirmation. Instead, you should generate a bug report and encourage that bug report to be submitted to the platform so that they can fix it properly.

A platform limitation is a defect or missing behavior in the Decentraland SDK, the Explorer, or the mobile client. It is not a mistake in this game's own logic.

## Do not work around it

Leave the intentional feature in place. Do not remove it, gate it, preload around it, retry it, or replace it with a lesser effect.

That includes:

- Dropping a scale-in, tween, or other authored effect because a load or callback looks unreliable
- Rewriting a component on a timer, or deleting and recreating it, because a later update seems ignored
- Swapping a documented API for a side path so the scene "still works" on one client

Say what the feature is supposed to do, what the platform failed to do, and that the feature is unchanged. Then stop. A workaround happens only after the user explicitly confirms that workaround.

## Bug report

Write the report under `docs/bug-report/`. Match the existing reports there: symptom, the scene code that depends on the platform behavior, SDK version from `dcl/package.json`, and what a client fix would change.

State what was observed and what is still only suspected. Do not present a guess as a traced client defect.

Encourage the user to submit it. The SDK issue tracker is [decentraland/js-sdk-toolchain](https://github.com/decentraland/js-sdk-toolchain/issues). Client and mobile-client issues go to the Explorer that reproduced them, currently [decentraland/unity-explorer](https://github.com/decentraland/unity-explorer/issues).

## Report shape

```markdown
# [Symptom in one line]

**Status:** needs a platform fix, no local workaround
**Found:** YYYY-MM-DD
**Scene:** Fastlane (`dcl/`)
**SDK:** [version from dcl/package.json]
**Client:** [client and platform, or "not captured"]

## Summary

[What the player sees. What the scene already does. What the platform should do.]

## Steps

1. [Reproduction]

## Expected

[Documented or intended platform behavior.]

## Suspected cause

[What is known from this scene. What was not confirmed.]
```
