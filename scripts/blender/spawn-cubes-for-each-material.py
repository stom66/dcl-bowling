import bpy

# Define the prefix for the materials we want to use
prefix = "gltf.dev"

# Set up variables for positioning the cubes
row_length = 12  # number of cubes per row
cube_distance = 4  # distance between cubes
row_distance = 4  # distance between rows
current_row = 0  # current row we are placing cubes in
current_column = 0  # current column within the current row


# Get all materials that start with the prefix
materials = [mat for mat in bpy.data.materials if mat.name.startswith(prefix)]

# Loop through each material and create a cube with that material
for material in materials:
    # Create the cube
    bpy.ops.mesh.primitive_cube_add()
    cube = bpy.context.object

    # Set the material for the cube
    cube.data.materials.append(material)

    # Position the cube
    cube.location.x = current_column * cube_distance
    cube.location.y = current_row * row_distance
    cube.location.z = 0

    # Increment the column counter
    current_column += 1

    # If we have reached the end of the row, start a new one
    if current_column == row_length:
        current_row += 1
        current_column = 0
