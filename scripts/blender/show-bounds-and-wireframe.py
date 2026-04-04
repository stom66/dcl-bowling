# WhatDo:
#
# Loops through the currently selected objects:
#	Enables the visible bounding box
#	Disables rendering for the object
#	Sets the display_type to WIRE

import bpy

#show the bounds of objects
for obj in bpy.context.selected_objects:
	# Enable bounds
	obj.show_bounds = True

	# Hide from Render
	obj.hide_render = True

	# Set wireframe
	obj.display_type = 'WIRE'
