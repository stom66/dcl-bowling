# WhatDo
#
# Cycles through all of the currently selected objects and toggles any "Copy Location" constraints

import bpy

# Loop through the selected objects
for obj in bpy.context.selected_objects:
    # Check if the object already has a "Copy Location" constraint
    if any(c.type == 'COPY_LOCATION' for c in obj.constraints):
        # Get the "Copy Location" constraint
        constraint = next(c for c in obj.constraints if c.type == 'COPY_LOCATION')

        # Toggle the constraint
        if not constraint.enabled:
            constraint.enabled = True
        else:
            constraint.enabled = False

    else:
        # If the object does not have a "Copy Location" constraint, skip it
        continue
