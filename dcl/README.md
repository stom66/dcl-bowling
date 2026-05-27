# Fastlane — Decentraland scene

This folder is the **deployable Decentraland scene** for *Fastlane*, the bowling game in this repository. It is not a generic template — all scene code, assets, and configuration that ship to Decentraland live here.

For the full project overview (architecture, physics, deployment, and how the rest of the repo fits together), see the [**main README**](../README.md) at the repository root.

## Why a subfolder?

The scene lives in `/dcl` rather than at the repo root so that non-deployable project files can sit in sibling folders (`/assets`, `/config`, `/docs`, `/scripts`, and so on) without relying on `.dclignore` to exclude them from deployment. When you deploy or import the scene, use **this folder** as the scene root.

## Preview locally

**First-time setup**

1. Launch the [Decentraland Creator Hub](https://decentraland.org/download/creator-hub/)
2. Open the **Scenes** tab
3. Choose **Import Scene**
4. Select this `dcl` folder (not the repository root)

**Normal use**

1. Open the scene from the Creator Hub home screen
2. Choose **Preview**

Alternatively, from this directory:

```
npm run start
```
