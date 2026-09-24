# Blender Bowling ball requirements

- One collection per design, named with the display name, for example Candy Swirl.
- Material name also uses the display name.
- Keep all source shader nodes inside a frame labelled Procedural.
- Put the export-ready shader inside a frame labelled Baked.
- The Material Output must connect only to the baked-texture Principled BSDF.
- Bake at 1024×1024.
- Only bake channels containing meaningful data.
- Do not create or connect blank/default maps.
- Keep uniform values directly on the Principled shader. For example, a constant roughness stays a scalar.
- Base color uses sRGB. Normal, roughness, and other data maps use Non-Color.

Naming examples:

- ball_candySwirl_baseColor.png
- ball_candySwirl_normal.png
- ball_candySwirl_roughness.png
- ball_candySwirl.gltf

For every exporter, copy the complete Candy Swirl exporter configuration and change only the output filename. The template currently uses:

- Separate glTF
- Texture directory: tex
- Active collection with nested contents
- Y-up
- Applied transforms
- Materials, UVs, and normals enabled
- Cameras, lights, animations, unused images, and unused textures disabled

Export directories:

- gltf models go in src/dcl/assets/models/unlocks
