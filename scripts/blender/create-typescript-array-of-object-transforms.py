# WhatDo: 
#
# This script loops through all of the currently selected objects 
# and generates a Typescript array of their transform
# 
# See the text file "selected_objects_positions.log" for the output
#
#

import bpy
import os
import math

# Set the log file path
LOG_PATH = "selected_objects_positions.log"
if LOG_PATH not in bpy.data.texts:
    LOG_TXT = bpy.data.texts.new(LOG_PATH)
else:
    LOG_TXT = bpy.data.texts[LOG_PATH]
    LOG_TXT.clear()

# Get the selected objects
selected_objects = bpy.context.selected_objects

# Iterate over the selected objects
LOG_TXT.write(f"[\n")
for obj in selected_objects:
    # Get the object's location and round to three decimal places
    location = obj.location
    x = round(location.x, 3)
    y = round(location.y, 3)
    z = round(location.z, 3)

    # Get the object's rotation and convert to Euler angles
    rotation = obj.rotation_euler
    rx = round(math.degrees(rotation.x), 3)
    ry = round(math.degrees(rotation.y), 3)
    rz = round(math.degrees(rotation.z), 3)

    # Log the position and rotation in the Blender console and the log file
    LOG_TXT.write(f"    // {obj.name}\n")
    LOG_TXT.write(f"    new Transform({{\n")
    LOG_TXT.write(f"        position: new Vector3({x}, {z}, {y}),\n")
    LOG_TXT.write(f"        rotation: Quaternion.Euler({rx}, {rz}, {ry})\n")
    LOG_TXT.write(f"    }}),\n")


    # Add a blank line after each object
#     LOG_TXT.write("\n")

LOG_TXT.write(f"]\n")
    
# Print a message to the console
print("Object positions and rotations saved to log file:", LOG_PATH)
