# WhatDo:
#
# This scripts will deselect any objects that are within the specified bounds
# Select all bojects in the scene, run the script, and any that are still selected
# have bounding boxes that are outside the specified bounds


min_xyz = (0, 0, 0)
max_xyz = (64, 80, 80.99)


import bpy
from mathutils import Vector

for obj in bpy.context.selected_objects:
    bb_vertices = [Vector(v) for v in obj.bound_box]
    mat = obj.matrix_world
    world_bb_vertices = [mat @ v for v in bb_vertices]

    print(world_bb_vertices)

    # Check if any vertex of the bounding box is outside the specified bounds
    if any(
        v[0] < min_xyz[0] or v[0] > max_xyz[0] or
        v[1] < min_xyz[1] or v[1] > max_xyz[1] or
        v[2] < min_xyz[2] or v[2] > max_xyz[2]
        for v in world_bb_vertices
    ):
        obj.select_set(True)
    else:
        obj.select_set(False)
