## `dcl-boilerplate-scene`

# Decentraland SDK7 Template

A basic Decentraland SDK7 Scene, setup with a generic folder structure and various utility scripts.

This repo is a template repository. See [using the template](/docs/USING_THE_TEMPLATE.md) for info on using it for a project.

**Warning**: here be dragons

---

## Contents

- [Resources](#resources)
- [Repository Overview](#repository-overview)
- [Getting Started](#getting-started)
  - [Pre-requisites](#pre-requisites)
  - [Using this template](#using-this-template)
  - [Preview the DCL scene](#preview-the-dcl-scene)

---

## Resources

- Google Sheet - [DCL scene limits calculator](https://docs.google.com/spreadsheets/d/1p4aEoGuguFRqeSSXUCC4DLK-HQ8f1cHM2VzXApo7MBk/edit?usp=sharing)
- Guide - [Asset pipeline overview](/docs/ASSETS.md)
- Guide - [Automatic deployment via GitHub Actions](/docs/GITHUB_AUTOMATIC_DEPLOYMENT.md)
- Guide - [Updating DCL dependencies](/docs/UPDATE_DCL_DEPENDENCIES.md)

## Repository Overview

This repository is split in the following folders:

- `/assets` - contains all assets and textures before being exported to `glTF`. This includes all `blend` and `FBX` files, as well as full-size source textures.
  - `/assets/models` - source files for each model in the scene, including full res textures
  - `/assets/fonts` - any fonts used in the scene and accompanying media
  - `/assets/tex` - asset agnostic textures used across the scene
- `/config` - useful info such as import/export settings, UVPackMaster Presets, shader templates
- `/dcl` - the DCL scene to be deployed. Exported glTF files are in `/dcl/models` along with a `tex` folder of optimised textures
- `/docs` - extra info on relevant topics, eg asset creation
- `/reference` - screenshots, previs, reference pictures used during asset creation
- `/scripts` - various bash/blender/bat utility scripts

---

# Getting Started

## Pre-requisites

- **Previewing the scene**:

  - You will require the [Decentraland Creator Hub](https://decentraland.org/download/creator-hub/) to launch and host the scene.
  - You will require the [Decentraland Client](https://decentraland.org/download/) to join and view the scene.

- **Utility scripts** (optional)

  - Various dev scripts require bash (linux) to run.
  - They have been tested on Ubuntu under WSL.
  - See [DEPENDENCIES](/docs/DEPENDENCIES.md) for the required packages.

## Using this template

- [Using the template](/docs/USING_THE_TEMPLATE.md)
- [Asset pipeline overview](/docs/ASSETS.md)
- [Automatic deployment via GitHub Actions](/docs/GITHUB_AUTOMATIC_DEPLOYMENT.md)
- [Updating DCL dependencies](/docs/UPDATE_DCL_DEPENDENCIES.md)

## Preview the DCL scene

#### First-time setup:

1. Launch the Decentraland Creator Hub
1. Select the "Scenes" tab
1. Select "Import Scene"
1. Navigate to the repository folder and select the `dcl` folder inside it.

#### Normal use:

1. Launch the Decentraland Creator Hub
1. Select the scene from the home screen
1. Choose "Preview" at the top
1. This will fire up a local test server, and launch the Decentraland Client

---

## Known Bugs

- Lack of caffeine causes occassional I/O errors.

---

## License

This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-nd/4.0/, see the license included in this repository, or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
