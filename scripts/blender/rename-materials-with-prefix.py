import bpy

# Get a list of all the materials in the current blend file
materials = bpy.data.materials

# Loop through each material and check its name
for material in materials:
    # Check if the material name starts with "dcl." or "gltf." (ignoring capitalization)
    if not material.name.lower().startswith("dcl.") and not "gltf" in material.name.lower():
        # If it doesn't, prefix the material name with "gltf."
        material.name = f"gltf.{material.name}"
        print(f"Renamed material '{material.name}'")

    # Ensure the material has been assigned to a fake user
    material.use_fake_user = True
