# WhatDo:
#
# Loops through the currently selected objects:
#	Toggles the visible bounding box

import bpy

#show the bounds of objects
for obj in bpy.context.selected_objects:
    #Disable bounds
    if obj.show_bounds: 
        obj.show_bounds = False
    else:
        obj.show_bounds = True
